import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { config } from "../config";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isConfigReady } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isConfigReady) {
      return;
    }

    async function run() {
      try {
        if (window.location.host === "app.chess-chat.com") {
          window.location.assign(`${config.authHost}/auth/callback${window.location.search}`);
          return;
        }
        navigate("/lobby", { replace: true });
      } catch (err) {
        setError(err.message);
      }
    }

    run();
  }, [isConfigReady, navigate]);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Signing you in...</h1>
        {error ? <p className="error">{error}</p> : <p>Please wait.</p>}
      </section>
    </main>
  );
}
