import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function LandingPage() {
  const { login, signup, isConfigReady } = useAuth();
  const [error, setError] = useState("");

  async function onLogin() {
    setError("");
    try {
      await login();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSignup() {
    setError("");
    try {
      await signup();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>ChessChat</h1>
        <div className="auth-actions">
          <button className="button-primary" onClick={onSignup} disabled={!isConfigReady}>
            Sign Up
          </button>
          <button className="button-secondary" onClick={onLogin} disabled={!isConfigReady}>
            Sign In
          </button>
        </div>
        <p>Pick your in-game username after sign-in from the Lobby.</p>
        {!isConfigReady ? <p>Loading login configuration...</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
