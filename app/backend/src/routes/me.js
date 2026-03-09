import { Router } from "express";
import { ensureUser, getUser, looksLikeOpaqueUsername, setUsername } from "../services/dynamodb.js";
import { sendHttpError } from "../utils/errors.js";

const router = Router();

router.get("/me", async (req, res) => {
  try {
    const userId = req.auth.sub;
    const email = req.auth.email || "";
    const cognitoUsername = req.auth["cognito:username"] || "";

    await ensureUser({
      userId,
      username: undefined,
      email,
      displayName: undefined
    });

    const user = await getUser(userId);
    const effectiveUser = user || {
      user_id: userId,
      username: null,
      display_name: null,
      email,
      wins: 0,
      losses: 0,
      draws: 0
    };
    const needsUsername =
      !effectiveUser.username || looksLikeOpaqueUsername(effectiveUser.username) || effectiveUser.username === cognitoUsername;
    res.json({ user: effectiveUser, needs_username: needsUsername });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.post("/profile", async (req, res) => {
  try {
    const userId = req.auth.sub;
    const requestedUsername = req.body?.username;
    const user = await getUser(userId);
    if (!user) {
      sendHttpError(res, 404, "INVALID_PAYLOAD", { message: "User profile not found." });
      return;
    }

    const currentUsername = looksLikeOpaqueUsername(user.username) ? user.username : null;
    const username = await setUsername(userId, requestedUsername, currentUsername);
    const updated = await getUser(userId);
    res.json({
      user: updated,
      username,
      needs_username: false
    });
  } catch (error) {
    if (error.code === "INVALID_USERNAME") {
      sendHttpError(res, 400, "INVALID_PAYLOAD", { message: error.message });
      return;
    }
    if (error.code === "USERNAME_TAKEN") {
      sendHttpError(res, 409, "INVALID_PAYLOAD", { message: error.message });
      return;
    }
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

export default router;
