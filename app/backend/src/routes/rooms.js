import { Router } from "express";
import { getOrCreatePairRoom, getUserByUsername, isValidUsername } from "../services/dynamodb.js";
import { sendHttpError } from "../utils/errors.js";

const router = Router();

router.get("/rooms/pair", async (req, res) => {
  const username = String(req.query.username || "")
    .trim()
    .toLowerCase();
  if (!isValidUsername(username)) {
    sendHttpError(res, 400, "INVALID_PAYLOAD", { message: "Invalid username format." });
    return;
  }
  try {
    const myUserId = req.auth.sub;
    const opponent = await getUserByUsername(username);
    if (!opponent) {
      sendHttpError(res, 404, "NOT_FOUND", { message: "Player not found." });
      return;
    }
    if (opponent.user_id === myUserId) {
      sendHttpError(res, 400, "INVALID_PAYLOAD", { message: "You can't challenge yourself." });
      return;
    }
    const roomCode = await getOrCreatePairRoom(myUserId, opponent.user_id);
    res.json({
      room_code: roomCode,
      opponent: {
        user_id: opponent.user_id,
        username: opponent.username,
        display_name: opponent.display_name
      }
    });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

export default router;
