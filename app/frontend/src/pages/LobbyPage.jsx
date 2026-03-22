import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppChrome from "../components/AppChrome";

const LAST_OPPONENT_KEY = "chesschat_last_opponent";
const PREVIEW_PROFILE = {
  username: "grandmaster_dev",
  display_name: "GrandmasterDev",
  wins: 42,
  losses: 11,
  draws: 7
};

export default function LobbyPage({ preview = false }) {
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
    if (preview) {
      setProfile(PREVIEW_PROFILE);
      setNeedsUsername(false);
      setUsernameDraft(PREVIEW_PROFILE.username);
      return;
    }
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
  }, [accessToken, preview]);

  async function onSubmit(event) {
    event.preventDefault();
    if (preview) {
      navigate("/ui-preview/room");
      return;
    }
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
    if (preview) {
      setNeedsUsername(false);
      setUsernameError("");
      return;
    }
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
  const stats = {
    games: (profile?.wins ?? 0) + (profile?.losses ?? 0) + (profile?.draws ?? 0),
    wins: profile?.wins ?? 0,
    losses: profile?.losses ?? 0
  };

  return (
    <div className="lobby-shell">
      <AppChrome profileName={profileName} onLogout={preview ? () => null : logout} basePath={preview ? "/ui-preview" : ""}>
        <header className="page-header">
          <div>
            <h1 className="page-title">Lobby</h1>
            <p className="page-subtitle">Start a private match, set your profile name, and jump straight into a room.</p>
          </div>
          <span className="page-chip">MVP Control Room</span>
        </header>

        <section className="lobby-grid">
          <article className="panel surface-glass">
            {needsUsername ? (
              <>
                <h3>Choose your username</h3>
                <p>You need a valid username before you can challenge a friend.</p>
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
                <h3>Challenge a friend</h3>
                <p>Invite by username and create a private room instantly.</p>
                <form className="form-row" onSubmit={onSubmit}>
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
                    Last game vs <strong>{lastOpponent}</strong> -{" "}
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
          </article>

          <aside className="panel surface-glass">
            <h3>Session Snapshot</h3>
            <div className="lobby-stat-grid">
              <div className="stat-card">
                <p className="label">Games</p>
                <p className="value">{stats.games}</p>
              </div>
              <div className="stat-card">
                <p className="label">Wins</p>
                <p className="value">{stats.wins}</p>
              </div>
              <div className="stat-card">
                <p className="label">Losses</p>
                <p className="value">{stats.losses}</p>
              </div>
            </div>

            <h3 style={{ marginTop: 18 }}>UI-to-Feature Backlog Map</h3>
            <ul className="stub-list">
              <li className="stub-item">
                <span>Friends list + invites</span>
                <span className="tag api-missing">API_MISSING</span>
              </li>
              <li className="stub-item">
                <span>Game history filters/export</span>
                <span className="tag api-missing">API_MISSING</span>
              </li>
              <li className="stub-item">
                <span>Enhanced profile settings</span>
                <span className="tag ui-ready">UI_READY</span>
              </li>
            </ul>
          </aside>
        </section>
      </AppChrome>
    </div>
  );
}
