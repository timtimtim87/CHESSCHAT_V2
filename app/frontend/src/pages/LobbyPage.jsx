import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LAST_ROOM_CODE_KEY = "chesschat_last_room_code";

export default function LobbyPage() {
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState("");
  const [profile, setProfile] = useState(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lastRoomCode] = useState(() => sessionStorage.getItem(LAST_ROOM_CODE_KEY) || "");
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
  const isRoomCodeValid = /^[A-Z0-9]{5}$/.test(roomCode.trim());

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
            <p className="lobby-hero-label">Enter or share a room code</p>
            <form className="lobby-hero-form" onSubmit={onSubmit}>
              <input
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  if (roomCodeError) setRoomCodeError("");
                }}
                maxLength={5}
                placeholder="ABCDE"
                aria-label="Room code"
              />
              <button className="button-primary" type="submit" disabled={isJoining || !isRoomCodeValid}>
                {isJoining ? "Joining…" : "Start / Join"}
              </button>
            </form>
            {roomCodeError ? <p className="inline-error">{roomCodeError}</p> : null}
            {lastRoomCode ? (
              <p className="lobby-resume-hint">
                Last room: <strong>{lastRoomCode}</strong> —{" "}
                <button onClick={() => navigate(`/room/${lastRoomCode}`)}>Resume</button>
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
