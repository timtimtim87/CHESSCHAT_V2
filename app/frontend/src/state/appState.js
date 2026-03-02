export const initialAppState = {
  auth_state: {
    status: "unknown",
    userId: null
  },
  socket_state: {
    status: "idle",
    reconnectAttempt: 0,
    retryInMs: 0
  },
  room_state: {
    code: "",
    participants: [],
    status: "idle"
  },
  game_state: {
    active: false,
    game: null
  },
  media_state: {
    status: "idle",
    message: "Waiting for second player...",
    credentials: null,
    started: false,
    micMuted: false,
    cameraOn: false
  },
  blocking_error: null,
  toast_error: null
};

export function appStateReducer(state, action) {
  switch (action.type) {
    case "INIT_AUTH":
      return {
        ...state,
        auth_state: {
          status: action.isAuthenticated ? "authenticated" : "unauthenticated",
          userId: action.userId || null
        }
      };
    case "ROOM_INIT":
      return {
        ...state,
        room_state: {
          ...state.room_state,
          code: action.roomCode,
          status: "joining"
        }
      };
    case "SOCKET_STATE":
      return {
        ...state,
        socket_state: {
          status: action.status,
          reconnectAttempt: action.reconnectAttempt || 0,
          retryInMs: action.retryInMs || 0
        }
      };
    case "ROOM_JOINED":
      return {
        ...state,
        room_state: {
          ...state.room_state,
          participants: action.participants || [],
          status: "joined"
        }
      };
    case "VIDEO_READY":
      return {
        ...state,
        media_state: {
          ...state.media_state,
          status: "ready",
          message: "Video credentials ready. Click Join Media.",
          credentials: action.credentials
        }
      };
    case "MEDIA_CONNECTING":
      return {
        ...state,
        media_state: {
          ...state.media_state,
          status: "connecting",
          message: "Connecting media..."
        }
      };
    case "MEDIA_STARTED":
      return {
        ...state,
        media_state: {
          ...state.media_state,
          status: "connected",
          message: action.message || "Connected. Waiting for remote video...",
          started: true,
          micMuted: false,
          cameraOn: true
        }
      };
    case "MEDIA_STOPPED":
      return {
        ...state,
        media_state: {
          ...state.media_state,
          status: "idle",
          started: false,
          micMuted: false,
          cameraOn: false
        }
      };
    case "MEDIA_MIC_TOGGLED":
      return {
        ...state,
        media_state: {
          ...state.media_state,
          micMuted: action.micMuted
        }
      };
    case "MEDIA_CAMERA_TOGGLED":
      return {
        ...state,
        media_state: {
          ...state.media_state,
          cameraOn: action.cameraOn
        }
      };
    case "GAME_STARTED":
      return {
        ...state,
        game_state: {
          active: true,
          game: action.game
        }
      };
    case "MOVE_MADE":
      if (!state.game_state.game) {
        return state;
      }
      return {
        ...state,
        game_state: {
          ...state.game_state,
          game: {
            ...state.game_state.game,
            fen: action.fen,
            turn: action.turn,
            timeWhite: action.timeWhite,
            timeBlack: action.timeBlack
          }
        }
      };
    case "GAME_ENDED":
      return {
        ...state,
        game_state: {
          active: false,
          game: null
        }
      };
    case "SET_BLOCKING_ERROR":
      return {
        ...state,
        blocking_error: action.error
      };
    case "CLEAR_BLOCKING_ERROR":
      return {
        ...state,
        blocking_error: null
      };
    case "SET_TOAST_ERROR":
      return {
        ...state,
        toast_error: action.error
      };
    case "CLEAR_TOAST_ERROR":
      return {
        ...state,
        toast_error: null
      };
    default:
      return state;
  }
}
