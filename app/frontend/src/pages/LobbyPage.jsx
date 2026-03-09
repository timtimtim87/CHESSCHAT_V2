import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LAST_ROOM_CODE_KEY = "chesschat_last_room_code";

function normalizeHistoryGame(game, userId) {
  const isWhite = game.white_player_id === userId;
  const opponentId = isWhite ? game.black_player_id : game.white_player_id;
  const didWin = game.winner === userId;
  const didDraw = game.winner === "draw";

  return {
    id: game.game_id,
    opponentId: opponentId || "unknown",
    outcome: didDraw ? "Draw" : didWin ? "Win" : "Loss",
    result: game.result || "unknown",
    endedAt: game.ended_at
  };
}

export default function LobbyPage() {
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState("");
  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [needsUsername, setNeedsUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [lastRoomCode, setLastRoomCode] = useState(() => sessionStorage.getItem(LAST_ROOM_CODE_KEY) || "");
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const controller = new AbortController();
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    async function fetchProfile() {
      setIsLoadingProfile(true);
      setProfileError("");
      try {
        const response = await fetch("/api/me", { headers: authHeaders, signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message || "Unable to load profile.");
        }
        setProfile(payload.user || null);
        setNeedsUsername(Boolean(payload.needs_username));
        setUsernameDraft(payload.user?.username || "");
      } catch (error) {
        if (error.name !== "AbortError") {
          setProfileError(error.message || "Unable to load profile.");
        }
      } finally {
        setIsLoadingProfile(false);
      }
    }

    async function fetchHistory() {
      setIsLoadingHistory(true);
      setHistoryError("");
      try {
        const response = await fetch("/api/history", { headers: authHeaders, signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message || "Unable to load history.");
        }
        setGames(payload.games || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setHistoryError(error.message || "Unable to load history.");
        }
      } finally {
        setIsLoadingHistory(false);
      }
    }

    fetchProfile();
    fetchHistory();

    return () => controller.abort();
  }, [accessToken]);

  const recentGames = useMemo(() => {
    if (!user?.sub) {
      return [];
    }
    return games.slice(0, 8).map((game) => normalizeHistoryGame(game, user.sub));
  }, [games, user?.sub]);

  function onSubmit(event) {
    event.preventDefault();
    if (needsUsername) {
      setRoomCodeError("Set your username first.");
      return;
    }
    const normalized = roomCode.toUpperCase().trim();
    if (!/^[A-Z0-9]{5}$/.test(normalized)) {
      setRoomCodeError("Room code must be exactly 5 letters or numbers.");
      return;
    }
    setIsJoining(true);
    setRoomCodeError("");
    sessionStorage.setItem(LAST_ROOM_CODE_KEY, normalized);
    navigate(`/room/${normalized}`);
  }

  function resumeRoom() {
    if (needsUsername) {
      return;
    }
    if (!/^[A-Z0-9]{5}$/.test(lastRoomCode)) {
      return;
    }
    navigate(`/room/${lastRoomCode}`);
  }

  async function submitUsername(event) {
    event.preventDefault();
    const nextUsername = usernameDraft.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(nextUsername)) {
      setUsernameError("Username must be 3-24 chars: lowercase letters, numbers, dot, underscore, hyphen.");
      return;
    }
    setIsSavingUsername(true);
    setUsernameError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: nextUsername })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Unable to save username.");
      }
      setProfile(payload.user || profile);
      setNeedsUsername(false);
    } catch (error) {
      setUsernameError(error.message || "Unable to save username.");
    } finally {
      setIsSavingUsername(false);
    }
  }

  const isRoomCodeValid = /^[A-Z0-9]{5}$/.test(roomCode.trim());
  const profileName = profile?.display_name || profile?.username || "set-username";

  return (
    <main className="lobby-shell app-shell">
      <header className="lobby-top-row">
        <div>
          <h1>Lobby</h1>
          <p>Logged in as {profileName}</p>
        </div>
        <button className="button-ghost" onClick={logout}>Logout</button>
      </header>

      <section className="lobby-grid">
        <section className="lobby-card">
          <h2>Start / Join Room</h2>
          <p>Enter a 5-character room code and share it with your friend.</p>

          {needsUsername ? (
            <p className="inline-error">Create a unique username before joining a room.</p>
          ) : null}

          <form onSubmit={onSubmit} className="code-form">
            <input
              value={roomCode}
              onChange={(event) => {
                setRoomCode(event.target.value.toUpperCase());
                if (roomCodeError) {
                  setRoomCodeError("");
                }
              }}
              maxLength={5}
              placeholder="ABCDE"
              aria-label="Room code"
            />
            <button className="button-primary" type="submit" disabled={isJoining || !isRoomCodeValid || needsUsername}>
              {isJoining ? "Joining..." : "Start / Join"}
            </button>
          </form>
          {roomCodeError ? <p className="inline-error">{roomCodeError}</p> : null}

          {lastRoomCode ? (
            <div className="resume-card">
              <p>Last room: <strong>{lastRoomCode}</strong></p>
              <button className="button-secondary" onClick={resumeRoom} disabled={needsUsername}>
                Resume Last Room
              </button>
            </div>
          ) : null}
        </section>

        <section className="lobby-card">
          <h2>Profile</h2>
          {isLoadingProfile ? <p>Loading profile...</p> : null}
          {profileError ? <p className="inline-error">{profileError}</p> : null}
          {!isLoadingProfile && !profileError ? (
            <div className="profile-stats">
              <p><strong>Username:</strong> {profileName}</p>
              <p><strong>Wins:</strong> {profile?.wins ?? 0}</p>
              <p><strong>Losses:</strong> {profile?.losses ?? 0}</p>
              <p><strong>Draws:</strong> {profile?.draws ?? 0}</p>
            </div>
          ) : null}
          {!isLoadingProfile && !profileError && needsUsername ? (
            <form className="code-form" onSubmit={submitUsername}>
              <label htmlFor="username-input">Create Username</label>
              <input
                id="username-input"
                value={usernameDraft}
                onChange={(event) => {
                  setUsernameDraft(event.target.value.toLowerCase());
                  if (usernameError) {
                    setUsernameError("");
                  }
                }}
                maxLength={24}
                placeholder="tim_player"
                aria-label="Username"
              />
              <button className="button-primary" type="submit" disabled={isSavingUsername}>
                {isSavingUsername ? "Saving..." : "Save Username"}
              </button>
              {usernameError ? <p className="inline-error">{usernameError}</p> : null}
            </form>
          ) : null}
        </section>

        <section className="lobby-card history-card">
          <h2>Recent Matches</h2>
          {isLoadingHistory ? <p>Loading recent games...</p> : null}
          {historyError ? <p className="inline-error">{historyError}</p> : null}
          {!isLoadingHistory && !historyError && recentGames.length === 0 ? (
            <p>No completed games yet.</p>
          ) : null}
          {!isLoadingHistory && !historyError && recentGames.length > 0 ? (
            <ul className="history-list">
              {recentGames.map((game) => (
                <li key={`${game.id}-${game.endedAt}`} className="history-item">
                  <p><strong>{game.outcome}</strong> vs {game.opponentId}</p>
                  <p>{game.result} • {new Date(game.endedAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </section>
    </main>
  );
}
