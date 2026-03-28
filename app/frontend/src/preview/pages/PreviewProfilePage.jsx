import PreviewLayout from "../PreviewLayout";
import { usePreview } from "../PreviewContext";
import { useState } from "react";

export default function PreviewProfilePage() {
  const { state } = usePreview();
  const [username, setUsername] = useState(state.user.username);
  const [isLinked, setIsLinked] = useState(true);
  const [message, setMessage] = useState("");

  function saveUsername(event) {
    event.preventDefault();
    setMessage("Preview saved: username UI only (no backend call).");
  }

  return (
    <PreviewLayout>
      <header className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Profile overview with account controls and verification preview.</p>
        </div>
        <span className="page-chip">UI Preview</span>
      </header>
      <section className="profile-page">
        <article className="profile-main">
          <section className="panel surface-glass">
            <div className="profile-hero profile-hero-expanded">
              <div className="avatar-square">{state.user.displayName.slice(0, 2).toUpperCase()}</div>
              <div className="profile-hero-meta">
                <div className="profile-name-row">
                  <h2 className="profile-name">{state.user.displayName}</h2>
                  <span className="profile-rank-chip">Elite Rank</span>
                </div>
                <p className="profile-joined">@{state.user.username} • Joined April 2021</p>
                <p className="profile-summary">Focused rapid player who prefers friends-first challenges and clean UX.</p>
              </div>
              <div className="profile-elo-card">
                <p className="label">Elo Rating</p>
                <p className="value">2,480</p>
              </div>
            </div>

            <div className="profile-stats-row profile-stats-row-wide" style={{ marginTop: 14 }}>
              <div className="stat-card">
                <p className="label">Games</p>
                <p className="value">1,248</p>
              </div>
              <div className="stat-card">
                <p className="label">Wins</p>
                <p className="value">742</p>
              </div>
              <div className="stat-card">
                <p className="label">Losses</p>
                <p className="value">312</p>
              </div>
              <div className="stat-card">
                <p className="label">Draws</p>
                <p className="value">194</p>
              </div>
            </div>
          </section>

          <section className="panel surface-glass">
            <h3>Account & Verification</h3>
            <form className="profile-username-row" onSubmit={saveUsername}>
              <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} aria-label="Username" />
              <button className="button-primary" type="submit">
                Update
              </button>
            </form>
            {message ? <p className="landing-note">{message}</p> : null}

            <div className="profile-verification-card">
              <div>
                <p className="profile-verification-title">Chess.com Verification</p>
                <p className="profile-verification-sub">{isLinked ? "Linked as VikasGM_Official" : "Not linked yet"}</p>
              </div>
              <div className="profile-verification-actions">
                <span className={`tag ${isLinked ? "ui-ready" : "api-missing"}`}>{isLinked ? "Linked" : "Unlinked"}</span>
                <button className="button-secondary" type="button" onClick={() => setIsLinked((current) => !current)}>
                  {isLinked ? "Unlink" : "Link Chess.com"}
                </button>
              </div>
            </div>
          </section>

          <section className="panel surface-danger">
            <h3>Danger Zone</h3>
            <p>Permanently delete your account and all associated profile/game data.</p>
            <button className="button-danger" type="button">
              Delete Account
            </button>
          </section>
        </article>

        <aside className="profile-side">
          <section className="panel surface-glass">
            <h3>Pro Plan</h3>
            <p>Unlock advanced analytics, review tools, and coaching features.</p>
            <div className="stat-card">
              <p className="label">Next Bill</p>
              <p className="value">May 12, 2024</p>
            </div>
            <button className="button-secondary profile-coming-soon" type="button">
              Coming Soon
            </button>
          </section>
        </aside>
      </section>
    </PreviewLayout>
  );
}
