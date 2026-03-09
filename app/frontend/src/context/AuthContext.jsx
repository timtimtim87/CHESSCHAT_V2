import { createContext, useContext, useMemo, useState } from "react";
import { config } from "../config";
import { parseJwt } from "../utils/auth";
import { deleteCookie, getCookie } from "../utils/cookies";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "chesschat_access_token";
const ID_TOKEN_KEY = "chesschat_id_token";

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

  function logout() {
    setFallbackAccessToken("");
    setFallbackIdToken("");
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ID_TOKEN_KEY);
    deleteCookie(config.sessionCookieName, { domain: ".chess-chat.com" });
    deleteCookie(config.pendingRoomCookieName, { domain: ".chess-chat.com" });
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
    handleCallback
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
