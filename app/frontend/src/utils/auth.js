function encodeBase64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function parseJwt(token) {
  const [, payload] = token.split(".");
  if (!payload) return null;
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
}

export async function createPkceChallenge() {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = encodeBase64Url(verifierBytes);

  const challengeBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const challenge = encodeBase64Url(challengeBuffer);

  return { verifier, challenge };
}
