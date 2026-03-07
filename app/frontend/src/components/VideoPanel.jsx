function initialsFromName(name) {
  if (!name) {
    return "?";
  }
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function PlayerVideoCard({ name, role, clock, connected, isLocal, videoRef }) {
  return (
    <div className="player-video-card">
      <div className="player-video-frame">
        <video ref={videoRef} autoPlay={Boolean(videoRef)} muted={isLocal} playsInline />
        <div className="player-video-avatar" aria-hidden={Boolean(videoRef)}>
          {initialsFromName(name)}
        </div>
      </div>
      <div className="player-video-meta">
        <p className="player-video-name">{name}</p>
        <p className="player-video-subtitle">{role}</p>
        <div className="player-video-row">
          <span className={`status-dot ${connected ? "is-online" : "is-offline"}`} />
          <span className="player-video-clock">{clock}</span>
        </div>
      </div>
    </div>
  );
}

function MediaControlRow({
  canJoinMedia,
  mediaStarted,
  onJoinMedia,
  onToggleMic,
  onToggleCamera,
  isMicMuted,
  isCameraOn
}) {
  return (
    <div className="media-control-row">
      <button className="button-pill" onClick={onJoinMedia} disabled={mediaStarted || !canJoinMedia}>
        {mediaStarted ? "Media Connected" : "Join Media"}
      </button>
      <button className="button-pill" onClick={onToggleMic} disabled={!mediaStarted}>
        {isMicMuted ? "Unmute Mic" : "Mute Mic"}
      </button>
      <button className="button-pill" onClick={onToggleCamera} disabled={!mediaStarted}>
        {isCameraOn ? "Camera Off" : "Camera On"}
      </button>
    </div>
  );
}

export default function VideoPanel({
  playerName,
  playerRole,
  clock,
  connected,
  isLocalPlayer,
  videoRef,
  canJoinMedia,
  mediaStarted,
  onJoinMedia,
  onToggleMic,
  onToggleCamera,
  isMicMuted,
  isCameraOn,
  mediaStatus,
  error
}) {
  return (
    <section className="video-panel">
      <PlayerVideoCard
        name={playerName}
        role={playerRole}
        clock={clock}
        connected={connected}
        isLocal={isLocalPlayer}
        videoRef={videoRef}
      />
      {isLocalPlayer ? (
        <>
          <MediaControlRow
            canJoinMedia={canJoinMedia}
            mediaStarted={mediaStarted}
            onJoinMedia={onJoinMedia}
            onToggleMic={onToggleMic}
            onToggleCamera={onToggleCamera}
            isMicMuted={isMicMuted}
            isCameraOn={isCameraOn}
          />
          <p className="media-status-line">{mediaStatus}</p>
          {error ? <p className="media-error-line">{error}</p> : null}
        </>
      ) : (
        <p className="media-status-line">{connected ? "Opponent connected" : "Opponent disconnected"}</p>
      )}
    </section>
  );
}
