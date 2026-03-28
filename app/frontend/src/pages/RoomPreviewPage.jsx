import AppChrome from "../components/AppChrome";

export default function RoomPreviewPage() {
  return (
    <AppChrome profileName="GrandmasterDev" onLogout={() => null} basePath="/ui-preview">
      <header className="page-header">
        <div>
          <h1 className="page-title">Game Room (Preview)</h1>
          <p className="page-subtitle">Static UI preview for layout and visual feedback without live game services.</p>
        </div>
        <span className="page-chip">UI Preview</span>
      </header>

      <main className="room-shell" style={{ padding: 0 }}>
        <section className="room-status-strip surface-glass">
          <div>
            <p className="room-code-line">Room PREV1</p>
            <h1>Turn: White</h1>
          </div>
          <div className="room-status-meta">
            <p className="socket-status">Socket connected</p>
            <p className="socket-status">Latency 24ms</p>
          </div>
        </section>

        <section className="room-grid">
          <aside className="room-side room-side-left">
            <section className="video-panel">
              <div className="player-video-card">
                <div className="player-video-frame">
                  <div className="player-video-avatar">MC</div>
                </div>
                <div className="player-video-meta">
                  <p className="player-video-name">Magnus_C</p>
                  <p className="player-video-subtitle">White</p>
                  <div className="player-video-row">
                    <span className="status-dot is-online" />
                    <span className="player-video-clock">04:12</span>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <section className="game-panel surface-glass">
            <div className="game-header-row">
              <p className="turn-pill">White's Turn</p>
            </div>
            <div className="preview-board" style={{ marginTop: 0 }}>
              {Array.from({ length: 64 }).map((_, index) => (
                <div key={index} />
              ))}
            </div>
            <div className="clock-row">
              <p>
                <span className="status-dot is-online" />
                White 04:12
              </p>
              <p>
                <span className="status-dot is-online" />
                Black 08:45
              </p>
            </div>
            <div className="room-action-row">
              <button className="button-primary" disabled>
                Start Game
              </button>
              <button className="button-danger" disabled>
                Resign
              </button>
              <button className="button-secondary" disabled>
                Offer Draw
              </button>
            </div>
          </section>

          <aside className="room-side room-side-right">
            <section className="video-panel">
              <div className="player-video-card">
                <div className="player-video-frame">
                  <div className="player-video-avatar">GD</div>
                </div>
                <div className="player-video-meta">
                  <p className="player-video-name">GrandmasterDev</p>
                  <p className="player-video-subtitle">Black</p>
                  <div className="player-video-row">
                    <span className="status-dot is-online" />
                    <span className="player-video-clock">08:45</span>
                  </div>
                </div>
              </div>
              <div className="media-control-row">
                <button className="button-pill" disabled>
                  Join Media
                </button>
                <button className="button-pill" disabled>
                  Mute Mic
                </button>
                <button className="button-pill" disabled>
                  Camera Off
                </button>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </AppChrome>
  );
}
