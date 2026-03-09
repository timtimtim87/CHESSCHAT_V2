import { CognitoJwtVerifier } from "aws-jwt-verify";
import { config } from "../config.js";
import { sendHttpError } from "../utils/errors.js";

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
  if (req.path === "/healthz") {
    return next();
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    sendHttpError(res, 401, "UNAUTHORIZED");
    return;
  }

  try {
    req.auth = await verifyAccessToken(token);
    next();
  } catch {
    sendHttpError(res, 401, "UNAUTHORIZED");
  }
}
