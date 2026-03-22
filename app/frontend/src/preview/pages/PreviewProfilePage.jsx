import PreviewLayout from "../PreviewLayout";
import { usePreview } from "../PreviewContext";

export default function PreviewProfilePage() {
  const { state } = usePreview();

  return (
    <PreviewLayout>
      <header className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Preview profile card and stats placeholders.</p>
        </div>
        <span className="page-chip">UI Preview</span>
      </header>
      <section className="profile-page">
        <article className="profile-main panel surface-glass">
          <div className="profile-hero">
            <div className="profile-avatar">{state.user.displayName.slice(0, 2).toUpperCase()}</div>
            <div>
              <h2 className="profile-name">{state.user.displayName}</h2>
              <p className="profile-joined">@{state.user.username}</p>
            </div>
          </div>
          <div className="profile-stats-row" style={{ marginTop: 14 }}>
            <div className="stat-card">
              <p className="label">Games</p>
              <p className="value">60</p>
            </div>
            <div className="stat-card">
              <p className="label">Wins</p>
              <p className="value">42</p>
            </div>
            <div className="stat-card">
              <p className="label">Losses</p>
              <p className="value">11</p>
            </div>
          </div>
        </article>
      </section>
    </PreviewLayout>
  );
}

