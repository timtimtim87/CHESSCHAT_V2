import { useEffect, useState } from "react";
import AppChrome from "../components/AppChrome";
import { useAuth } from "../context/AuthContext";

const HISTORY_ROWS = [
  { opponent: "Alex_The_Great", elo: 2415, result: "WIN", type: "Blitz (3+2)", date: "Today, 14:20" },
  { opponent: "Checkmate_Queen", elo: 2530, result: "LOSS", type: "Rapid (10+5)", date: "Yesterday, 09:15" },
  { opponent: "GrandMaster_P", elo: 2490, result: "DRAW", type: "Blitz (5+0)", date: "Aug 24, 21:05" }
];

function badgeClass(result) {
  if (result === "WIN") return "result-badge win";
  if (result === "LOSS") return "result-badge loss";
  return "result-badge draw";
}

export default function HistoryPage({ preview = false }) {
  const { accessToken, logout } = useAuth();
  const [profileName, setProfileName] = useState("...");

  useEffect(() => {
    if (preview) {
      setProfileName("GrandmasterDev");
      return;
    }
    if (!accessToken) {
      return;
    }
    const controller = new AbortController();

    async function fetchProfile() {
      try {
        const response = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message || "Unable to load profile.");
        }
        const next = payload.user?.display_name || payload.user?.username || "...";
        setProfileName(next);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Profile fetch failed:", error.message);
        }
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [accessToken, preview]);

  return (
    <AppChrome profileName={profileName} onLogout={preview ? () => null : logout} basePath={preview ? "/ui-preview" : ""}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Game History</h1>
          <p className="page-subtitle">Review prior matches and keep a clear record of outcomes and opponents.</p>
        </div>
        <span className="page-chip">UI Stub Route</span>
      </header>

      <section className="history-layout">
        <article className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Opponent</th>
                <th>Result</th>
                <th>Type</th>
                <th>Date</th>
                <th>Analysis</th>
              </tr>
            </thead>
            <tbody>
              {HISTORY_ROWS.map((row) => (
                <tr key={`${row.opponent}-${row.date}`}>
                  <td>
                    <strong>{row.opponent}</strong>
                    <div className="friend-subtext">ELO {row.elo}</div>
                  </td>
                  <td>
                    <span className={badgeClass(row.result)}>{row.result}</span>
                  </td>
                  <td>{row.type}</td>
                  <td>{row.date}</td>
                  <td>
                    <button className="button-secondary" disabled>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="panel surface-glass">
            <h3>History Controls</h3>
            <ul className="stub-list">
              <li className="stub-item">
                <span>Search by opponent</span>
                <span className="tag api-missing">API_MISSING</span>
              </li>
              <li className="stub-item">
                <span>Time-control filters</span>
                <span className="tag api-missing">API_MISSING</span>
              </li>
              <li className="stub-item">
                <span>Export PGN/csv</span>
                <span className="tag api-missing">API_MISSING</span>
              </li>
            </ul>
          </section>
        </aside>
      </section>

      <button className="fab-button" type="button" aria-label="Quick start game" title="Quick start game" disabled>
        <span className="material-symbols-outlined">add</span>
      </button>
    </AppChrome>
  );
}
