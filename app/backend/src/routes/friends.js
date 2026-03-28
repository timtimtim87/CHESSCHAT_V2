import { Router } from "express";
import {
  createFriendRequest,
  createNotification,
  getUser,
  getUserByUsername,
  isValidUsername,
  listFriendRequests,
  listFriends,
  respondToFriendRequest
} from "../services/dynamodb.js";
import { sendHttpError } from "../utils/errors.js";

const router = Router();

router.get("/friends", async (req, res) => {
  try {
    const userId = req.auth.sub;
    const friends = await listFriends(userId);
    res.json({ friends });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.get("/friends/requests", async (req, res) => {
  try {
    const requests = await listFriendRequests(req.auth.sub);
    res.json(requests);
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.post("/friends/requests", async (req, res) => {
  const username = String(req.body?.username || "")
    .trim()
    .toLowerCase();
  if (!isValidUsername(username)) {
    sendHttpError(res, 400, "INVALID_PAYLOAD", { message: "Invalid username format." });
    return;
  }

  try {
    const sender = await getUser(req.auth.sub);
    const recipient = await getUserByUsername(username);
    if (!recipient) {
      sendHttpError(res, 404, "NOT_FOUND", { message: "Player not found." });
      return;
    }
    if (recipient.user_id === req.auth.sub) {
      sendHttpError(res, 400, "INVALID_PAYLOAD", { message: "You cannot add yourself." });
      return;
    }

    const request = await createFriendRequest({
      senderUserId: req.auth.sub,
      senderUsername: sender?.username || null,
      recipientUserId: recipient.user_id,
      recipientUsername: recipient.username || null
    });

    await createNotification({
      userId: recipient.user_id,
      type: "friend_request",
      title: "New friend request",
      message: `${sender?.display_name || sender?.username || "A player"} sent you a friend request.`,
      entityId: request.request_id
    });

    res.status(201).json({ request });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.post("/friends/requests/:requestId/respond", async (req, res) => {
  const action = String(req.body?.action || "").toLowerCase();
  if (!["accept", "decline"].includes(action)) {
    sendHttpError(res, 400, "INVALID_PAYLOAD", { message: "Action must be accept or decline." });
    return;
  }
  try {
    const result = await respondToFriendRequest({
      recipientUserId: req.auth.sub,
      requestId: req.params.requestId,
      action
    });
    if (!result) {
      sendHttpError(res, 404, "NOT_FOUND", { message: "Friend request not found or already resolved." });
      return;
    }
    res.json({ request: result });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

export default router;
