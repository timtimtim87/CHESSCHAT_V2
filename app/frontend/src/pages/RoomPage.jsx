import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChessBoardPanel from "../components/ChessBoardPanel";
import VideoPanel from "../components/VideoPanel";
import { useAuth } from "../context/AuthContext";
import { createMeetingSession, listDevices, startMedia, stopMedia } from "../services/chime";
import { ChessChatSocket } from "../services/socket";

export default function RoomPage() {
  const { code } = useParams();
  const roomCode = useMemo(() => (code || "").toUpperCase(), [code]);
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const meetingSessionRef = useRef(null);
  const observerRef = useRef(null);
  const audioElementRef = useRef(null);
  const remoteTileIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [participants, setParticipants] = useState([]);
  const [videoStatus, setVideoStatus] = useState("Waiting for second player...");
  const [videoCredentials, setVideoCredentials] = useState(null);
  const [mediaStarted, setMediaStarted] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [game, setGame] = useState(null);
  const [message, setMessage] = useState("");

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
    setMediaStarted(false);
    setIsMicMuted(false);
    setIsCameraOn(false);
  }

  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.autoplay = true;

    if (!accessToken) {
      navigate("/", { replace: true });
      return;
    }

    const socket = new ChessChatSocket({
      token: accessToken,
      onOpen: () => {
        socket.send("join_room", { roomCode });
      },
      onMessage: (payload) => {
        switch (payload.type) {
          case "room_joined":
            setParticipants(payload.participants || []);
            break;
          case "video_ready":
            setVideoCredentials({
              meetingData: payload.meetingData,
              attendeeData: payload.attendeeData
            });
            setVideoStatus("Video credentials ready. Click Join Media.");
            setMediaError("");
            break;
          case "game_started":
            setGame({
              gameId: payload.gameId,
              whitePlayerId: payload.whitePlayerId,
              blackPlayerId: payload.blackPlayerId,
              fen: payload.fen,
              turn: payload.turn,
              timeWhite: payload.timeWhite,
              timeBlack: payload.timeBlack
            });
            break;
          case "move_made":
            setGame((current) =>
              current
                ? {
                    ...current,
                    fen: payload.fen,
                    turn: payload.turn,
                    timeWhite: payload.timeWhite,
                    timeBlack: payload.timeBlack
                  }
                : current
            );
            break;
          case "game_ended":
            setMessage(`Game ended: ${payload.result}`);
            setGame(null);
            break;
          case "error":
            setMessage(payload.message || payload.code || "Unknown error");
            break;
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
  }, [accessToken, navigate, roomCode]);

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
    if (!videoCredentials || meetingSessionRef.current) {
      return;
    }

    try {
      setMediaError("");
      setVideoStatus("Connecting media...");

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
            setVideoStatus("Media connected.");
          }
        },
        videoTileWasRemoved: (tileId) => {
          if (remoteTileIdRef.current === tileId) {
            audioVideo.unbindVideoElement(remoteVideoRef.current);
            remoteTileIdRef.current = null;
            setVideoStatus("Connected. Waiting for remote video...");
          }
        },
        audioVideoDidStop: (sessionStatus) => {
          setMediaError(`Media stopped: ${sessionStatus.statusCode()}`);
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
      setMediaStarted(true);
      setIsCameraOn(true);
      setIsMicMuted(false);
      setVideoStatus("Connected. Waiting for remote video...");
    } catch (error) {
      stopMeetingSession();
      setMediaError(error.message || "Unable to start media.");
      setVideoStatus("Media unavailable.");
    }
  }

  function toggleMic() {
    const session = meetingSessionRef.current;
    if (!session) {
      return;
    }
    if (isMicMuted) {
      session.audioVideo.realtimeUnmuteLocalAudio();
      setIsMicMuted(false);
      return;
    }
    session.audioVideo.realtimeMuteLocalAudio();
    setIsMicMuted(true);
  }

  function toggleCamera() {
    const session = meetingSessionRef.current;
    if (!session) {
      return;
    }
    if (isCameraOn) {
      session.audioVideo.stopLocalVideoTile();
      setIsCameraOn(false);
      return;
    }
    session.audioVideo.startLocalVideoTile();
    setIsCameraOn(true);
  }

  return (
    <main className="room-shell">
      <header className="top-row">
        <div>
          <h1>Room {roomCode}</h1>
          <p>Players: {participants.join(", ") || "waiting"}</p>
        </div>
        <button onClick={() => navigate("/lobby")}>Back to Lobby</button>
      </header>

      {message ? <p className="notice">{message}</p> : null}

      <section className="room-layout">
        <VideoPanel
          status={videoStatus}
          mediaStarted={mediaStarted}
          onJoinMedia={joinMedia}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          isMicMuted={isMicMuted}
          isCameraOn={isCameraOn}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          error={mediaError}
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
