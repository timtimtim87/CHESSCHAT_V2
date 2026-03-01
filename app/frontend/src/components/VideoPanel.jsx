export default function VideoPanel({ status }) {
  return (
    <div className="video-panel">
      <h3>Video</h3>
      <p>{status}</p>
      <div className="video-grid">
        <div className="video-tile">Local video</div>
        <div className="video-tile">Remote video</div>
      </div>
    </div>
  );
}
