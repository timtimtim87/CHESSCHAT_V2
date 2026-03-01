import { Router } from "express";
import { getUserGames } from "../services/dynamodb.js";

const router = Router();

router.get("/history", async (req, res) => {
  const games = await getUserGames(req.auth.sub);
  res.json({ games });
});

export default router;
