import { Router } from "express";
import { getUserGames } from "../services/dynamodb.js";
import { sendHttpError } from "../utils/errors.js";

const router = Router();

router.get("/history", async (req, res) => {
  try {
    const games = await getUserGames(req.auth.sub);
    res.json({ games });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

export default router;
