import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        if (!code || !state) {
          throw new Error("Missing code or state.");
        }

        await handleCallback(code, state);
        navigate("/lobby", { replace: true });
      } catch (err) {
        setError(err.message);
      }
    }

    run();
  }, [handleCallback, navigate]);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Signing you in...</h1>
        {error ? <p className="error">{error}</p> : <p>Please wait.</p>}
      </section>
    </main>
  );
}
