import { useState } from "react";
import PreviewLayout from "../PreviewLayout";
import { usePreview } from "../PreviewContext";

export default function PreviewGamePage() {
  const { state, quickChallengeByUsername } = usePreview();
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [allowTakebacks, setAllowTakebacks] = useState(true);
  const [timePreset, setTimePreset] = useState("5");
  const [colorChoice, setColorChoice] = useState("random");
  const [whiteMinutes, setWhiteMinutes] = useState(10);
  const [blackMinutes, setBlackMinutes] = useState(10);
  const [whiteTakebacks, setWhiteTakebacks] = useState(2);
  const [blackTakebacks, setBlackTakebacks] = useState(2);
  const isVideoConnected = true;
  const opponent = state.activeGame?.opponent || "Waiting for challenge";
  const timePresets = [
    { id: "3", label: "3 min", type: "Blitz", white: 3, black: 3 },
    { id: "5", label: "5 min", type: "Blitz", white: 5, black: 5 },
    { id: "10", label: "10 min", type: "Rapid", white: 10, black: 10 },
    { id: "30", label: "30 min", type: "Classical", white: 30, black: 30 },
    { id: "custom", label: "Custom", type: "Manual" },
  ];

  function selectTimePreset(preset) {
    setTimePreset(preset.id);
    if (preset.id !== "custom") {
      setWhiteMinutes(preset.white);
      setBlackMinutes(preset.black);
    }
  }

  function submitQuickInvite(event) {
    event.preventDefault();
    const result = quickChallengeByUsername(inviteUsername);
    setInviteMessage(result.message);
  }

  return (
    <PreviewLayout>
      {showSetupModal ? (
        <section className="preview-modal-backdrop" role="dialog" aria-modal="true" aria-label="Game setup">
          <div className="preview-modal-card preview-modal-card-obsidian surface-glass">
            <header className="preview-modal-header">
              <h3>Game Settings</h3>
              <button className="button-ghost" type="button" onClick={() => setShowSetupModal(false)}>
                Close
              </button>
            </header>

            <div className="preview-modal-body">
              <section>
                <div className="preview-section-label">
                  <span>Time Control</span>
                  <div />
                </div>
                <div className="preview-time-grid">
                  {timePresets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`preview-time-btn ${timePreset === preset.id ? "is-active" : ""}`}
                      type="button"
                      onClick={() => selectTimePreset(preset)}
                    >
                      <strong>{preset.label}</strong>
                      <span>{preset.type}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="preview-section-label">
                  <span>Choose Color</span>
                  <div />
                </div>
                <div className="preview-color-grid">
                  {[
                    { id: "white", label: "White", glyph: "W" },
                    { id: "random", label: "Random", glyph: "?" },
                    { id: "black", label: "Black", glyph: "B" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      className={`preview-color-btn ${colorChoice === option.id ? "is-active" : ""}`}
                      type="button"
                      onClick={() => setColorChoice(option.id)}
                    >
                      <span>{option.glyph}</span>
                      <strong>{option.label}</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="preview-player-grid">
                <article className="preview-player-card is-you">
                  <p className="preview-player-title">You</p>
                  <label>
                    Starting Time (min)
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={whiteMinutes}
                      onChange={(event) => setWhiteMinutes(Number(event.target.value))}
                    />
                  </label>
                  <div className="preview-takeback-row">
                    <p>Takebacks Allowed</p>
                    <div className="preview-takeback-grid">
                      {[0, 1, 2].map((count) => (
                        <button
                          key={`white-${count}`}
                          type="button"
                          className={whiteTakebacks === count ? "is-active" : ""}
                          onClick={() => setWhiteTakebacks(count)}
                          disabled={!allowTakebacks}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="preview-player-card">
                  <p className="preview-player-title">Opponent</p>
                  <label>
                    Starting Time (min)
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={blackMinutes}
                      onChange={(event) => setBlackMinutes(Number(event.target.value))}
                    />
                  </label>
                  <div className="preview-takeback-row">
                    <p>Takebacks Allowed</p>
                    <div className="preview-takeback-grid">
                      {[0, 1, 2].map((count) => (
                        <button
                          key={`black-${count}`}
                          type="button"
                          className={blackTakebacks === count ? "is-active" : ""}
                          onClick={() => setBlackTakebacks(count)}
                          disabled={!allowTakebacks}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              </section>
            </div>

            <footer className="preview-modal-footer">
              <label className="preview-toggle-row">
                <input
                  type="checkbox"
                  checked={allowTakebacks}
                  onChange={(event) => setAllowTakebacks(event.target.checked)}
                />
                Allow takebacks before opponent replies
              </label>
              <button className="button-primary preview-start-btn" type="button" onClick={() => setShowSetupModal(false)}>
                Start Game
              </button>
              <p>Preview-only mock. Real matchmaking rules are not wired yet.</p>
            </footer>
          </div>
        </section>
      ) : null}

      <main className="room-shell" style={{ padding: 0 }}>
        <section className="room-status-strip surface-glass">
          <div>
            <p className="room-code-line">Opponent {opponent}</p>
            <h1>Turn: White</h1>
          </div>
          <div className="room-status-meta">
            <p className="socket-status">Preview connection stable</p>
            <p className="socket-status">Video chat connected (mock)</p>
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
              <button className="button-primary" type="button" disabled={!isVideoConnected} onClick={() => setShowSetupModal(true)}>
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
