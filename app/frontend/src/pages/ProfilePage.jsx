import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const { accessToken, logout } = useAuth();

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
  }, [accessToken]);

  async function deleteAccount() {
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

  const profileName = profile?.display_name || profile?.username || "—";
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";
  const gamesPlayed = (profile?.wins ?? 0) + (profile?.losses ?? 0) + (profile?.draws ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <nav className="app-nav">
        <Link to="/lobby" className="app-nav-logo">♟ ChessChat</Link>
        <div className="app-nav-actions">
          <button className="button-ghost" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="profile-page">
        {isLoading ? (
          <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
        ) : (
          <>
            <h1>{profileName}</h1>
            <p className="profile-joined">Joined {joinedDate}</p>

            <div className="profile-stats-row">
              <div>
                <p className="stat-label">Games</p>
                <p className="stat-value">{gamesPlayed}</p>
              </div>
              <div>
                <p className="stat-label">Wins</p>
                <p className="stat-value">{profile?.wins ?? 0}</p>
              </div>
              <div>
                <p className="stat-label">Losses</p>
                <p className="stat-value">{profile?.losses ?? 0}</p>
              </div>
            </div>

            <hr className="profile-divider" />

            <div>
              <button className="button-danger" onClick={deleteAccount} disabled={isDeletingAccount}>
                {isDeletingAccount ? "Deleting…" : "Delete Account"}
              </button>
              {deleteAccountError ? (
                <p className="inline-error" style={{ marginTop: 8 }}>{deleteAccountError}</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
