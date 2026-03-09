import Redis from "ioredis";
import { config } from "../config.js";

const ROOM_EXPIRY_ZSET = "room_expiries";
const ROOM_RECONNECT_DEADLINES_ZSET = "room_reconnect_deadlines";
const GAME_FINALIZATION_QUEUE = "game_finalization_queue";
const GAME_FINALIZATION_DEADLETTER = "game_finalization_deadletter";
const ROOM_CONSUMED_PREFIX = "room_consumed:";

export const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.authToken,
  tls: config.redis.tls ? {} : undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (attempt) => Math.min(attempt * 100, 2000)
});

function roomKey(roomCode) {
  return `room:${roomCode}`;
}

function wsKey(connectionId) {
  return `ws:${connectionId}`;
}

function roomConsumedKey(roomCode) {
  return `${ROOM_CONSUMED_PREFIX}${roomCode}`;
}

export async function connectRedis() {
  if (redisClient.status === "ready") {
    return;
  }

  if (redisClient.status === "wait") {
    await redisClient.connect();
    return;
  }

  if (redisClient.status === "connecting" || redisClient.status === "connect" || redisClient.status === "reconnecting") {
    await new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      const onEnd = () => {
        cleanup();
        reject(new Error("Redis connection ended before ready"));
      };
      const cleanup = () => {
        redisClient.off("ready", onReady);
        redisClient.off("error", onError);
        redisClient.off("end", onEnd);
      };

      redisClient.on("ready", onReady);
      redisClient.on("error", onError);
      redisClient.on("end", onEnd);
    });
    return;
  }

  await redisClient.connect();
}

export async function pingRedis() {
  return redisClient.ping();
}

export async function createRoom(roomCode, room, ttlSeconds) {
  const ttl = ttlSeconds ?? config.app.roomTtlSeconds;
  await redisClient.set(roomKey(roomCode), JSON.stringify(room), "EX", ttl);
  await redisClient.zadd(ROOM_EXPIRY_ZSET, room.expiresAt, roomCode);
}

export async function createRoomIfAbsent(roomCode, room, ttlSeconds) {
  const ttl = ttlSeconds ?? config.app.roomTtlSeconds;
  const created = await redisClient.set(roomKey(roomCode), JSON.stringify(room), "EX", ttl, "NX");
  if (created !== "OK") {
    return false;
  }

  await redisClient.zadd(ROOM_EXPIRY_ZSET, room.expiresAt, roomCode);
  return true;
}

export async function createRoomIfAvailable(roomCode, room, ttlSeconds) {
  const consumed = await redisClient.exists(roomConsumedKey(roomCode));
  if (consumed) {
    return { created: false, reason: "consumed" };
  }

  const created = await createRoomIfAbsent(roomCode, room, ttlSeconds);
  return { created, reason: created ? null : "exists" };
}

export async function getRoom(roomCode) {
  const raw = await redisClient.get(roomKey(roomCode));
  return raw ? JSON.parse(raw) : null;
}

export async function updateRoom(roomCode, room, ttlSeconds) {
  const ttl = ttlSeconds ?? config.app.roomTtlSeconds;
  await redisClient.set(roomKey(roomCode), JSON.stringify(room), "EX", ttl);
  await redisClient.zadd(ROOM_EXPIRY_ZSET, room.expiresAt, roomCode);
}

export async function mutateRoom(roomCode, mutator, options = {}) {
  const ttl = options.ttlSeconds ?? config.app.roomTtlSeconds;
  const maxRetries = options.maxRetries ?? 5;
  const key = roomKey(roomCode);

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    await redisClient.watch(key);

    const raw = await redisClient.get(key);
    if (!raw) {
      await redisClient.unwatch();
      return { ok: false, reason: "not_found" };
    }

    const room = JSON.parse(raw);
    const candidate = JSON.parse(raw);
    const outcome = await mutator(candidate);

    if (outcome?.error) {
      await redisClient.unwatch();
      return { ok: false, reason: "aborted", error: outcome.error };
    }

    const nextRoom = outcome?.room ?? outcome;
    const meta = outcome?.meta;
    if (!nextRoom) {
      await redisClient.unwatch();
      return { ok: false, reason: "aborted" };
    }
    if (!nextRoom.expiresAt) {
      nextRoom.expiresAt = room.expiresAt;
    }

    const multi = redisClient.multi();
    multi.set(key, JSON.stringify(nextRoom), "EX", ttl);
    multi.zadd(ROOM_EXPIRY_ZSET, nextRoom.expiresAt, roomCode);
    const execResult = await multi.exec();

    if (execResult) {
      return { ok: true, room: nextRoom, previousRoom: room, meta };
    }
  }

  return { ok: false, reason: "conflict" };
}

export async function deleteRoom(roomCode) {
  await redisClient.del(roomKey(roomCode));
  await redisClient.zrem(ROOM_EXPIRY_ZSET, roomCode);
  await redisClient.zrem(ROOM_RECONNECT_DEADLINES_ZSET, roomCode);
}

export async function markRoomCodeConsumed(roomCode, ttlSeconds = 30 * 24 * 3600) {
  await redisClient.set(roomConsumedKey(roomCode), "1", "EX", ttlSeconds);
}

export async function isRoomCodeConsumed(roomCode) {
  const exists = await redisClient.exists(roomConsumedKey(roomCode));
  return exists === 1;
}

export async function teardownRoomAndConsumeCode(roomCode, ttlSeconds = 30 * 24 * 3600) {
  const multi = redisClient.multi();
  multi.set(roomConsumedKey(roomCode), "1", "EX", ttlSeconds);
  multi.del(roomKey(roomCode));
  multi.zrem(ROOM_EXPIRY_ZSET, roomCode);
  multi.zrem(ROOM_RECONNECT_DEADLINES_ZSET, roomCode);
  await multi.exec();
}

export async function setConnection(connectionId, value, ttlSeconds) {
  const ttl = ttlSeconds ?? config.app.roomTtlSeconds;
  await redisClient.set(wsKey(connectionId), JSON.stringify(value), "EX", ttl);
}

export async function getConnection(connectionId) {
  const raw = await redisClient.get(wsKey(connectionId));
  return raw ? JSON.parse(raw) : null;
}

export async function deleteConnection(connectionId) {
  await redisClient.del(wsKey(connectionId));
}

export async function getExpiringRooms(untilTimestampMs) {
  return redisClient.zrangebyscore(ROOM_EXPIRY_ZSET, 0, untilTimestampMs);
}

export async function removeRoomFromExpiryIndex(roomCode) {
  await redisClient.zrem(ROOM_EXPIRY_ZSET, roomCode);
}

export async function setReconnectDeadline(roomCode, deadlineTimestampMs) {
  await redisClient.zadd(ROOM_RECONNECT_DEADLINES_ZSET, deadlineTimestampMs, roomCode);
}

export async function clearReconnectDeadline(roomCode) {
  await redisClient.zrem(ROOM_RECONNECT_DEADLINES_ZSET, roomCode);
}

export async function getExpiredReconnectDeadlines(untilTimestampMs) {
  return redisClient.zrangebyscore(ROOM_RECONNECT_DEADLINES_ZSET, 0, untilTimestampMs);
}

export async function enqueueGameFinalizationJob(job) {
  await redisClient.rpush(GAME_FINALIZATION_QUEUE, JSON.stringify(job));
}

export async function popGameFinalizationJob() {
  const raw = await redisClient.lpop(GAME_FINALIZATION_QUEUE);
  return raw ? JSON.parse(raw) : null;
}

export async function pushGameFinalizationDeadLetter(entry) {
  await redisClient.rpush(GAME_FINALIZATION_DEADLETTER, JSON.stringify(entry));
}
