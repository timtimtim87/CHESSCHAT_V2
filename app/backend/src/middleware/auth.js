import { CognitoJwtVerifier } from "aws-jwt-verify";
import { config } from "../config.js";

const verifier = CognitoJwtVerifier.create({
  userPoolId: config.cognito.userPoolId,
  clientId: config.cognito.clientId,
  tokenUse: "access"
});

export async function verifyAccessToken(token) {
  const payload = await verifier.verify(token);
  return payload;
}

export async function requireHttpAuth(req, res, next) {
  if (req.path === "/healthz" || req.path === "/api/public-config") {
    return next();
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    req.auth = await verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}
