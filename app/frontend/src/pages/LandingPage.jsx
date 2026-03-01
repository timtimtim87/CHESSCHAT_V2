import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function LandingPage() {
  const { login, isConfigReady } = useAuth();
  const [error, setError] = useState("");

  async function onLogin() {
    setError("");
    try {
      await login();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>ChessChat</h1>
        <p>Real-time chess and video in private 5-character rooms.</p>
        <button className="primary" onClick={onLogin} disabled={!isConfigReady}>
          Log In / Sign Up
        </button>
        {!isConfigReady ? <p>Loading login configuration...</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
