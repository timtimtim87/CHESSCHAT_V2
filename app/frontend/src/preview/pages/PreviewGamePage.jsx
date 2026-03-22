import { useState } from "react";
import PreviewLayout from "../PreviewLayout";
import { usePreview } from "../PreviewContext";

export default function PreviewGamePage() {
  const { state, quickChallengeByUsername } = usePreview();
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [allowTakebacks, setAllowTakebacks] = useState(true);
  const [whiteMinutes, setWhiteMinutes] = useState(10);
  const [blackMinutes, setBlackMinutes] = useState(10);
  const [whiteTakebacks, setWhiteTakebacks] = useState(2);
  const [blackTakebacks, setBlackTakebacks] = useState(2);
  const opponent = state.activeGame?.opponent || "Waiting for challenge";

  function submitQuickInvite(event) {
    event.preventDefault();
    const result = quickChallengeByUsername(inviteUsername);
    setInviteMessage(result.message);
  }

  return (
    <PreviewLayout>
      {showSetupModal ? (
        <section className="preview-modal-backdrop" role="dialog" aria-modal="true" aria-label="Game setup">
          <div className="preview-modal-card surface-glass">
            <h3>Game Setup (Preview)</h3>
            <p>Future feature: friend game options before the first move.</p>
            <div className="preview-settings-grid">
              <label>
                White Time (minutes)
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={whiteMinutes}
                  onChange={(event) => setWhiteMinutes(Number(event.target.value))}
                />
              </label>
              <label>
                Black Time (minutes)
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={blackMinutes}
                  onChange={(event) => setBlackMinutes(Number(event.target.value))}
                />
              </label>
              <label className="preview-toggle-row">
                <input
                  type="checkbox"
                  checked={allowTakebacks}
                  onChange={(event) => setAllowTakebacks(event.target.checked)}
                />
                Allow Takebacks
              </label>
              <label>
                White Takebacks
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={whiteTakebacks}
                  onChange={(event) => setWhiteTakebacks(Number(event.target.value))}
                  disabled={!allowTakebacks}
                />
              </label>
              <label>
                Black Takebacks
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={blackTakebacks}
                  onChange={(event) => setBlackTakebacks(Number(event.target.value))}
                  disabled={!allowTakebacks}
                />
              </label>
            </div>
            <div className="preview-row-actions">
              <button className="button-primary" type="button" onClick={() => setShowSetupModal(false)}>
                Start Mock Game
              </button>
              <button className="button-secondary" type="button" onClick={() => setShowSetupModal(false)}>
                Keep Defaults
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <header className="page-header">
        <div>
          <h1 className="page-title">Game</h1>
          <p className="page-subtitle">Mock game room UI for layout testing.</p>
        </div>
        <span className="page-chip">Room {state.activeGame?.roomCode || "PREV1"}</span>
      </header>

      <main className="room-shell" style={{ padding: 0 }}>
        <section className="room-status-strip surface-glass">
          <div>
            <p className="room-code-line">Opponent {opponent}</p>
            <h1>Turn: White</h1>
          </div>
          <div className="room-status-meta">
            <p className="socket-status">Preview connection stable</p>
            <p className="socket-status">Latency 24ms (mock)</p>
          </div>
        </section>

        <section className="room-grid preview-room-grid">
          <aside className="room-side room-side-left">
            <section className="video-panel">
              <div className="player-video-card preview-video-card">
                <div className="player-video-frame">
                  <div className="player-video-avatar">OP</div>
                </div>
                <div className="player-video-meta">
                  <p className="player-video-name">{opponent}</p>
                  <p className="player-video-subtitle">White</p>
                </div>
              </div>
            </section>
          </aside>

          <section className="game-panel surface-glass preview-game-panel">
            <form className="form-row" onSubmit={submitQuickInvite}>
              <input
                value={inviteUsername}
                onChange={(event) => setInviteUsername(event.target.value)}
                placeholder="Friend username"
                aria-label="Game quick invite username"
              />
              <button className="button-primary" type="submit">
                Play Now
              </button>
            </form>
            {inviteMessage ? <p className="landing-note">{inviteMessage}</p> : null}
            <div className="preview-board preview-board-game" style={{ marginTop: 0 }}>
              {Array.from({ length: 64 }).map((_, index) => (
                <div key={index} />
              ))}
            </div>
            <div className="room-action-row">
              <button className="button-primary" disabled>
                Start Game
              </button>
              <button className="button-secondary" disabled>
                Offer Draw
              </button>
              <button className="button-secondary" disabled>
                Takeback
              </button>
              <button className="button-danger" disabled>
                Resign
              </button>
            </div>
          </section>

          <aside className="room-side room-side-right">
            <section className="video-panel">
              <div className="player-video-card preview-video-card">
                <div className="player-video-frame">
                  <div className="player-video-avatar">ME</div>
                </div>
                <div className="player-video-meta">
                  <p className="player-video-name">{state.user.displayName}</p>
                  <p className="player-video-subtitle">Black</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </PreviewLayout>
  );
}
