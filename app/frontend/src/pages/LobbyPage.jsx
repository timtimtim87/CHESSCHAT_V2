import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LAST_OPPONENT_KEY = "chesschat_last_opponent";

export default function LobbyPage() {
  const [opponentUsername, setOpponentUsername] = useState("");
  const [opponentError, setOpponentError] = useState("");
  const [profile, setProfile] = useState(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lastOpponent] = useState(() => sessionStorage.getItem(LAST_OPPONENT_KEY) || "");
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();

    async function fetchProfile() {
      try {
        const response = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || "Unable to load profile.");
        setProfile(payload.user || null);
        setNeedsUsername(Boolean(payload.needs_username));
        setUsernameDraft(payload.user?.username || "");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Profile fetch failed:", error.message);
        }
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [accessToken]);

  async function onSubmit(event) {
    event.preventDefault();
    if (needsUsername) {
      setOpponentError("Set your username first.");
      return;
    }
    const username = opponentUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      setOpponentError("Enter a valid username (3–24 chars: lowercase, numbers, dot, underscore, hyphen).");
      return;
    }
    setIsJoining(true);
    setOpponentError("");
    try {
      const res = await fetch(`/api/rooms/pair?username=${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const payload = await res.json();
      if (!res.ok) {
        setOpponentError(payload?.error?.message || "Could not start game.");
        return;
      }
      sessionStorage.setItem(LAST_OPPONENT_KEY, username);
      navigate(`/room/${payload.room_code}`);
    } catch {
      setOpponentError("Network error. Please try again.");
    } finally {
      setIsJoining(false);
    }
  }

  async function submitUsername(event) {
    event.preventDefault();
    const nextUsername = usernameDraft.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(nextUsername)) {
      setUsernameError("3–24 chars: lowercase letters, numbers, dot, underscore, hyphen.");
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
      if (!response.ok) throw new Error(payload?.error?.message || "Unable to save username.");
      setProfile(payload.user || profile);
      setNeedsUsername(false);
    } catch (error) {
      setUsernameError(error.message || "Unable to save username.");
    } finally {
      setIsSavingUsername(false);
    }
  }

  const profileName = profile?.display_name || profile?.username || "…";
  const isOpponentValid = /^[a-z0-9._-]{3,24}$/.test(opponentUsername.trim().toLowerCase());

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <nav className="app-nav">
        <span className="app-nav-logo">♟ ChessChat</span>
        <div className="app-nav-actions">
          <Link to="/profile" className="app-nav-username">{profileName}</Link>
          <button className="button-ghost" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="lobby-hero">
        {needsUsername ? (
          <>
            <p className="lobby-hero-label">Choose a username to start playing</p>
            <form className="lobby-username-form" onSubmit={submitUsername}>
              <input
                value={usernameDraft}
                onChange={(e) => {
                  setUsernameDraft(e.target.value.toLowerCase());
                  if (usernameError) setUsernameError("");
                }}
                maxLength={24}
                placeholder="tim_player"
                aria-label="Username"
              />
              <button className="button-primary" type="submit" disabled={isSavingUsername}>
                {isSavingUsername ? "Saving…" : "Save Username"}
              </button>
              {usernameError ? <p className="inline-error">{usernameError}</p> : null}
            </form>
          </>
        ) : (
          <>
            <p className="lobby-hero-label">Challenge a friend</p>
            <form className="lobby-hero-form" onSubmit={onSubmit}>
              <input
                value={opponentUsername}
                onChange={(e) => {
                  setOpponentUsername(e.target.value.toLowerCase());
                  if (opponentError) setOpponentError("");
                }}
                maxLength={24}
                placeholder="tim_5ew"
                aria-label="Opponent username"
              />
              <button className="button-primary" type="submit" disabled={isJoining || !isOpponentValid}>
                {isJoining ? "Starting…" : "Start Game"}
              </button>
            </form>
            {opponentError ? <p className="inline-error">{opponentError}</p> : null}
            {lastOpponent ? (
              <p className="lobby-resume-hint">
                Last game vs <strong>{lastOpponent}</strong> —{" "}
                <button
                  onClick={() => {
                    setOpponentUsername(lastOpponent);
                  }}
                >
                  Rematch
                </button>
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
