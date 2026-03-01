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

function statsDeltaForPlayer(playerId, winner) {
  if (winner === "draw") {
    return { wins: 0, losses: 0, draws: 1 };
  }
  return winner === playerId
    ? { wins: 1, losses: 0, draws: 0 }
    : { wins: 0, losses: 1, draws: 0 };
}

export async function saveGameAndUpdateStats(gameRecord, whitePlayerId, blackPlayerId, winner) {
  const whiteDelta = statsDeltaForPlayer(whitePlayerId, winner);
  const blackDelta = statsDeltaForPlayer(blackPlayerId, winner);

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: config.dynamodb.gamesTable,
            Item: gameRecord
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
