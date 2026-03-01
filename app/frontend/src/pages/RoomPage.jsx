import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChessBoardPanel from "../components/ChessBoardPanel";
import VideoPanel from "../components/VideoPanel";
import { useAuth } from "../context/AuthContext";
import { ChessChatSocket } from "../services/socket";

export default function RoomPage() {
  const { code } = useParams();
  const roomCode = useMemo(() => (code || "").toUpperCase(), [code]);
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [videoStatus, setVideoStatus] = useState("Waiting for second player...");
  const [game, setGame] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
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
            setVideoStatus("Video credentials ready. Camera wiring is next increment.");
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
        <VideoPanel status={videoStatus} />

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
