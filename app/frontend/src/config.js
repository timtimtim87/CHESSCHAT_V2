const env = import.meta.env;

export const config = {
  appDomain: env.VITE_APP_DOMAIN || window.location.origin,
  authHost: env.VITE_AUTH_HOST || "https://chess-chat.com",
  sessionCookieName: env.VITE_SESSION_COOKIE_NAME || "cc_session",
  pendingRoomCookieName: env.VITE_PENDING_ROOM_COOKIE_NAME || "cc_pending_room"
};
