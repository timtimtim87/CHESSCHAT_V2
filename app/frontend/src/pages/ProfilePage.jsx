import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AppChrome from "../components/AppChrome";

const PREVIEW_PROFILE = {
  username: "grandmaster_dev",
  display_name: "GrandmasterDev",
  created_at: "2026-01-12T10:00:00.000Z",
  wins: 42,
  losses: 11,
  draws: 7
};

export default function ProfilePage({ preview = false }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [chessComUsername, setChessComUsername] = useState("");
  const [isChessComLinked, setIsChessComLinked] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const { accessToken, logout } = useAuth();

  useEffect(() => {
    if (preview) {
      setProfile(PREVIEW_PROFILE);
      setIsLoading(false);
      return;
    }
    if (!accessToken) return;
    const controller = new AbortController();

    async function fetchProfile() {
      try {
        const [profileRes, chessRes] = await Promise.all([
          fetch("/api/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal
          }),
          fetch("/api/chesscom/link", {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal
          })
        ]);
        const payload = await profileRes.json();
        if (!profileRes.ok) throw new Error(payload?.error?.message || "Unable to load profile.");
        setProfile(payload.user || null);
        if (chessRes.ok) {
          const chessPayload = await chessRes.json();
          setIsChessComLinked(Boolean(chessPayload.linked));
          setChessComUsername(chessPayload.username || "");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Profile fetch failed:", error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [accessToken, preview]);

  async function deleteAccount() {
    if (preview) {
      setDeleteAccountError("Preview mode: account deletion disabled.");
      return;
    }
    if (!window.confirm("Permanently delete your account? This cannot be undone.")) return;
    setIsDeletingAccount(true);
    setDeleteAccountError("");
    try {
      const response = await fetch("/api/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || "Unable to delete account.");
      }
      logout();
    } catch (error) {
      setDeleteAccountError(error.message || "Unable to delete account.");
      setIsDeletingAccount(false);
    }
  }

  async function linkChessCom() {
    if (!chessComUsername.trim()) {
      setProfileMessage("Enter your Chess.com username.");
      return;
    }
    setProfileMessage("");
    const response = await fetch("/api/chesscom/link", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: chessComUsername.trim() })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setProfileMessage(payload?.error?.message || "Unable to link Chess.com account.");
      return;
    }
    setIsChessComLinked(true);
    setProfileMessage("Chess.com account linked.");
  }

  async function unlinkChessCom() {
    setProfileMessage("");
    const response = await fetch("/api/chesscom/link", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      setProfileMessage("Unable to unlink Chess.com account.");
      return;
    }
    setIsChessComLinked(false);
    setChessComUsername("");
    setProfileMessage("Chess.com account unlinked.");
  }

  const profileName = profile?.display_name || profile?.username || "-";
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "-";
  const gamesPlayed = (profile?.wins ?? 0) + (profile?.losses ?? 0) + (profile?.draws ?? 0);

  return (
    <AppChrome profileName={profileName} onLogout={preview ? () => null : logout} basePath={preview ? "/ui-preview" : ""}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Profile Overview</h1>
          <p className="page-subtitle">Track account stats and manage your Chess-Chat profile settings.</p>
        </div>
        <span className="page-chip">Account</span>
      </header>

      <section className="profile-page">
        {isLoading ? (
          <article className="panel surface-glass">
            <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
          </article>
        ) : (
          <>
            <article className="profile-main">
              <section className="panel surface-glass">
                <div className="profile-hero">
                  <div className="avatar-square" aria-hidden="true">
                    {(profileName || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="profile-name">{profileName}</h2>
                    <p className="profile-joined">Joined {joinedDate}</p>
                  </div>
                </div>

                <div className="profile-stats-row" style={{ marginTop: 14 }}>
                  <div className="stat-card">
                    <p className="label">Games</p>
                    <p className="value">{gamesPlayed}</p>
                  </div>
                  <div className="stat-card">
                    <p className="label">Wins</p>
                    <p className="value">{profile?.wins ?? 0}</p>
                  </div>
                  <div className="stat-card">
                    <p className="label">Losses</p>
                    <p className="value">{profile?.losses ?? 0}</p>
                  </div>
                </div>
              </section>

              <section className="panel surface-glass">
                <h3>Danger Zone</h3>
                <p>Permanently delete your account and all associated profile/game data.</p>
                <button className="button-danger" onClick={deleteAccount} disabled={isDeletingAccount}>
                  {isDeletingAccount ? "Deleting..." : "Delete Account"}
                </button>
                {deleteAccountError ? (
                  <p className="inline-error" style={{ marginTop: 8 }}>{deleteAccountError}</p>
                ) : null}
              </section>
            </article>

            <aside className="profile-side">
              <section className="panel surface-glass">
                <h3>Account & Chess.com Verification</h3>
                <div className="form-row">
                  <input
                    value={chessComUsername}
                    onChange={(e) => setChessComUsername(e.target.value)}
                    placeholder="chess.com username"
                    aria-label="Chess.com username"
                  />
                </div>
                <div className="room-action-row" style={{ marginTop: 8 }}>
                  <button className="button-primary" onClick={linkChessCom} type="button">
                    Link Chess.com
                  </button>
                  <button className="button-secondary" onClick={unlinkChessCom} type="button" disabled={!isChessComLinked}>
                    Unlink
                  </button>
                </div>
                <p className="landing-note" style={{ marginTop: 8 }}>
                  {isChessComLinked ? "Linked" : "Not linked"}
                </p>
                {profileMessage ? <p className="landing-note">{profileMessage}</p> : null}
              </section>

              <section className="panel surface-glass">
                <h3>Pro Plan</h3>
                <p>Advanced analytics and coaching tools are planned.</p>
                <button className="button-secondary" type="button">
                  Coming Soon
                </button>
              </section>
            </aside>
          </>
        )}
      </section>
    </AppChrome>
  );
}
