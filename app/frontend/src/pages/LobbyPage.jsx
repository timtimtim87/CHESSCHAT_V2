import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LobbyPage() {
  const [roomCode, setRoomCode] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onSubmit(event) {
    event.preventDefault();
    const normalized = roomCode.toUpperCase().trim();
    if (!/^[A-Z0-9]{5}$/.test(normalized)) {
      return;
    }
    navigate(`/room/${normalized}`);
  }

  return (
    <main className="lobby-shell">
      <header className="top-row">
        <div>
          <h1>Lobby</h1>
          <p>Logged in as {user?.username || "unknown"}</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      <section className="lobby-card">
        <h2>Start / Join Room</h2>
        <p>Enter a 5-character room code and share it with your friend.</p>

        <form onSubmit={onSubmit} className="code-form">
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            maxLength={5}
            placeholder="ABCDE"
            aria-label="Room code"
          />
          <button className="primary" type="submit">
            Start / Join
          </button>
        </form>
      </section>
    </main>
  );
}
