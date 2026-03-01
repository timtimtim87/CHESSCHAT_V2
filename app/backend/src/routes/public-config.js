import { Router } from "express";
import { config } from "../config.js";

const router = Router();

router.get("/api/public-config", (_req, res) => {
  res.json({
    appDomain: config.app.domain,
    cognito: {
      hostedUiBaseUrl: config.cognito.hostedUiBaseUrl,
      clientId: config.cognito.clientId,
      redirectUri: `${config.app.domain}/auth/callback`,
      logoutUri: `${config.app.domain}/`
    }
  });
});

export default router;
