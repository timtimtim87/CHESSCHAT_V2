const SESSION_KEY = "chesschat_ui_preview_session_v1";

const DEFAULT_FRIENDS = [
  { username: "knightrider_04", displayName: "KnightRider_04", elo: 1840, status: "Online", online: true },
  { username: "queengambit_x", displayName: "QueenGambit_X", elo: 2105, status: "Online", online: true },
  { username: "bishopblunder", displayName: "BishopBlunder", elo: 1420, status: "Offline", online: false }
];

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function initialState() {
  return {
    isAuthenticated: false,
    user: {
      username: "grandmaster_dev",
      displayName: "GrandmasterDev"
    },
    activeGame: null,
    pendingOutgoing: null,
    notifications: [
      {
        id: randomId(),
        type: "info",
        title: "Welcome to UI Preview",
        body: "This sandbox is local-only and backend independent.",
        read: false,
        createdAt: Date.now()
      }
    ],
    settings: {
      soundEnabled: true,
      showPresence: true,
      reducedMotion: false
    },
    friends: DEFAULT_FRIENDS
  };
}

export function loadPreviewSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return initialState();
    }
    const parsed = JSON.parse(raw);
    return {
      ...initialState(),
      ...parsed,
      settings: {
        ...initialState().settings,
        ...(parsed?.settings || {})
      },
      user: {
        ...initialState().user,
        ...(parsed?.user || {})
      },
      notifications: Array.isArray(parsed?.notifications) ? parsed.notifications : initialState().notifications,
      friends: Array.isArray(parsed?.friends) ? parsed.friends : DEFAULT_FRIENDS
    };
  } catch {
    return initialState();
  }
}

export function savePreviewSession(state) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

export function clearPreviewSession() {
  sessionStorage.removeItem(SESSION_KEY);
  return initialState();
}

export function createPreviewNotification(partial) {
  return {
    id: randomId(),
    type: partial.type || "info",
    title: partial.title || "Notification",
    body: partial.body || "",
    read: false,
    actions: partial.actions || [],
    metadata: partial.metadata || {},
    createdAt: Date.now()
  };
}

export function createPreviewGame(friendName) {
  return {
    roomCode: "PREV1",
    opponent: friendName,
    startedAt: Date.now(),
    turn: "white"
  };
}

