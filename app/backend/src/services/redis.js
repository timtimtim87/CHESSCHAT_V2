import Redis from "ioredis";
import { config } from "../config.js";

const ROOM_EXPIRY_ZSET = "room_expiries";

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

export async function getRoom(roomCode) {
  const raw = await redisClient.get(roomKey(roomCode));
  return raw ? JSON.parse(raw) : null;
}

export async function updateRoom(roomCode, room, ttlSeconds) {
  const ttl = ttlSeconds ?? config.app.roomTtlSeconds;
  await redisClient.set(roomKey(roomCode), JSON.stringify(room), "EX", ttl);
  await redisClient.zadd(ROOM_EXPIRY_ZSET, room.expiresAt, roomCode);
}

export async function deleteRoom(roomCode) {
  await redisClient.del(roomKey(roomCode));
  await redisClient.zrem(ROOM_EXPIRY_ZSET, roomCode);
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
