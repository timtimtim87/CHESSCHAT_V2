import "dotenv/config";

const required = [
  "PORT",
  "AWS_REGION",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_AUTH_TOKEN",
  "DYNAMODB_USERS_TABLE",
  "DYNAMODB_GAMES_TABLE",
  "COGNITO_USER_POOL_ID",
  "COGNITO_CLIENT_ID",
  "COGNITO_REGION",
  "CHIME_REGION",
  "APP_DOMAIN"
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

export const config = {
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV || "production",
  awsRegion: process.env.AWS_REGION,
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    authToken: process.env.REDIS_AUTH_TOKEN,
    tls: process.env.REDIS_TLS === "true"
  },
  dynamodb: {
    usersTable: process.env.DYNAMODB_USERS_TABLE,
    gamesTable: process.env.DYNAMODB_GAMES_TABLE
  },
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    region: process.env.COGNITO_REGION,
    hostedUiBaseUrl: process.env.COGNITO_HOSTED_UI_BASE_URL || ""
  },
  chime: {
    region: process.env.CHIME_REGION
  },
  app: {
    domain: process.env.APP_DOMAIN,
    roomTtlSeconds: Number(process.env.ROOM_TTL_SECONDS || 3600),
    gameDurationSeconds: Number(process.env.GAME_DURATION_SECONDS || 300),
    heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS || 30000)
  }
};
