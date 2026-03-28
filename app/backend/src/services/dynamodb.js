import { randomBytes } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { config } from "../config.js";

const ddbClient = new DynamoDBClient({ region: config.awsRegion });
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});

export async function getUser(userId) {
  const result = await ddb.send(
    new GetCommand({
      TableName: config.dynamodb.usersTable,
      Key: { user_id: userId }
    })
  );
  return result.Item || null;
}

export async function ensureUser(user) {
  await ddb.send(
    new PutCommand({
      TableName: config.dynamodb.usersTable,
      Item: {
        user_id: user.userId,
        username: user.username,
        email: user.email,
        display_name: user.displayName,
        wins: 0,
        losses: 0,
        draws: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ConditionExpression: "attribute_not_exists(user_id)"
    })
  ).catch((err) => {
    if (err.name !== "ConditionalCheckFailedException") {
      throw err;
    }
  });
}

export function normalizeUsernameInput(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isValidUsername(value) {
  return /^[a-z0-9._-]{3,24}$/.test(value);
}

function usernameReservationKey(username) {
  return `username#${username}`;
}

export async function setUsername(userId, username, currentUsername = null) {
  const normalized = normalizeUsernameInput(username);
  if (!isValidUsername(normalized)) {
    const error = new Error("Username must be 3-24 chars: lowercase letters, numbers, dot, underscore, hyphen.");
    error.code = "INVALID_USERNAME";
    throw error;
  }

  const nowIso = new Date().toISOString();

  try {
    const transactItems = [
      {
        Put: {
          TableName: config.dynamodb.usersTable,
          Item: {
            user_id: usernameReservationKey(normalized),
            owner_user_id: userId,
            reserved_at: nowIso
          },
          ConditionExpression: "attribute_not_exists(user_id) OR owner_user_id = :owner",
          ExpressionAttributeValues: {
            ":owner": userId
          }
        }
      },
      {
        Update: {
          TableName: config.dynamodb.usersTable,
          Key: { user_id: userId },
          ConditionExpression:
            "attribute_exists(user_id) AND (attribute_not_exists(username) OR username = :username OR username = :currentUsername)",
          UpdateExpression: "SET username = :username, display_name = :displayName, updated_at = :updated",
          ExpressionAttributeValues: {
            ":username": normalized,
            ":displayName": normalized,
            ":updated": nowIso,
            ":currentUsername": currentUsername || "__none__"
          }
        }
      }
    ];

    if (currentUsername && currentUsername !== normalized) {
      transactItems.push({
        Delete: {
          TableName: config.dynamodb.usersTable,
          Key: { user_id: usernameReservationKey(currentUsername) },
          ConditionExpression: "owner_user_id = :owner",
          ExpressionAttributeValues: {
            ":owner": userId
          }
        }
      });
    }

    await ddb.send(
      new TransactWriteCommand({
        TransactItems: transactItems
      })
    );
  } catch (error) {
    if (error.name === "TransactionCanceledException") {
      const conflict = new Error("Username already taken.");
      conflict.code = "USERNAME_TAKEN";
      throw conflict;
    }
    throw error;
  }

  return normalized;
}

export function looksLikeOpaqueUsername(username) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(username || "")
  );
}

function statsDeltaForPlayer(playerId, winner) {
  if (winner === "draw") {
    return { wins: 0, losses: 0, draws: 1 };
  }
  return winner === playerId
    ? { wins: 1, losses: 0, draws: 0 }
    : { wins: 0, losses: 1, draws: 0 };
}

export function isDuplicateGameWriteError(error) {
  if (!error || error.name !== "TransactionCanceledException") {
    return false;
  }

  if (Array.isArray(error.CancellationReasons)) {
    return error.CancellationReasons.some((reason) => reason?.Code === "ConditionalCheckFailed");
  }

  return typeof error.message === "string" && error.message.includes("ConditionalCheckFailed");
}

export async function saveGameAndUpdateStats(gameRecord, whitePlayerId, blackPlayerId, winner) {
  const whiteDelta = statsDeltaForPlayer(whitePlayerId, winner);
  const blackDelta = statsDeltaForPlayer(blackPlayerId, winner);

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: config.dynamodb.gamesTable,
              Item: gameRecord,
              ConditionExpression: "attribute_not_exists(game_id) AND attribute_not_exists(ended_at)"
            }
          },
          {
            Update: {
              TableName: config.dynamodb.usersTable,
              Key: { user_id: whitePlayerId },
              UpdateExpression:
                "SET updated_at = :updated ADD wins :wins, losses :losses, draws :draws",
              ExpressionAttributeValues: {
                ":updated": new Date().toISOString(),
                ":wins": whiteDelta.wins,
                ":losses": whiteDelta.losses,
                ":draws": whiteDelta.draws
              }
            }
          },
          {
            Update: {
              TableName: config.dynamodb.usersTable,
              Key: { user_id: blackPlayerId },
              UpdateExpression:
                "SET updated_at = :updated ADD wins :wins, losses :losses, draws :draws",
              ExpressionAttributeValues: {
                ":updated": new Date().toISOString(),
                ":wins": blackDelta.wins,
                ":losses": blackDelta.losses,
                ":draws": blackDelta.draws
              }
            }
          }
        ]
      })
    );
    return { persisted: true };
  } catch (error) {
    if (isDuplicateGameWriteError(error)) {
      return { persisted: false, duplicate: true };
    }
    throw error;
  }
}

export async function deleteUser(userId) {
  const user = await getUser(userId);
  const items = [
    {
      Delete: {
        TableName: config.dynamodb.usersTable,
        Key: { user_id: userId }
      }
    }
  ];

  if (user?.username && !looksLikeOpaqueUsername(user.username)) {
    items.push({
      Delete: {
        TableName: config.dynamodb.usersTable,
        Key: { user_id: usernameReservationKey(user.username) },
        ConditionExpression: "owner_user_id = :owner",
        ExpressionAttributeValues: { ":owner": userId }
      }
    });
  }

  await ddb.send(new TransactWriteCommand({ TransactItems: items }));
}

export async function getUserByUsername(username) {
  const normalized = normalizeUsernameInput(username);
  if (!isValidUsername(normalized)) return null;
  const reservation = await ddb.send(
    new GetCommand({
      TableName: config.dynamodb.usersTable,
      Key: { user_id: `username#${normalized}` }
    })
  );
  if (!reservation.Item?.owner_user_id) return null;
  return getUser(reservation.Item.owner_user_id);
}

const PAIR_ROOM_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomId(prefix) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export async function getOrCreatePairRoom(userId1, userId2) {
  const pairId = [userId1, userId2].sort().join(":");
  const existing = await ddb.send(
    new GetCommand({
      TableName: config.dynamodb.pairRoomsTable,
      Key: { pair_id: pairId }
    })
  );
  if (existing.Item?.room_code) return existing.Item.room_code;

  const roomCode = Array.from(randomBytes(8))
    .map((b) => PAIR_ROOM_ALPHABET[b % 36])
    .join("");

  try {
    await ddb.send(
      new PutCommand({
        TableName: config.dynamodb.pairRoomsTable,
        Item: { pair_id: pairId, room_code: roomCode, created_at: new Date().toISOString() },
        ConditionExpression: "attribute_not_exists(pair_id)"
      })
    );
    return roomCode;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      const retry = await ddb.send(
        new GetCommand({
          TableName: config.dynamodb.pairRoomsTable,
          Key: { pair_id: pairId }
        })
      );
      return retry.Item?.room_code;
    }
    throw err;
  }
}

export async function getUserGames(userId) {
  const [white, black] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: config.dynamodb.gamesTable,
        IndexName: "white-player-index",
        KeyConditionExpression: "white_player_id = :user",
        ExpressionAttributeValues: { ":user": userId },
        Limit: 50,
        ScanIndexForward: false
      })
    ),
    ddb.send(
      new QueryCommand({
        TableName: config.dynamodb.gamesTable,
        IndexName: "black-player-index",
        KeyConditionExpression: "black_player_id = :user",
        ExpressionAttributeValues: { ":user": userId },
        Limit: 50,
        ScanIndexForward: false
      })
    )
  ]);

  return [...(white.Items || []), ...(black.Items || [])].sort(
    (a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime()
  );
}

export async function listFriends(userId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: config.dynamodb.friendshipsTable,
      KeyConditionExpression: "user_id = :user",
      ExpressionAttributeValues: {
        ":user": userId
      }
    })
  );
  return result.Items || [];
}

export async function listFriendRequests(userId) {
  const [received, sent] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: config.dynamodb.friendRequestsTable,
        KeyConditionExpression: "recipient_user_id = :user",
        ExpressionAttributeValues: { ":user": userId },
        ScanIndexForward: false
      })
    ),
    ddb.send(
      new QueryCommand({
        TableName: config.dynamodb.friendRequestsTable,
        IndexName: "sender-requests-index",
        KeyConditionExpression: "sender_user_id = :user",
        ExpressionAttributeValues: { ":user": userId },
        ScanIndexForward: false
      })
    )
  ]);

  return {
    received: (received.Items || []).filter((item) => item.status === "pending"),
    sent: (sent.Items || []).filter((item) => item.status === "pending")
  };
}

export async function createFriendRequest({
  senderUserId,
  senderUsername,
  recipientUserId,
  recipientUsername
}) {
  const requestId = randomId("fr");
  const now = new Date().toISOString();
  const item = {
    recipient_user_id: recipientUserId,
    request_id: requestId,
    sender_user_id: senderUserId,
    sender_username: senderUsername || null,
    recipient_username: recipientUsername || null,
    status: "pending",
    created_at: now,
    updated_at: now
  };
  await ddb.send(
    new PutCommand({
      TableName: config.dynamodb.friendRequestsTable,
      Item: item,
      ConditionExpression: "attribute_not_exists(request_id)"
    })
  );
  return item;
}

export async function respondToFriendRequest({ recipientUserId, requestId, action }) {
  const existing = await ddb.send(
    new GetCommand({
      TableName: config.dynamodb.friendRequestsTable,
      Key: {
        recipient_user_id: recipientUserId,
        request_id: requestId
      }
    })
  );
  const request = existing.Item;
  if (!request || request.status !== "pending") {
    return null;
  }

  const status = action === "accept" ? "accepted" : "declined";
  const now = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName: config.dynamodb.friendRequestsTable,
      Key: {
        recipient_user_id: recipientUserId,
        request_id: requestId
      },
      UpdateExpression: "SET #status = :status, updated_at = :updated",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updated": now
      }
    })
  );

  if (status === "accepted") {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: config.dynamodb.friendshipsTable,
              Item: {
                user_id: recipientUserId,
                friend_user_id: request.sender_user_id,
                friend_username: request.sender_username || null,
                created_at: now
              }
            }
          },
          {
            Put: {
              TableName: config.dynamodb.friendshipsTable,
              Item: {
                user_id: request.sender_user_id,
                friend_user_id: recipientUserId,
                friend_username: request.recipient_username || null,
                created_at: now
              }
            }
          }
        ]
      })
    );
  }

  return { ...request, status, updated_at: now };
}

export async function createChallenge({
  challengerUserId,
  challengerUsername,
  challengedUserId,
  challengedUsername,
  roomCode,
  settings
}) {
  const challengeId = randomId("ch");
  const now = new Date().toISOString();
  const challenge = {
    challenge_id: challengeId,
    challenger_user_id: challengerUserId,
    challenger_username: challengerUsername || null,
    challenged_user_id: challengedUserId,
    challenged_username: challengedUsername || null,
    room_code: roomCode,
    status: "pending",
    settings: settings || {},
    created_at: now,
    updated_at: now
  };
  await ddb.send(
    new PutCommand({
      TableName: config.dynamodb.challengesTable,
      Item: challenge,
      ConditionExpression: "attribute_not_exists(challenge_id)"
    })
  );
  return challenge;
}

export async function getChallengeById(challengeId) {
  const result = await ddb.send(
    new GetCommand({
      TableName: config.dynamodb.challengesTable,
      Key: { challenge_id: challengeId }
    })
  );
  return result.Item || null;
}

export async function listChallengesForUser(userId) {
  const [asChallenger, asChallenged] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: config.dynamodb.challengesTable,
        IndexName: "challenger-index",
        KeyConditionExpression: "challenger_user_id = :user",
        ExpressionAttributeValues: { ":user": userId },
        ScanIndexForward: false
      })
    ),
    ddb.send(
      new QueryCommand({
        TableName: config.dynamodb.challengesTable,
        IndexName: "challenged-index",
        KeyConditionExpression: "challenged_user_id = :user",
        ExpressionAttributeValues: { ":user": userId },
        ScanIndexForward: false
      })
    )
  ]);

  const byId = new Map();
  [...(asChallenger.Items || []), ...(asChallenged.Items || [])].forEach((item) => {
    byId.set(item.challenge_id, item);
  });
  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function acceptChallenge({ challengeId, userId }) {
  const challenge = await getChallengeById(challengeId);
  if (!challenge || challenge.status !== "pending") {
    return null;
  }
  if (challenge.challenged_user_id !== userId) {
    return { forbidden: true };
  }
  const updatedAt = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName: config.dynamodb.challengesTable,
      Key: { challenge_id: challengeId },
      UpdateExpression: "SET #status = :status, updated_at = :updated",
      ConditionExpression: "#status = :pending",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": "active",
        ":pending": "pending",
        ":updated": updatedAt
      }
    })
  );
  return {
    ...challenge,
    status: "active",
    updated_at: updatedAt
  };
}

export async function createNotification({ userId, type, title, message, entityId = null }) {
  const notification = {
    user_id: userId,
    notification_id: randomId("ntf"),
    type,
    title,
    message,
    entity_id: entityId,
    read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await ddb.send(
    new PutCommand({
      TableName: config.dynamodb.notificationsTable,
      Item: notification
    })
  );
  return notification;
}

export async function listNotifications(userId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: config.dynamodb.notificationsTable,
      KeyConditionExpression: "user_id = :user",
      ExpressionAttributeValues: { ":user": userId },
      ScanIndexForward: false,
      Limit: 50
    })
  );
  return result.Items || [];
}

export async function markNotificationRead({ userId, notificationId }) {
  await ddb.send(
    new UpdateCommand({
      TableName: config.dynamodb.notificationsTable,
      Key: {
        user_id: userId,
        notification_id: notificationId
      },
      UpdateExpression: "SET #read = :read, updated_at = :updated",
      ExpressionAttributeNames: {
        "#read": "read"
      },
      ExpressionAttributeValues: {
        ":read": true,
        ":updated": new Date().toISOString()
      }
    })
  );
}

export async function getChessComLink(userId) {
  const user = await getUser(userId);
  return {
    linked: Boolean(user?.chesscom_username),
    username: user?.chesscom_username || null,
    linkedAt: user?.chesscom_linked_at || null
  };
}

export async function linkChessComAccount({ userId, username, accessToken = null }) {
  const now = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName: config.dynamodb.usersTable,
      Key: { user_id: userId },
      UpdateExpression:
        "SET chesscom_username = :username, chesscom_linked_at = :linkedAt, chesscom_access_token = :token, updated_at = :updated",
      ExpressionAttributeValues: {
        ":username": String(username || "").trim(),
        ":linkedAt": now,
        ":token": accessToken,
        ":updated": now
      }
    })
  );
}

export async function unlinkChessComAccount(userId) {
  await ddb.send(
    new UpdateCommand({
      TableName: config.dynamodb.usersTable,
      Key: { user_id: userId },
      UpdateExpression:
        "REMOVE chesscom_username, chesscom_linked_at, chesscom_access_token SET updated_at = :updated",
      ExpressionAttributeValues: {
        ":updated": new Date().toISOString()
      }
    })
  );
}

export async function removeNotification({ userId, notificationId }) {
  await ddb.send(
    new DeleteCommand({
      TableName: config.dynamodb.notificationsTable,
      Key: {
        user_id: userId,
        notification_id: notificationId
      }
    })
  );
}
