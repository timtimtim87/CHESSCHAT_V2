import { Router } from "express";
import { ensureUser, getUser } from "../services/dynamodb.js";

const router = Router();

router.get("/me", async (req, res) => {
  const userId = req.auth.sub;
  const email = req.auth.email || "";
  const username = req.auth["cognito:username"] || userId.slice(0, 12);

  await ensureUser({
    userId,
    username,
    email,
    displayName: username
  });

  const user = await getUser(userId);
  res.json({ user });
});

export default router;
