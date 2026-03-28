import { Router } from "express";
import {
  acceptChallenge,
  createChallenge,
  createNotification,
  getChallengeById,
  getOrCreatePairRoom,
  getUser,
  getUserByUsername,
  isValidUsername,
  listChallengesForUser
} from "../services/dynamodb.js";
import { sendHttpError } from "../utils/errors.js";

const router = Router();

router.get("/challenges", async (req, res) => {
  try {
    const all = await listChallengesForUser(req.auth.sub);
    const activeStatuses = new Set(["pending", "active", "accepted"]);
    res.json({ challenges: all.filter((item) => activeStatuses.has(item.status)) });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.get("/challenges/:challengeId", async (req, res) => {
  try {
    const challenge = await getChallengeById(req.params.challengeId);
    if (!challenge) {
      sendHttpError(res, 404, "NOT_FOUND", { message: "Challenge not found." });
      return;
    }
    res.json({ challenge });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.post("/challenges", async (req, res) => {
  const username = String(req.body?.username || "")
    .trim()
    .toLowerCase();
  if (!isValidUsername(username)) {
    sendHttpError(res, 400, "INVALID_PAYLOAD", { message: "Invalid username format." });
    return;
  }

  try {
    const challenger = await getUser(req.auth.sub);
    const challenged = await getUserByUsername(username);
    if (!challenged) {
      sendHttpError(res, 404, "NOT_FOUND", { message: "Player not found." });
      return;
    }
    if (challenged.user_id === req.auth.sub) {
      sendHttpError(res, 400, "INVALID_PAYLOAD", { message: "You cannot challenge yourself." });
      return;
    }

    const roomCode = await getOrCreatePairRoom(req.auth.sub, challenged.user_id);
    const challenge = await createChallenge({
      challengerUserId: req.auth.sub,
      challengerUsername: challenger?.username || null,
      challengedUserId: challenged.user_id,
      challengedUsername: challenged.username || null,
      roomCode,
      settings: req.body?.settings || {}
    });

    await createNotification({
      userId: challenged.user_id,
      type: "challenge_received",
      title: "New game challenge",
      message: `${challenger?.display_name || challenger?.username || "A player"} challenged you.`,
      entityId: challenge.challenge_id
    });

    res.status(201).json({ challenge });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.post("/challenges/:challengeId/accept", async (req, res) => {
  try {
    const accepted = await acceptChallenge({
      challengeId: req.params.challengeId,
      userId: req.auth.sub
    });
    if (!accepted) {
      sendHttpError(res, 404, "NOT_FOUND", { message: "Pending challenge not found." });
      return;
    }
    if (accepted.forbidden) {
      sendHttpError(res, 403, "UNAUTHORIZED", { message: "Only challenged player can accept." });
      return;
    }

    await createNotification({
      userId: accepted.challenger_user_id,
      type: "challenge_accepted",
      title: "Challenge accepted",
      message: `${accepted.challenged_username || "Your friend"} accepted your challenge.`,
      entityId: accepted.challenge_id
    });

    res.json({ challenge: accepted });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

export default router;
