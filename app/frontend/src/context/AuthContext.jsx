import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { config, loadPublicConfig } from "../config";
import { createPkceChallenge, parseJwt } from "../utils/auth";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "chesschat_access_token";
const ID_TOKEN_KEY = "chesschat_id_token";
const PKCE_VERIFIER_KEY = "chesschat_pkce_verifier";
const OAUTH_STATE_KEY = "chesschat_oauth_state";

async function exchangeCodeForTokens(code, cognito) {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) {
    throw new Error("Missing PKCE verifier");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cognito.clientId,
    code,
    redirect_uri: cognito.redirectUri,
    code_verifier: verifier
  });

  const response = await fetch(`${cognito.hostedUiBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error("Token exchange failed");
  }

  return response.json();
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(
    () => sessionStorage.getItem(ACCESS_TOKEN_KEY) || ""
  );
  const [idToken, setIdToken] = useState(() => sessionStorage.getItem(ID_TOKEN_KEY) || "");
  const [publicConfig, setPublicConfig] = useState(null);

  useEffect(() => {
    loadPublicConfig()
      .then((loaded) => setPublicConfig(loaded))
      .catch(() => setPublicConfig({ appDomain: config.appDomain, cognito: config.cognito }));
  }, []);

  const cognito = publicConfig?.cognito || config.cognito;

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
    if (!cognito.clientId || !cognito.hostedUiBaseUrl) {
      throw new Error("Cognito config not loaded.");
    }

    const { verifier, challenge } = await createPkceChallenge();
    const state = crypto.randomUUID();

    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(OAUTH_STATE_KEY, state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: cognito.clientId,
      redirect_uri: cognito.redirectUri,
      scope: "openid email profile",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256"
    });

    window.location.href = `${cognito.hostedUiBaseUrl}/oauth2/authorize?${params}`;
  }

  async function handleCallback(code, state) {
    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    if (!expectedState || expectedState !== state) {
      throw new Error("OAuth state mismatch");
    }

    const tokens = await exchangeCodeForTokens(code, cognito);
    setAccessToken(tokens.access_token || "");
    setIdToken(tokens.id_token || "");

    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token || "");
    sessionStorage.setItem(ID_TOKEN_KEY, tokens.id_token || "");
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
  }

  function logout() {
    setAccessToken("");
    setIdToken("");
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ID_TOKEN_KEY);

    const params = new URLSearchParams({
      client_id: cognito.clientId,
      logout_uri: cognito.logoutUri
    });
    window.location.href = `${cognito.hostedUiBaseUrl}/logout?${params}`;
  }

  const value = {
    accessToken,
    idToken,
    user,
    isConfigReady: Boolean(publicConfig),
    isAuthenticated: Boolean(accessToken),
    login,
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
