import test from "node:test";
import assert from "node:assert/strict";

function seedEnv() {
  process.env.PORT = process.env.PORT || "8080";
  process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
  process.env.REDIS_HOST = process.env.REDIS_HOST || "localhost";
  process.env.REDIS_PORT = process.env.REDIS_PORT || "6379";
  process.env.REDIS_AUTH_TOKEN = process.env.REDIS_AUTH_TOKEN || "token";
  process.env.DYNAMODB_USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "users";
  process.env.DYNAMODB_GAMES_TABLE = process.env.DYNAMODB_GAMES_TABLE || "games";
  process.env.DYNAMODB_PAIR_ROOMS_TABLE = process.env.DYNAMODB_PAIR_ROOMS_TABLE || "pair-rooms";
  process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "us-east-1_123456789";
  process.env.COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || "client";
  process.env.COGNITO_REGION = process.env.COGNITO_REGION || "us-east-1";
  process.env.CHIME_REGION = process.env.CHIME_REGION || "us-east-1";
  process.env.APP_DOMAIN = process.env.APP_DOMAIN || "app.example.com";
}

async function loadFinalizationApi() {
  seedEnv();
  const mod = await import("../../src/websocket/handler.js");
  return {
    buildFinalizationJob: mod.buildFinalizationJob,
    enqueueFinalizationJob: mod.enqueueFinalizationJob,
    persistFinalizationJob: mod.persistFinalizationJob,
    processFinalizationJob: mod.processFinalizationJob
  };
}

function sampleJob() {
  return {
    gameId: "G-1",
    roomCode: "ABCDE",
    gameRecord: {
      game_id: "G-1",
      ended_at: "2026-03-02T00:00:00.000Z",
      room_code: "ABCDE"
    },
    whitePlayerId: "white-1",
    blackPlayerId: "black-1",
    winnerPlayerId: "white-1",
    queuedAt: Date.now()
  };
}

test("queue push on game_ended finalization job", async () => {
  const { buildFinalizationJob, enqueueFinalizationJob } = await loadFinalizationApi();
  const enqueued = [];

  const job = buildFinalizationJob({
    roomCode: "ABCDE",
    gameRecord: sampleJob().gameRecord,
    whitePlayerId: "white-1",
    blackPlayerId: "black-1",
    winnerPlayerId: "white-1"
  });

  await enqueueFinalizationJob(job, {
    enqueue: async (payload) => {
      enqueued.push(payload);
    },
    logFn: () => {}
  });

  assert.equal(enqueued.length, 1);
  assert.equal(enqueued[0].gameId, "G-1");
});

test("idempotent duplicate finalization is treated as success no-op", async () => {
  const { processFinalizationJob } = await loadFinalizationApi();
  let retried = 0;
  let failed = 0;
  let deadlettered = 0;
  let persistedCalls = 0;

  await processFinalizationJob(sampleJob(), {
    persist: async () => {
      persistedCalls += 1;
      return { persisted: false, duplicate: true };
    },
    emitRetried: async () => {
      retried += 1;
    },
    emitFailed: async () => {
      failed += 1;
    },
    emitError: async () => {},
    pushDeadLetter: async () => {
      deadlettered += 1;
    },
    waitFn: async () => {},
    logFn: () => {}
  });

  assert.equal(persistedCalls, 1);
  assert.equal(retried, 0);
  assert.equal(failed, 0);
  assert.equal(deadlettered, 0);
});

test("finalization retry then success behavior", async () => {
  const { processFinalizationJob } = await loadFinalizationApi();
  let attempts = 0;
  let retried = 0;
  const backoffs = [];

  await processFinalizationJob(sampleJob(), {
    persist: async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("transient_ddb_error");
      }
    },
    emitRetried: async () => {
      retried += 1;
    },
    emitFailed: async () => {},
    emitError: async () => {},
    pushDeadLetter: async () => {},
    waitFn: async (ms) => {
      backoffs.push(ms);
    },
    logFn: () => {}
  });

  assert.equal(attempts, 3);
  assert.equal(retried, 2);
  assert.deepEqual(backoffs, [250, 500]);
});

test("dead-letter after retry exhaustion", async () => {
  const { processFinalizationJob } = await loadFinalizationApi();
  let failed = 0;
  let appErrors = 0;
  let deadLetterPayload = null;

  await processFinalizationJob(sampleJob(), {
    persist: async () => {
      throw new Error("ddb_down");
    },
    emitRetried: async () => {},
    emitFailed: async () => {
      failed += 1;
    },
    emitError: async () => {
      appErrors += 1;
    },
    pushDeadLetter: async (payload) => {
      deadLetterPayload = payload;
    },
    waitFn: async () => {},
    logFn: () => {}
  });

  assert.equal(failed, 1);
  assert.equal(appErrors, 1);
  assert.equal(deadLetterPayload.gameId, "G-1");
  assert.equal(deadLetterPayload.attempts, 5);
});
