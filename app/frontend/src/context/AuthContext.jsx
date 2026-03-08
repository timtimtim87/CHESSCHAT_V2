import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { config, loadPublicConfig } from "../config";
import { createPkceChallenge, parseJwt } from "../utils/auth";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "chesschat_access_token";
const ID_TOKEN_KEY = "chesschat_id_token";
const PKCE_VERIFIER_KEY = "chesschat_pkce_verifier";
const OAUTH_STATE_KEY = "chesschat_oauth_state";

function authDebug(message, context = {}) {
  console.info("[auth-debug]", message, context);
}

async function exchangeCodeForTokens(code, cognito) {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) {
    throw new Error("Missing PKCE verifier");
  }

  if (!cognito.hostedUiBaseUrl) {
    throw new Error(
      "Cognito Hosted UI URL is missing. Refresh and try sign-in again, then check /api/public-config."
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cognito.clientId,
    code,
    redirect_uri: cognito.redirectUri,
    code_verifier: verifier
  });

  const tokenEndpoint = `${cognito.hostedUiBaseUrl}/oauth2/token`;
  let tokenEndpointHost = "";
  try {
    tokenEndpointHost = new URL(tokenEndpoint).host;
  } catch {
    tokenEndpointHost = "invalid";
  }
  authDebug("token_exchange_request", { tokenEndpointHost });

  const response = await fetch(tokenEndpoint, {
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

  async function resolveCognitoConfig() {
    if (publicConfig?.cognito?.hostedUiBaseUrl) {
      return publicConfig.cognito;
    }

    try {
      const loaded = await loadPublicConfig();
      setPublicConfig(loaded);
      if (loaded?.cognito?.hostedUiBaseUrl) {
        return loaded.cognito;
      }
    } catch {
      // Fallback handled below.
    }

    return config.cognito;
  }

  async function handleCallback(code, state) {
    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    authDebug("callback_received", {
      configReady: Boolean(publicConfig),
      stateMatches: Boolean(expectedState && expectedState === state)
    });

    if (!expectedState || expectedState !== state) {
      throw new Error("OAuth state mismatch");
    }

    const callbackCognito = await resolveCognitoConfig();
    if (!callbackCognito.hostedUiBaseUrl) {
      throw new Error(
        "Cognito config is not loaded yet. Refresh and try sign-in again, then verify /api/public-config."
      );
    }

    let tokenEndpointHost = "";
    try {
      tokenEndpointHost = new URL(`${callbackCognito.hostedUiBaseUrl}/oauth2/token`).host;
    } catch {
      tokenEndpointHost = "invalid";
    }
    authDebug("callback_token_target", {
      tokenEndpointHost,
      hasClientId: Boolean(callbackCognito.clientId)
    });

    const tokens = await exchangeCodeForTokens(code, callbackCognito);
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
