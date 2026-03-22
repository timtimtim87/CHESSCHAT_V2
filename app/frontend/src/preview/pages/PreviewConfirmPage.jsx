import { useNavigate } from "react-router-dom";
import { usePreview } from "../PreviewContext";

export default function PreviewConfirmPage() {
  const navigate = useNavigate();
  const { authenticate, state } = usePreview();

  return (
    <main className="auth-shell">
      <section className="landing-main" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel surface-glass" style={{ maxWidth: 560 }}>
          <span className="page-chip">Step 2</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            Registration Complete
          </h1>
          <p className="page-subtitle">
            Mock confirmation for <strong>{state.user.displayName}</strong>. Click OK to enter preview mode.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="button-primary"
              onClick={() => {
                authenticate();
                navigate("/ui-preview/game");
              }}
            >
              OK
            </button>
            <button className="button-secondary" onClick={() => navigate("/ui-preview/register")}>
              Back
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
