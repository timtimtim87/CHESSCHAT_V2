import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePreview } from "../PreviewContext";

export default function PreviewRegisterPage() {
  const navigate = useNavigate();
  const { setPreviewUser } = usePreview();
  const [displayName, setDisplayName] = useState("GrandmasterDev");
  const [username, setUsername] = useState("grandmaster_dev");

  function submit(event) {
    event.preventDefault();
    setPreviewUser({ displayName, username });
    navigate("/ui-preview/confirm");
  }

  return (
    <main className="auth-shell">
      <section className="landing-main" style={{ gridTemplateColumns: "1fr" }}>
        <article className="panel surface-glass" style={{ maxWidth: 560 }}>
          <span className="page-chip">Step 1</span>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            Create preview account
          </h1>
          <p className="page-subtitle">Mock register form only. No backend auth is called.</p>
          <form className="form-row" onSubmit={submit} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name"
              aria-label="Display name"
            />
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              placeholder="Username"
              aria-label="Username"
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button-primary" type="submit">
                Continue
              </button>
              <button className="button-secondary" type="button" onClick={() => navigate("/ui-preview/landing")}>
                Back
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}

