import { Link, NavLink } from "react-router-dom";

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
  const root = normalizeBasePath(basePath);
  const toPath = (path) => `${root}${path}`;

  return (
    <>
      <aside className="side-nav" aria-label="Primary">
        <div className="app-nav-logo">ChessChat</div>
        <nav className="side-nav-links">
          <NavIcon to={toPath("/lobby")} icon="grid_view" label="Lobby" />
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
          ChessChat
        </Link>
        <div className="app-nav-actions">
          <button className="icon-button" type="button" aria-label="Search" title="Search">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className="icon-button" type="button" aria-label="Notifications" title="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="icon-button" type="button" aria-label="Settings" title="Settings">
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

      <div className="app-content">{children}</div>
    </>
  );
}
