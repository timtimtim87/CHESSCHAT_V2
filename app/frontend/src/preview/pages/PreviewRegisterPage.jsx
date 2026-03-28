import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePreview } from "../PreviewContext";

export default function PreviewRegisterPage() {
  const navigate = useNavigate();
  const { setPreviewUser } = usePreview();
  const [displayName, setDisplayName] = useState("Magnus Carlsen");
  const [username, setUsername] = useState("grandmaster99");
  const [email, setEmail] = useState("curator@chess-chat.com");
  const [password, setPassword] = useState("password123");
  const [confirmPassword, setConfirmPassword] = useState("password123");
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  function submit(event) {
    event.preventDefault();
    setPreviewUser({ displayName, username });
    navigate("/ui-preview/confirm");
  }

  return (
    <main className="auth-shell preview-register-shell">
      <header className="preview-register-topbar">
        <h1>Chess-Chat</h1>
      </header>

      <section className="preview-register-main">
        <article className="preview-register-card surface-glass">
          <header className="preview-register-header">
            <h2>Create your account</h2>
            <p>Join the elite community of digital curators.</p>
          </header>

          <div className="preview-register-social">
            <button className="button-secondary" type="button">
              Verify with Chess.com
            </button>
            <button className="button-secondary" type="button">
              Continue with Google
            </button>
          </div>

          <div className="preview-register-divider">
            <span>Or register with email</span>
          </div>

          <form className="preview-register-form" onSubmit={submit}>
            <div className="preview-register-grid">
              <label>
                Full Name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Magnus Carlsen"
                  aria-label="Full name"
                />
              </label>
              <label>
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  placeholder="grandmaster99"
                  aria-label="Username"
                />
              </label>
            </div>
            <label>
              Email Address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="curator@chess-chat.com"
                aria-label="Email address"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                aria-label="Password"
              />
            </label>
            <label>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                aria-label="Confirm password"
              />
            </label>

            <label className="preview-register-checkbox">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                aria-label="Accept terms"
              />
              I agree to the <a href="#terms">Terms and Conditions</a> and Privacy Policy.
            </label>

            <button className="button-primary preview-register-cta" type="submit">
              Sign Up
            </button>
          </form>

          <footer className="preview-register-footer">
            <p>
              Already have an account?{" "}
              <button className="preview-link-button" type="button" onClick={() => navigate("/ui-preview/landing")}>
                Log In
              </button>
            </p>
            <p className="preview-register-note">Preview-only form. Real auth is not called.</p>
          </footer>
        </article>
      </section>

      <footer className="preview-register-bottom">
        <p>© 2024 Chess-Chat. All rights reserved.</p>
        <nav>
          <a href="#terms">Terms</a>
          <a href="#privacy">Privacy</a>
          <a href="#support">Support</a>
        </nav>
      </footer>
    </main>
  );
}
