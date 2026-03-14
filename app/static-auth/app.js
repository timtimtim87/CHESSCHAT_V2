const config = window.__CHESSCHAT_AUTH_CONFIG__ || {};
const appEl = document.getElementById("app");

const route = window.location.pathname;
const state = {
  error: "",
  success: ""
};

function isProdHostname(hostname) {
  return hostname === "chess-chat.com" || hostname.endsWith(".chess-chat.com");
}

function cookieDomain() {
  return isProdHostname(window.location.hostname) ? ".chess-chat.com" : null;
}

function setCookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];

  if (window.location.protocol === "https:") {
    parts.push("Secure");
  }

  const domain = cookieDomain();
  if (domain) {
    parts.push(`Domain=${domain}`);
  }

  document.cookie = parts.join("; ");
}

function getCookie(name) {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
}

function clearCookie(name) {
  setCookie(name, "", 0);
}

function setError(message) {
  state.error = message;
  render();
}

function setSuccess(message) {
  state.success = message;
  render();
}

function normalizeRoomCode(value) {
  return String(value || "").trim().toUpperCase();
}

function roomCodeValid(value) {
  return /^[A-Z0-9]{5}$/.test(value);
}

function savePendingRoom(roomCode) {
  setCookie(
    config.pendingRoomCookieName,
    roomCode,
    Number(config.pendingRoomMaxAgeSeconds || 600)
  );
}

function setSession(tokens) {
  const payload = {
    access_token: tokens.access_token,
    id_token: tokens.id_token,
    expires_in: tokens.expires_in,
    saved_at: Date.now()
  };

  setCookie(
    config.sessionCookieName,
    JSON.stringify(payload),
    Number(config.sessionMaxAgeSeconds || 3600)
  );

  // Store refresh token separately to keep cc_session well under the 4 KB
  // browser cookie limit (access + id JWTs alone can approach that limit).
  if (tokens.refresh_token) {
    setCookie(
      config.refreshCookieName || "cc_refresh",
      tokens.refresh_token,
      30 * 24 * 3600 // 30 days — matches Cognito refresh_token validity
    );
  }
}

function redirectToApp() {
  window.location.assign(config.appHost || "https://app.chess-chat.com");
}

function hostedUiAuthorizeUrl({ screenHint = null, forceGoogle = false } = {}) {
  const redirectUri = `${window.location.origin}/auth/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: "openid email profile"
  });

  if (screenHint) {
    params.set("screen_hint", screenHint);
  }

  if (forceGoogle) {
    params.set("identity_provider", "Google");
  }

  return `${config.hostedUiBaseUrl}/oauth2/authorize?${params.toString()}`;
}

async function cognitoRequest(target, payload) {
  const response = await fetch(`https://cognito-idp.${config.region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorType = body.__type || body.message || "CognitoRequestFailed";
    throw new Error(String(errorType).split("#").pop());
  }

  return body;
}

async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    redirect_uri: `${window.location.origin}/auth/callback`
  });

  const response = await fetch(`${config.hostedUiBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  if (!response.ok) {
    throw new Error("OAuthTokenExchangeFailed");
  }

  return response.json();
}

function nav() {
  return `
    <div class="nav">
      <a class="link-btn" href="/">Home</a>
      <a class="link-btn" href="/login">Login</a>
      <a class="link-btn" href="/signup">Sign Up</a>
      <a class="link-btn" href="/verify-email">Verify Email</a>
      <a class="link-btn" href="/forgot-password">Forgot Password</a>
      <a class="link-btn" href="/reset-password">Reset Password</a>
    </div>
  `;
}

function statusHtml() {
  const parts = [];
  if (state.error) parts.push(`<p class="error">${state.error}</p>`);
  if (state.success) parts.push(`<p class="success">${state.success}</p>`);
  return parts.join("\n");
}

function commonFooter() {
  return `<p class="footer">Privacy | Terms | Copyright ChessChat</p>`;
}

function renderLanding() {
  appEl.innerHTML = `
    <h1>ChessChat</h1>
    <p>Enter your room code, then sign in to continue.</p>
    ${statusHtml()}
    <form id="join-form">
      <label for="room-code">Room code</label>
      <input id="room-code" maxlength="5" placeholder="ABCDE" />
      <div class="actions">
        <button class="primary" type="submit">Join Room</button>
        <a class="link-btn" href="/login">Login</a>
        <a class="link-btn" href="/signup">Sign Up</a>
      </div>
    </form>
    ${nav()}
    ${commonFooter()}
  `;

  document.getElementById("join-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("room-code");
    const roomCode = normalizeRoomCode(input?.value || "");
    if (!roomCodeValid(roomCode)) {
      setError("Room code must be exactly 5 letters or numbers.");
      return;
    }

    savePendingRoom(roomCode);
    window.location.assign("/login");
  });
}

function renderLogin() {
  appEl.innerHTML = `
    <h2>Login</h2>
    ${statusHtml()}
    <form id="login-form">
      <label for="email">Email</label>
      <input id="email" type="email" required />
      <label for="password">Password</label>
      <input id="password" type="password" required />
      <div class="actions">
        <button class="primary" type="submit">Log In</button>
        <button class="google" type="button" id="google-login">Continue with Google</button>
      </div>
    </form>
    ${nav()}
    ${commonFooter()}
  `;

  document.getElementById("login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.error = "";
    state.success = "";

    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;

    try {
      const payload = await cognitoRequest("InitiateAuth", {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: config.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      });

      const tokens = {
        access_token: payload.AuthenticationResult?.AccessToken,
        id_token: payload.AuthenticationResult?.IdToken,
        refresh_token: payload.AuthenticationResult?.RefreshToken,
        expires_in: payload.AuthenticationResult?.ExpiresIn
      };

      setSession(tokens);
      redirectToApp();
    } catch (error) {
      setError(error.message || "LoginFailed");
    }
  });

  document.getElementById("google-login")?.addEventListener("click", () => {
    window.location.assign(hostedUiAuthorizeUrl({ forceGoogle: true }));
  });
}

function renderSignup() {
  appEl.innerHTML = `
    <h2>Sign Up</h2>
    ${statusHtml()}
    <form id="signup-form">
      <label for="email">Email</label>
      <input id="email" type="email" required />
      <label for="password">Password</label>
      <input id="password" type="password" required />
      <label for="username">Username</label>
      <input id="username" required autocomplete="username" />
      <small>3–24 characters: lowercase letters, numbers, dot, underscore, or hyphen</small>
      <div class="actions">
        <button class="primary" type="submit">Create Account</button>
        <button class="google" type="button" id="google-signup">Continue with Google</button>
      </div>
    </form>
    ${nav()}
    ${commonFooter()}
  `;

  document.getElementById("signup-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.error = "";
    state.success = "";

    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;
    const username = document.getElementById("username")?.value?.trim();

    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      setError("Username must be 3–24 characters: lowercase letters, numbers, dot, underscore, or hyphen.");
      return;
    }

    try {
      await cognitoRequest("SignUp", {
        ClientId: config.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "preferred_username", Value: username }
        ]
      });
      setSuccess("Sign-up successful. Verify your email, then login.");
    } catch (error) {
      setError(error.message || "SignUpFailed");
    }
  });

  document.getElementById("google-signup")?.addEventListener("click", () => {
    window.location.assign(hostedUiAuthorizeUrl({ forceGoogle: true, screenHint: "signup" }));
  });
}

function renderVerifyEmail() {
  appEl.innerHTML = `
    <h2>Verify Email</h2>
    ${statusHtml()}
    <form id="verify-form">
      <label for="email">Email</label>
      <input id="email" type="email" required />
      <label for="code">Verification code</label>
      <input id="code" required />
      <div class="actions">
        <button class="primary" type="submit">Verify</button>
      </div>
    </form>
    ${nav()}
    ${commonFooter()}
  `;

  document.getElementById("verify-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.error = "";
    state.success = "";

    const email = document.getElementById("email")?.value?.trim();
    const code = document.getElementById("code")?.value?.trim();

    try {
      await cognitoRequest("ConfirmSignUp", {
        ClientId: config.clientId,
        Username: email,
        ConfirmationCode: code
      });
      setSuccess("Email verified. You can now login.");
    } catch (error) {
      setError(error.message || "VerifyFailed");
    }
  });
}

function renderForgotPassword() {
  appEl.innerHTML = `
    <h2>Forgot Password</h2>
    ${statusHtml()}
    <form id="forgot-form">
      <label for="email">Email</label>
      <input id="email" type="email" required />
      <div class="actions">
        <button class="primary" type="submit">Send Reset Code</button>
      </div>
    </form>
    ${nav()}
    ${commonFooter()}
  `;

  document.getElementById("forgot-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.error = "";
    state.success = "";

    const email = document.getElementById("email")?.value?.trim();

    try {
      await cognitoRequest("ForgotPassword", {
        ClientId: config.clientId,
        Username: email
      });
      setSuccess("Reset code sent. Open Reset Password.");
    } catch (error) {
      setError(error.message || "ForgotPasswordFailed");
    }
  });
}

function renderResetPassword() {
  appEl.innerHTML = `
    <h2>Reset Password</h2>
    ${statusHtml()}
    <form id="reset-form">
      <label for="email">Email</label>
      <input id="email" type="email" required />
      <label for="code">Reset code</label>
      <input id="code" required />
      <label for="new-password">New password</label>
      <input id="new-password" type="password" required />
      <div class="actions">
        <button class="primary" type="submit">Reset Password</button>
      </div>
    </form>
    ${nav()}
    ${commonFooter()}
  `;

  document.getElementById("reset-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.error = "";
    state.success = "";

    const email = document.getElementById("email")?.value?.trim();
    const code = document.getElementById("code")?.value?.trim();
    const password = document.getElementById("new-password")?.value;

    try {
      await cognitoRequest("ConfirmForgotPassword", {
        ClientId: config.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: password
      });
      setSuccess("Password reset complete. Continue to login.");
    } catch (error) {
      setError(error.message || "ResetPasswordFailed");
    }
  });
}

async function renderAuthCallback() {
  appEl.innerHTML = `<h2>Signing you in...</h2><p>Please wait.</p>`;

  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      throw new Error("MissingOAuthCode");
    }

    const tokens = await exchangeCodeForTokens(code);
    setSession(tokens);
    redirectToApp();
  } catch (error) {
    // Render the error directly instead of calling setError()/render() —
    // render() on this route would call renderAuthCallback() again, and auth
    // codes are single-use so every retry would immediately fail (infinite loop).
    state.error = error.message || "AuthCallbackFailed";
    appEl.innerHTML = `
      <h2>Sign-in Failed</h2>
      ${statusHtml()}
      <p><a href="/login">Return to login</a></p>
    `;
  }
}

function renderNotFound() {
  appEl.innerHTML = `
    <h2>Page Not Found</h2>
    <p>Use the links below.</p>
    ${nav()}
    ${commonFooter()}
  `;
}

function render() {
  if (!config.clientId || !config.region || !config.hostedUiBaseUrl) {
    appEl.innerHTML = `<h2>Auth config missing</h2><p class="error">Check /config.js deployment values.</p>`;
    return;
  }

  switch (route) {
    case "/":
      renderLanding();
      return;
    case "/login":
      renderLogin();
      return;
    case "/signup":
      renderSignup();
      return;
    case "/verify-email":
      renderVerifyEmail();
      return;
    case "/forgot-password":
      renderForgotPassword();
      return;
    case "/reset-password":
      renderResetPassword();
      return;
    case "/auth/callback":
      renderAuthCallback();
      return;
    default:
      renderNotFound();
  }
}

(function bootstrap() {
  // Ensure stale pending room cannot survive an explicit logout click from static app.
  if (window.location.pathname === "/" && window.location.search.includes("logout=1")) {
    clearCookie(config.sessionCookieName);
  }

  const pendingRoom = getCookie(config.pendingRoomCookieName);
  if (window.location.pathname === "/" && pendingRoom && roomCodeValid(pendingRoom)) {
    setSuccess(`Pending room ${pendingRoom} saved. Login to continue.`);
  }

  render();
})();
