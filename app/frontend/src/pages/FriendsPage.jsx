import { useEffect, useState } from "react";
import AppChrome from "../components/AppChrome";
import { useAuth } from "../context/AuthContext";

const FRIEND_ROWS = [
  { name: "KnightRider_04", elo: 1840, status: "Playing Blitz", online: true },
  { name: "QueenGambit_X", elo: 2105, status: "Idle", online: true },
  { name: "BishopBlunder", elo: 1420, status: "In Game", online: false }
];

export default function FriendsPage({ preview = false }) {
  const { accessToken, logout } = useAuth();
  const [profileName, setProfileName] = useState("...");

  useEffect(() => {
    if (preview) {
      setProfileName("GrandmasterDev");
      return;
    }
    if (!accessToken) {
      return;
    }
    const controller = new AbortController();

    async function fetchProfile() {
      try {
        const response = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message || "Unable to load profile.");
        }
        const next = payload.user?.display_name || payload.user?.username || "...";
        setProfileName(next);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Profile fetch failed:", error.message);
        }
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [accessToken, preview]);

  return (
    <AppChrome profileName={profileName} onLogout={preview ? () => null : logout} basePath={preview ? "/ui-preview" : ""}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Friends Hub</h1>
          <p className="page-subtitle">Challenge peers, review online status, and manage invite requests.</p>
        </div>
        <span className="page-chip">UI Stub Route</span>
      </header>

      <section className="friends-layout">
        <article className="panel surface-glass">
          <h3>Online Friends</h3>
          <div className="friend-list">
            {FRIEND_ROWS.map((friend) => (
              <div className="friend-row" key={friend.name}>
                <div className="friend-meta">
                  <div className="avatar-chip">{friend.name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <p className="friend-name">{friend.name}</p>
                    <p className="friend-subtext">
                      Rating {friend.elo} - {friend.status}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="button-secondary" disabled>
                    {friend.online ? "Play Now" : "Watch"}
                  </button>
                  <span className="tag api-missing">API_MISSING</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="panel surface-glass">
            <h3>Pending Requests</h3>
            <ul className="stub-list">
              <li className="stub-item">
                <span>Accept/decline inbound friend requests</span>
                <span className="tag api-missing">API_MISSING</span>
              </li>
              <li className="stub-item">
                <span>Open direct friend chat</span>
                <span className="tag api-missing">API_MISSING</span>
              </li>
            </ul>
          </section>

          <section className="panel surface-glass">
            <h3>Invite Friends</h3>
            <p>Invite links and external platform integration are visual-only in this pass.</p>
            <button className="button-primary" disabled>
              Invite Friends
            </button>
          </section>
        </aside>
      </section>

      <button className="fab-button" type="button" aria-label="Add friend" title="Add friend" disabled>
        <span className="material-symbols-outlined">add</span>
      </button>
    </AppChrome>
  );
}
