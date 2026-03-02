import { useEffect, useMemo, useReducer, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChessBoardPanel from "../components/ChessBoardPanel";
import VideoPanel from "../components/VideoPanel";
import { useAuth } from "../context/AuthContext";
import { createMeetingSession, listDevices, startMedia, stopMedia } from "../services/chime";
import { ChessChatSocket } from "../services/socket";
import { appStateReducer, initialAppState } from "../state/appState";

function normalizeError(payload) {
  return {
    code: payload?.code || "INTERNAL_ERROR",
    message: payload?.message || "Unexpected error.",
    retryable: Boolean(payload?.retryable),
    context: payload?.context || null
  };
}

export default function RoomPage() {
  const { code } = useParams();
  const roomCode = useMemo(() => (code || "").toUpperCase(), [code]);
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(appStateReducer, {
    ...initialAppState,
    room_state: {
      ...initialAppState.room_state,
      code: roomCode
    }
  });

  const socketRef = useRef(null);
  const meetingSessionRef = useRef(null);
  const observerRef = useRef(null);
  const audioElementRef = useRef(null);
  const remoteTileIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  function stopMeetingSession() {
    const session = meetingSessionRef.current;
    if (!session) {
      return;
    }

    if (observerRef.current) {
      session.audioVideo.removeObserver(observerRef.current);
      observerRef.current = null;
    }
    stopMedia(session.audioVideo);
    session.audioVideo.unbindVideoElement(localVideoRef.current);
    session.audioVideo.unbindVideoElement(remoteVideoRef.current);
    remoteTileIdRef.current = null;
    meetingSessionRef.current = null;
    dispatch({ type: "MEDIA_STOPPED" });
  }

  useEffect(() => {
    if (state.toast_error) {
      const timer = setTimeout(() => {
        dispatch({ type: "CLEAR_TOAST_ERROR" });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [state.toast_error]);

  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.autoplay = true;

    dispatch({ type: "INIT_AUTH", isAuthenticated: Boolean(accessToken), userId: user?.sub });

    if (!accessToken) {
      navigate("/", { replace: true });
      return;
    }

    dispatch({ type: "ROOM_INIT", roomCode });

    const socket = new ChessChatSocket({
      token: accessToken,
      onStateChange: (socketState) => {
        dispatch({
          type: "SOCKET_STATE",
          status: socketState.status,
          reconnectAttempt: socketState.reconnectAttempt,
          retryInMs: socketState.retryInMs
        });
      },
      onOpen: () => {
        dispatch({ type: "CLEAR_BLOCKING_ERROR" });
        socket.send("join_room", { roomCode });
      },
      onClose: ({ willReconnect }) => {
        if (!willReconnect) {
          return;
        }
        dispatch({
          type: "SET_TOAST_ERROR",
          error: {
            code: "SOCKET_RECONNECTING",
            message: "Connection lost. Reconnecting...",
            retryable: true,
            context: { roomCode }
          }
        });
      },
      onMessage: (payload) => {
        switch (payload.type) {
          case "room_joined":
            dispatch({ type: "ROOM_JOINED", participants: payload.participants });
            break;
          case "video_ready":
            dispatch({
              type: "VIDEO_READY",
              credentials: {
                meetingData: payload.meetingData,
                attendeeData: payload.attendeeData
              }
            });
            dispatch({ type: "CLEAR_TOAST_ERROR" });
            break;
          case "game_started":
            dispatch({
              type: "GAME_STARTED",
              game: {
                gameId: payload.gameId,
                whitePlayerId: payload.whitePlayerId,
                blackPlayerId: payload.blackPlayerId,
                fen: payload.fen,
                turn: payload.turn,
                timeWhite: payload.timeWhite,
                timeBlack: payload.timeBlack
              }
            });
            dispatch({ type: "CLEAR_TOAST_ERROR" });
            break;
          case "move_made":
            dispatch({
              type: "MOVE_MADE",
              fen: payload.fen,
              turn: payload.turn,
              timeWhite: payload.timeWhite,
              timeBlack: payload.timeBlack
            });
            break;
          case "game_ended":
            dispatch({ type: "GAME_ENDED" });
            dispatch({
              type: "SET_TOAST_ERROR",
              error: {
                code: "GAME_ENDED",
                message: `Game ended: ${payload.result}`,
                retryable: false,
                context: { gameId: payload.gameId }
              }
            });
            break;
          case "error": {
            const normalized = normalizeError(payload);
            if (normalized.retryable) {
              dispatch({ type: "SET_TOAST_ERROR", error: normalized });
            } else {
              dispatch({ type: "SET_BLOCKING_ERROR", error: normalized });
            }
            break;
          }
          default:
            break;
        }
      }
    });

    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.send("leave_room", { roomCode });
      stopMeetingSession();
      socket.disconnect();
    };
  }, [accessToken, navigate, roomCode, user?.sub]);

  const game = state.game_state.game;
  const myColor = game
    ? game.whitePlayerId === user?.sub
      ? "white"
      : "black"
    : "white";

  const isMyTurn = game
    ? (game.turn === "white" && game.whitePlayerId === user?.sub) ||
      (game.turn === "black" && game.blackPlayerId === user?.sub)
    : false;

  function startGame() {
    socketRef.current?.send("start_game", { roomCode });
  }

  function resign() {
    socketRef.current?.send("resign", { roomCode });
  }

  function onMove(move) {
    socketRef.current?.send("make_move", { roomCode, move });
  }

  async function joinMedia() {
    const videoCredentials = state.media_state.credentials;
    if (!videoCredentials || meetingSessionRef.current) {
      return;
    }

    try {
      dispatch({ type: "CLEAR_BLOCKING_ERROR" });
      dispatch({ type: "MEDIA_CONNECTING" });

      const session = createMeetingSession({
        meetingData: videoCredentials.meetingData,
        attendeeData: videoCredentials.attendeeData
      });
      const audioVideo = session.audioVideo;
      meetingSessionRef.current = session;

      const observer = {
        videoTileDidUpdate: (tileState) => {
          if (!tileState.boundAttendeeId || !tileState.tileId) {
            return;
          }

          if (tileState.localTile) {
            if (localVideoRef.current) {
              audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
            }
            return;
          }

          const remoteTileId = remoteTileIdRef.current;
          if (!remoteTileId || remoteTileId === tileState.tileId) {
            remoteTileIdRef.current = tileState.tileId;
            if (remoteVideoRef.current) {
              audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
            }
            dispatch({ type: "MEDIA_STARTED", message: "Media connected." });
          }
        },
        videoTileWasRemoved: (tileId) => {
          if (remoteTileIdRef.current === tileId) {
            audioVideo.unbindVideoElement(remoteVideoRef.current);
            remoteTileIdRef.current = null;
            dispatch({ type: "MEDIA_STARTED", message: "Connected. Waiting for remote video..." });
          }
        },
        audioVideoDidStop: (sessionStatus) => {
          dispatch({
            type: "SET_BLOCKING_ERROR",
            error: {
              code: "MEDIA_STOPPED",
              message: `Media stopped: ${sessionStatus.statusCode()}`,
              retryable: true,
              context: null
            }
          });
        }
      };
      observerRef.current = observer;
      audioVideo.addObserver(observer);
      audioVideo.bindAudioElement(audioElementRef.current);

      const devices = await listDevices(audioVideo);
      const audioInputDeviceId = devices.audioInputs[0]?.deviceId;
      const videoInputDeviceId = devices.videoInputs[0]?.deviceId;

      if (!audioInputDeviceId || !videoInputDeviceId) {
        throw new Error("No camera/microphone device detected.");
      }

      await startMedia(audioVideo, { audioInputDeviceId, videoInputDeviceId });
      dispatch({ type: "MEDIA_STARTED", message: "Connected. Waiting for remote video..." });
    } catch (error) {
      stopMeetingSession();
      dispatch({
        type: "SET_BLOCKING_ERROR",
        error: {
          code: "MEDIA_START_FAILED",
          message: error.message || "Unable to start media.",
          retryable: true,
          context: { roomCode }
        }
      });
    }
  }

  function toggleMic() {
    const session = meetingSessionRef.current;
    if (!session) {
      return;
    }
    if (state.media_state.micMuted) {
      session.audioVideo.realtimeUnmuteLocalAudio();
      dispatch({ type: "MEDIA_MIC_TOGGLED", micMuted: false });
      return;
    }
    session.audioVideo.realtimeMuteLocalAudio();
    dispatch({ type: "MEDIA_MIC_TOGGLED", micMuted: true });
  }

  function toggleCamera() {
    const session = meetingSessionRef.current;
    if (!session) {
      return;
    }
    if (state.media_state.cameraOn) {
      session.audioVideo.stopLocalVideoTile();
      dispatch({ type: "MEDIA_CAMERA_TOGGLED", cameraOn: false });
      return;
    }
    session.audioVideo.startLocalVideoTile();
    dispatch({ type: "MEDIA_CAMERA_TOGGLED", cameraOn: true });
  }

  const socketSubtitle =
    state.socket_state.status === "reconnecting"
      ? `Reconnecting (attempt ${state.socket_state.reconnectAttempt})...`
      : `Socket: ${state.socket_state.status}`;

  return (
    <main className="room-shell">
      <header className="top-row">
        <div>
          <h1>Room {roomCode}</h1>
          <p>Players: {state.room_state.participants.join(", ") || "waiting"}</p>
          <p className="socket-status">{socketSubtitle}</p>
        </div>
        <button onClick={() => navigate("/lobby")}>Back to Lobby</button>
      </header>

      {state.blocking_error ? (
        <section className="error-banner" role="alert">
          <strong>{state.blocking_error.code}</strong>
          <span>{state.blocking_error.message}</span>
          <button onClick={() => dispatch({ type: "CLEAR_BLOCKING_ERROR" })}>Dismiss</button>
        </section>
      ) : null}

      {state.toast_error ? (
        <section className="error-toast" role="status">
          <span>{state.toast_error.message}</span>
        </section>
      ) : null}

      <section className="room-layout">
        <VideoPanel
          status={state.media_state.message}
          mediaStarted={state.media_state.started}
          onJoinMedia={joinMedia}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          isMicMuted={state.media_state.micMuted}
          isCameraOn={state.media_state.cameraOn}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          error={state.blocking_error?.code?.startsWith("MEDIA") ? state.blocking_error.message : ""}
        />

        <section className="game-panel">
          <div className="controls">
            <button className="primary" onClick={startGame} disabled={Boolean(game)}>
              Start Game
            </button>
            <button onClick={resign} disabled={!game}>
              Resign
            </button>
          </div>

          <p>
            {game
              ? `Turn: ${game.turn} | White ${Math.floor(game.timeWhite)}s | Black ${Math.floor(game.timeBlack)}s`
              : "No active game"}
          </p>

          <ChessBoardPanel
            fen={game?.fen || "start"}
            myColor={myColor}
            isMyTurn={isMyTurn}
            onMove={onMove}
          />
        </section>
      </section>
    </main>
  );
}
