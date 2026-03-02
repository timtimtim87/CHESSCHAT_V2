import { randomUUID } from "node:crypto";
import { log } from "../utils/logger.js";

export function attachCorrelationId(req, res, next) {
  const incoming = req.headers["x-correlation-id"];
  const correlationId = typeof incoming === "string" && incoming.trim() ? incoming.trim() : randomUUID();
  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}

export function logHttpAccess(req, res, next) {
  const startedAt = Date.now();
  res.on("finish", () => {
    log("info", "http_request", {
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: Date.now() - startedAt
    });
  });
  next();
}
