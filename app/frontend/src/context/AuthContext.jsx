import { createContext, useContext, useMemo, useState } from "react";
import { config } from "../config";
import { parseJwt } from "../utils/auth";
import { deleteCookie, getCookie, setCookie } from "../utils/cookies";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "chesschat_access_token";
const ID_TOKEN_KEY = "chesschat_id_token";
const COGNITO_REGION = "us-east-1";
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const REFRESH_COOKIE_NAME = "cc_refresh";

function cookieDomain() {
  const host = window.location.hostname;
  if (host === "chess-chat.com" || host.endsWith(".chess-chat.com")) {
    return ".chess-chat.com";
  }
  return undefined;
}

function readSessionCookie() {
  const raw = getCookie(config.sessionCookieName);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isSessionTokenStale(session) {
  if (!session?.access_token || !session?.expires_in || !session?.saved_at) {
    return true;
  }
  return session.saved_at + Number(session.expires_in) * 1000 <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

async function refreshAccessToken({ refreshToken, clientId }) {
  const response = await fetch(`https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
    },
    body: JSON.stringify({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.__type || "TOKEN_REFRESH_FAILED");
  }

  return payload?.AuthenticationResult || null;
}

export function AuthProvider({ children }) {
  const [fallbackAccessToken, setFallbackAccessToken] = useState(
    () => sessionStorage.getItem(ACCESS_TOKEN_KEY) || ""
  );
  const [fallbackIdToken, setFallbackIdToken] = useState(
    () => sessionStorage.getItem(ID_TOKEN_KEY) || ""
  );

  const cookieSession = readSessionCookie();
  const accessToken = cookieSession?.access_token || fallbackAccessToken;
  const idToken = cookieSession?.id_token || fallbackIdToken;

  const user = useMemo(() => {
    if (!idToken) return null;
    const payload = parseJwt(idToken);
    if (!payload) return null;
    return {
      sub: payload.sub,
      email: payload.email,
      username: payload["cognito:username"] || payload.email || payload.sub
    };
  }, [idToken]);

  async function login() {
    globalThis.location.assign(`${config.authHost}/login`);
  }

  async function signup() {
    globalThis.location.assign(`${config.authHost}/signup`);
  }

  async function handleCallback() {
    throw new Error("Auth callback is handled on chess-chat.com");
  }

  async function getValidToken() {
    const session = readSessionCookie();
    if (!session?.access_token) {
      if (!fallbackAccessToken) {
        throw new Error("Missing access token");
      }
      return fallbackAccessToken;
    }

    if (!isSessionTokenStale(session)) {
      return session.access_token;
    }

    // refresh_token lives in its own cc_refresh cookie (kept separate to avoid
    // pushing cc_session over the 4 KB browser cookie limit). Fall back to the
    // embedded field for sessions written by older code.
    const refreshToken = getCookie(REFRESH_COOKIE_NAME) || session.refresh_token;
    if (!refreshToken) {
      return session.access_token;
    }

    const idTokenPayload = parseJwt(session.id_token || "");
    const clientId = idTokenPayload?.aud;
    if (!clientId) {
      return session.access_token;
    }

    const refreshed = await refreshAccessToken({
      refreshToken,
      clientId
    });

    if (!refreshed?.AccessToken) {
      throw new Error("Missing refreshed access token");
    }

    const refreshedSession = {
      access_token: refreshed.AccessToken,
      id_token: refreshed.IdToken || session.id_token,
      expires_in: refreshed.ExpiresIn || session.expires_in,
      saved_at: Date.now()
    };

    setCookie(config.sessionCookieName, JSON.stringify(refreshedSession), {
      domain: cookieDomain(),
      maxAgeSeconds: Number(refreshedSession.expires_in || 3600)
    });

    setFallbackAccessToken(refreshedSession.access_token || "");
    setFallbackIdToken(refreshedSession.id_token || "");
    sessionStorage.setItem(ACCESS_TOKEN_KEY, refreshedSession.access_token || "");
    sessionStorage.setItem(ID_TOKEN_KEY, refreshedSession.id_token || "");

    return refreshedSession.access_token;
  }

  function logout() {
    setFallbackAccessToken("");
    setFallbackIdToken("");
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ID_TOKEN_KEY);
    const domain = cookieDomain();
    deleteCookie(config.sessionCookieName, { domain });
    deleteCookie(REFRESH_COOKIE_NAME, { domain });
    deleteCookie(config.pendingRoomCookieName, { domain });
    globalThis.location.assign(`${config.authHost}/?logout=1`);
  }

  const value = {
    accessToken,
    idToken,
    user,
    isConfigReady: true,
    isAuthenticated: Boolean(accessToken),
    login,
    signup,
    logout,
    handleCallback,
    getValidToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
