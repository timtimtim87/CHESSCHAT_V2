import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function LandingPage({ preview = false }) {
  const { login, signup, isConfigReady } = useAuth();
  const [error, setError] = useState("");

  async function onLogin() {
    setError("");
    if (preview) {
      globalThis.location.assign("/ui-preview/lobby");
      return;
    }
    try {
      await login();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSignup() {
    setError("");
    if (preview) {
      globalThis.location.assign("/ui-preview/lobby");
      return;
    }
    try {
      await signup();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-shell">
      <header className="landing-nav">
        <div className="landing-brand">ChessChat</div>
        <button className="button-ghost" onClick={onLogin} disabled={!isConfigReady}>
          Log In
        </button>
      </header>

      <section className="landing-main">
        <div>
          <span className="page-chip">Chess with a Smile</span>
          <h1 className="landing-headline">
            Play, Chat, and <span className="gradient-text">Checkmate</span> with friends.
          </h1>
          <p className="landing-copy">
            Experience real-time chess with face-to-face conversation. Fast room links, calm visuals, and a focused
            board-first game flow.
          </p>
          <div className="auth-actions">
            <button className="button-primary" onClick={onSignup} disabled={!isConfigReady}>
              Sign Up
            </button>
            <button className="button-secondary" onClick={onLogin} disabled={!isConfigReady}>
              Sign In
            </button>
          </div>
          {!isConfigReady ? <p className="landing-note">Loading login configuration...</p> : null}
          {error ? <p className="error landing-note">{error}</p> : null}
        </div>

        <aside className="landing-preview surface-glass" aria-hidden="true">
          <div className="preview-head">
            <div>
              <p className="preview-title">Game vs. Chloe</p>
              <p className="preview-status">Live Connection Active</p>
            </div>
            <span className="button-pill" style={{ padding: "6px 10px" }}>
              Your Turn
            </span>
          </div>

          <div className="preview-grid">
            <div className="preview-tile">Chloe W.</div>
            <div className="preview-tile">You (Alex)</div>
          </div>

          <div className="preview-board">
            {Array.from({ length: 64 }).map((_, index) => (
              <div key={index} />
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
