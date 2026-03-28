import { useEffect, useMemo, useState } from "react";
import AppChrome from "../components/AppChrome";
import ChessBoardPanel from "../components/ChessBoardPanel";
import { useAuth } from "../context/AuthContext";

function badgeClass(result) {
  if (result === "win") return "result-badge win";
  if (result === "loss") return "result-badge loss";
  return "result-badge draw";
}

export default function HistoryPage() {
  const { accessToken, logout, user } = useAuth();
  const [profileName, setProfileName] = useState("...");
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [moveIndex, setMoveIndex] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();

    async function load() {
      const [meRes, historyRes] = await Promise.all([
        fetch("/api/me", { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal }),
        fetch("/api/history", { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal })
      ]);
      const me = await meRes.json();
      const history = await historyRes.json();
      if (meRes.ok) {
        setProfileName(me.user?.display_name || me.user?.username || "...");
      }
      if (historyRes.ok) {
        const list = history.games || [];
        setGames(list);
        if (list[0]) {
          setSelectedGameId(list[0].game_id);
          setMoveIndex(0);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [accessToken]);

  const selected = useMemo(
    () => games.find((game) => game.game_id === selectedGameId) || null,
    [games, selectedGameId]
  );
  const fenHistory = selected?.fen_history || ["start"];
  const sanMoves = selected?.move_list_san || [];
  const currentFen = fenHistory[Math.min(moveIndex, fenHistory.length - 1)] || "start";
  const maxIndex = Math.max(0, fenHistory.length - 1);

  return (
    <AppChrome profileName={profileName} onLogout={logout}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Game History</h1>
          <p className="page-subtitle">Review completed games with board replay and move navigation.</p>
        </div>
        <span className="page-chip">Live API</span>
      </header>

      <section className="history-layout">
        <article className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Result</th>
                <th>Moves</th>
                <th>Date</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {games.length === 0 ? (
                <tr>
                  <td colSpan={5}>No completed games yet.</td>
                </tr>
              ) : null}
              {games.map((game) => {
                const amWhite = game.white_player_id === user?.sub;
                const won = game.winner === user?.sub;
                const resultLabel = game.winner === "draw" ? "draw" : won ? "win" : "loss";
                const opponent = amWhite ? game.black_player_id : game.white_player_id;
                return (
                  <tr key={`${game.game_id}-${game.ended_at}`}>
                    <td>
                      <strong>{opponent || "Unknown opponent"}</strong>
                      <div className="friend-subtext">{game.game_id}</div>
                    </td>
                    <td>
                      <span className={badgeClass(resultLabel)}>{resultLabel.toUpperCase()}</span>
                    </td>
                    <td>{game.total_moves || 0}</td>
                    <td>{new Date(game.ended_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="button-secondary"
                        onClick={() => {
                          setSelectedGameId(game.game_id);
                          setMoveIndex(0);
                        }}
                      >
                        View Board + Moves
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        <aside className="panel surface-glass">
          <h3>Replay</h3>
          {selected ? (
            <>
              <div className="board-wrap">
                <ChessBoardPanel fen={currentFen} myColor="white" isMyTurn={false} onMove={() => false} />
              </div>
              <div className="room-action-row" style={{ marginTop: 10 }}>
                <button className="button-secondary" onClick={() => setMoveIndex((n) => Math.max(0, n - 1))} disabled={moveIndex <= 0}>
                  Back
                </button>
                <button className="button-secondary" onClick={() => setMoveIndex((n) => Math.min(maxIndex, n + 1))} disabled={moveIndex >= maxIndex}>
                  Forward
                </button>
              </div>
              <p className="landing-note" style={{ marginTop: 10 }}>
                Position {moveIndex} / {maxIndex}
              </p>
              <p className="landing-note">Moves: {sanMoves.slice(0, moveIndex).join(" ") || "-"}</p>
              <div className="stat-card" style={{ marginTop: 12 }}>
                <p className="label">Stockfish Eval (Future)</p>
                <p className="value">Coming soon</p>
              </div>
            </>
          ) : (
            <p className="friend-subtext">Select a game to review.</p>
          )}
        </aside>
      </section>
    </AppChrome>
  );
}
