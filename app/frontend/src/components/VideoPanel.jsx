export default function VideoPanel({
  status,
  mediaStarted,
  onJoinMedia,
  onToggleMic,
  onToggleCamera,
  isMicMuted,
  isCameraOn,
  localVideoRef,
  remoteVideoRef,
  error
}) {
  return (
    <div className="video-panel">
      <h3>Video</h3>
      <p>{status}</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="controls">
        <button className="primary" onClick={onJoinMedia} disabled={mediaStarted}>
          {mediaStarted ? "Media Connected" : "Join Media"}
        </button>
        <button onClick={onToggleMic} disabled={!mediaStarted}>
          {isMicMuted ? "Unmute Mic" : "Mute Mic"}
        </button>
        <button onClick={onToggleCamera} disabled={!mediaStarted}>
          {isCameraOn ? "Stop Camera" : "Start Camera"}
        </button>
      </div>
      <div className="video-grid">
        <div className="video-tile">
          <video ref={localVideoRef} autoPlay muted playsInline />
          <span>Local</span>
        </div>
        <div className="video-tile">
          <video ref={remoteVideoRef} autoPlay playsInline />
          <span>Remote</span>
        </div>
      </div>
    </div>
  );
}
