import Redis from "ioredis";
import { config } from "../config.js";

const ROOM_EXPIRY_ZSET = "room_expiries";
const ROOM_RECONNECT_DEADLINES_ZSET = "room_reconnect_deadlines";

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

export async function connectRedis() {
  if (redisClient.status !== "ready") {
    await redisClient.connect();
  }
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
