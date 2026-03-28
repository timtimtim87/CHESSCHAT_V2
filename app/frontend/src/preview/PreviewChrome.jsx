import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { usePreview } from "./PreviewContext";

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

export default function PreviewChrome({ children }) {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const {
    state,
    unreadCount,
    handleChallengeAction,
    markNotificationRead,
    resetSession,
    toggleSetting
  } = usePreview();

  function acceptInvite(notificationId) {
    handleChallengeAction(notificationId, "accept");
    setOpenDropdown(null);
    navigate("/ui-preview/game");
  }

  function rejectInvite(notificationId) {
    handleChallengeAction(notificationId, "reject");
    setOpenDropdown(null);
  }

  function toggleDropdown(name) {
    setOpenDropdown((current) => (current === name ? null : name));
  }

  return (
    <>
      <aside className="side-nav" aria-label="Preview primary">
        <nav className="side-nav-links">
          <NavIcon to="/ui-preview/game" icon="chess_knight" label="Game" />
          <NavIcon to="/ui-preview/profile" icon="account_circle" label="Profile" />
          <NavIcon to="/ui-preview/friends" icon="group" label="Friends" />
          <NavIcon to="/ui-preview/history" icon="history" label="History" />
        </nav>
        <div className="side-nav-footer">
          <div className="side-avatar" aria-hidden="true">
            {(state.user.displayName || "?").slice(0, 1).toUpperCase()}
          </div>
          <button className="icon-button" onClick={resetSession} aria-label="Reset preview" title="Reset preview">
            <span className="material-symbols-outlined">restart_alt</span>
          </button>
        </div>
      </aside>

      <header className="app-nav">
        <Link to="/ui-preview/game" className="app-nav-logo">
          Chess-Chat
        </Link>

        <div className="app-nav-actions preview-top-actions">
          <div className="preview-dropdown">
            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => toggleDropdown("notifications")}
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 ? <span className="preview-badge">{unreadCount}</span> : null}
            </button>
            <div className={`preview-dropdown-menu ${openDropdown === "notifications" ? "is-open" : ""}`}>
              <h4>Notifications</h4>
              {state.notifications.length === 0 ? <p className="preview-empty">No notifications.</p> : null}
              {state.notifications.map((item) => (
                <div className={`preview-notification ${item.read ? "" : "is-unread"}`} key={item.id}>
                  <p className="preview-notification-title">{item.title}</p>
                  <p>{item.body}</p>
                  {item.actions?.includes("accept") ? (
                    <div className="preview-row-actions">
                      <button className="button-primary" onClick={() => acceptInvite(item.id)} type="button">
                        Accept
                      </button>
                      <button className="button-secondary" onClick={() => rejectInvite(item.id)} type="button">
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button className="button-secondary" onClick={() => markNotificationRead(item.id)} type="button">
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="preview-dropdown">
            <button
              className="icon-button"
              type="button"
              aria-label="Settings"
              title="Settings"
              onClick={() => toggleDropdown("settings")}
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className={`preview-dropdown-menu ${openDropdown === "settings" ? "is-open" : ""}`}>
              <h4>Quick Settings</h4>
              <label className="preview-toggle-row">
                <input
                  type="checkbox"
                  checked={state.settings.soundEnabled}
                  onChange={() => toggleSetting("soundEnabled")}
                />
                Sound Enabled
              </label>
              <label className="preview-toggle-row">
                <input
                  type="checkbox"
                  checked={state.settings.showPresence}
                  onChange={() => toggleSetting("showPresence")}
                />
                Show Presence Tags
              </label>
              <label className="preview-toggle-row">
                <input
                  type="checkbox"
                  checked={state.settings.reducedMotion}
                  onChange={() => toggleSetting("reducedMotion")}
                />
                Reduced Motion
              </label>
              <button className="button-ghost" onClick={resetSession} type="button">
                Reset Preview Session
              </button>
            </div>
          </div>

          <Link to="/ui-preview/profile" className="app-nav-username">
            {state.user.displayName}
          </Link>
        </div>
      </header>

      <div className="app-content">{children}</div>
    </>
  );
}
