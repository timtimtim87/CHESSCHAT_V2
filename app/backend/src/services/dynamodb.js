import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
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
  return /^[a-z0-9_]{3,20}$/.test(value);
}

function usernameReservationKey(username) {
  return `username#${username}`;
}

export async function setUsername(userId, username, currentUsername = null) {
  const normalized = normalizeUsernameInput(username);
  if (!isValidUsername(normalized)) {
    const error = new Error("Username must be 3-20 chars: lowercase letters, numbers, underscore.");
    error.code = "INVALID_USERNAME";
    throw error;
  }

  const nowIso = new Date().toISOString();

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
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
        ]
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
