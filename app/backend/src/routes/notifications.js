import { Router } from "express";
import { listNotifications, markNotificationRead } from "../services/dynamodb.js";
import { sendHttpError } from "../utils/errors.js";

const router = Router();

router.get("/notifications", async (req, res) => {
  try {
    const notifications = await listNotifications(req.auth.sub);
    res.json({ notifications });
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

router.post("/notifications/:notificationId/read", async (req, res) => {
  try {
    await markNotificationRead({
      userId: req.auth.sub,
      notificationId: req.params.notificationId
    });
    res.status(204).end();
  } catch {
    sendHttpError(res, 500, "INTERNAL_ERROR");
  }
});

export default router;
