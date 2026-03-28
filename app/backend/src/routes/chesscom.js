import { Router } from "express";
import {
  getChessComLink,
  linkChessComAccount,
  unlinkChessComAccount
} from "../services/dynamodb.js";
import { sendHttpError } from "../utils/errors.js";

const router = Router();

router.get("/chesscom/link", async (req, res) => {
  try {
    const link = await getChessComLink(req.auth.sub);
    res.json(link);
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.post("/chesscom/link", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  if (!username) {
    sendHttpError(res, 400, "INVALID_PAYLOAD", { message: "username is required." });
    return;
  }
  try {
    await linkChessComAccount({
      userId: req.auth.sub,
      username,
      accessToken: req.body?.access_token || null
    });
    const link = await getChessComLink(req.auth.sub);
    res.json(link);
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.delete("/chesscom/link", async (req, res) => {
  try {
    await unlinkChessComAccount(req.auth.sub);
    res.status(204).end();
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

export default router;
