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
        const response = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || "Unable to load profile.");
        setProfile(payload.user || null);
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
          <p className="page-subtitle">Track account stats and manage your ChessChat profile settings.</p>
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
                <h3>Verification</h3>
                <ul className="stub-list">
                  <li className="stub-item">
                    <span>Chess.com account linking</span>
                    <span className="tag api-missing">API_MISSING</span>
                  </li>
                  <li className="stub-item">
                    <span>Two-factor toggle</span>
                    <span className="tag api-missing">API_MISSING</span>
                  </li>
                  <li className="stub-item">
                    <span>Visibility controls</span>
                    <span className="tag ui-ready">UI_READY</span>
                  </li>
                </ul>
              </section>

              <section className="panel surface-glass">
                <h3>Achievements</h3>
                <ul className="stub-list">
                  <li className="stub-item">
                    <span>Sicilian Master</span>
                    <span className="tag ui-ready">UI_READY</span>
                  </li>
                  <li className="stub-item">
                    <span>Speed Demon</span>
                    <span className="tag ui-ready">UI_READY</span>
                  </li>
                </ul>
              </section>
            </aside>
          </>
        )}
      </section>
    </AppChrome>
  );
}
