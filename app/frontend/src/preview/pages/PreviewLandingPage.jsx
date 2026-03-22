import { useNavigate } from "react-router-dom";
import { usePreview } from "../PreviewContext";

export default function PreviewLandingPage() {
  const navigate = useNavigate();
  const { authenticate } = usePreview();

  return (
    <main className="auth-shell">
      <header className="landing-nav">
        <div className="landing-brand">ChessChat</div>
        <button
          className="button-ghost"
          onClick={() => {
            authenticate();
            navigate("/ui-preview/game");
          }}
        >
          Preview Sign In
        </button>
      </header>

      <section className="landing-main">
        <div>
          <span className="page-chip">UI Preview Sandbox</span>
          <h1 className="landing-headline">
            Test the full <span className="gradient-text">mock flow</span> locally.
          </h1>
          <p className="landing-copy">
            Backend-independent preview mode for UI/UX iteration. Click through register, confirm, play, game, and
            all design pages.
          </p>
          <div className="auth-actions">
            <button className="button-primary" onClick={() => navigate("/ui-preview/register")}>
              Sign Up
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                authenticate();
                navigate("/ui-preview/game");
              }}
            >
              Sign In
            </button>
          </div>
          <p className="landing-note">
            Path: Landing {"->"} Register {"->"} Confirm {"->"} Game {"->"} Play/Friends/Profile/History
          </p>
        </div>

        <aside className="landing-preview surface-glass" aria-hidden="true">
          <div className="preview-head">
            <div>
              <p className="preview-title">ChessChat Preview</p>
              <p className="preview-status">Local UI-only mode</p>
            </div>
            <span className="button-pill" style={{ padding: "6px 10px" }}>
              Mock Data
            </span>
          </div>

          <div className="preview-grid">
            <div className="preview-tile">Friends First</div>
            <div className="preview-tile">Quick Challenge</div>
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
