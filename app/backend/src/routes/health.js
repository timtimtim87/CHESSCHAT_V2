import { Router } from "express";
import { pingRedis } from "../services/redis.js";

const router = Router();

router.get("/healthz", async (_req, res) => {
  try {
    await pingRedis();
    res.status(200).json({ status: "ok", ts: Date.now() });
  } catch {
    res.status(503).json({ status: "degraded", ts: Date.now() });
  }
});

export default router;
