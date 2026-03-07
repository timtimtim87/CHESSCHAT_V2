import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { connectRedis } from "./services/redis.js";
import { requireHttpAuth } from "./middleware/auth.js";
import { attachCorrelationId, logHttpAccess } from "./middleware/correlation.js";
import healthRouter from "./routes/health.js";
import meRouter from "./routes/me.js";
import historyRouter from "./routes/history.js";
import publicConfigRouter from "./routes/public-config.js";
import { installWebSocketServer } from "./websocket/handler.js";
import { log } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const app = express();
app.use(express.json());
app.use(attachCorrelationId);
app.use(logHttpAccess);
app.use(healthRouter);
app.use(publicConfigRouter);
app.use("/api", requireHttpAuth, meRouter, historyRouter);
app.use(express.static(publicDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

async function start() {
  await connectRedis();
  installWebSocketServer(wss);

  server.listen(config.port, () => {
    log("info", "server_started", {
      port: config.port,
      env: config.nodeEnv
    });
  });
}

start().catch((error) => {
  log("error", "startup_failed", { error: error.message });
  process.exit(1);
});
