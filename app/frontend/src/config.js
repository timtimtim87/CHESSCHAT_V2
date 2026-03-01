const env = import.meta.env;

export const config = {
  appDomain: env.VITE_APP_DOMAIN || window.location.origin,
  cognito: {
    hostedUiBaseUrl: env.VITE_COGNITO_HOSTED_UI_BASE_URL || "",
    clientId: env.VITE_COGNITO_CLIENT_ID || "",
    redirectUri: env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/auth/callback`,
    logoutUri: env.VITE_COGNITO_LOGOUT_URI || `${window.location.origin}/`
  }
};

export async function loadPublicConfig() {
  const response = await fetch("/api/public-config");
  if (!response.ok) {
    throw new Error("Unable to load public config.");
  }
  return response.json();
}
