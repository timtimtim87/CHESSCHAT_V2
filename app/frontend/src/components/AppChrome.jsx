import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

function NavIcon({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `side-nav-link ${isActive ? "is-active" : ""}`}
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </NavLink>
  );
}

function normalizeBasePath(basePath = "") {
  if (!basePath) return "";
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

export default function AppChrome({ profileName, onLogout, children, basePath = "" }) {
  const { accessToken } = useAuth();
  const root = normalizeBasePath(basePath);
  const toPath = (path) => `${root}${path}`;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    async function loadNotifications() {
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setNotifications(payload.notifications || []);
      }
    }
    void loadNotifications();
    return () => controller.abort();
  }, [accessToken]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <>
      <aside className="side-nav" aria-label="Primary">
        <nav className="side-nav-links">
          <NavIcon to={toPath("/lobby")} icon="chess_queen" label="Lobby" />
          <NavIcon to={toPath("/profile")} icon="account_circle" label="Profile" />
          <NavIcon to={toPath("/friends")} icon="group" label="Friends" />
          <NavIcon to={toPath("/history")} icon="history" label="History" />
        </nav>
        <div className="side-nav-footer">
          <div className="side-avatar" aria-hidden="true">
            {(profileName || "?").slice(0, 1).toUpperCase()}
          </div>
          <button className="icon-button" onClick={onLogout} aria-label="Logout" title="Logout">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </aside>

      <header className="app-nav">
        <Link to={toPath("/lobby")} className="app-nav-logo">
          Chess-Chat
        </Link>
        <div className="app-nav-actions">
          <button className="icon-button" type="button" aria-label="Search" title="Search">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setSettingsOpen(false);
            }}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 ? <span className="tag ui-ready">{unreadCount}</span> : null}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Settings"
            title="Settings"
            onClick={() => {
              setSettingsOpen((open) => !open);
              setNotificationsOpen(false);
            }}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <Link to={toPath("/profile")} className="app-nav-username">
            {profileName}
          </Link>
          <button className="button-ghost" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {notificationsOpen ? (
        <section className="panel surface-glass" style={{ margin: "16px 24px 0 92px" }}>
          <h3>Notifications</h3>
          <ul className="stub-list">
            {notifications.length === 0 ? <li className="stub-item">No notifications.</li> : null}
            {notifications.map((notification) => (
              <li className="stub-item" key={notification.notification_id}>
                <span>{notification.title || notification.message}</span>
                <span className={`tag ${notification.read ? "api-missing" : "ui-ready"}`}>
                  {notification.read ? "Read" : "New"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {settingsOpen ? (
        <section className="panel surface-glass" style={{ margin: "16px 24px 0 92px" }}>
          <h3>Settings</h3>
          <ul className="stub-list">
            <li className="stub-item">
              <span>Notifications: In-app only (v1)</span>
            </li>
            <li className="stub-item">
              <span>Presence: Friends hub controlled</span>
            </li>
          </ul>
        </section>
      ) : null}

      <div className="app-content">{children}</div>
    </>
  );
}
