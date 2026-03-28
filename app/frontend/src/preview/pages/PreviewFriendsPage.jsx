import { useState } from "react";
import PreviewLayout from "../PreviewLayout";
import { usePreview } from "../PreviewContext";

export default function PreviewFriendsPage() {
  const { state, challengeFriend } = usePreview();
  const [message, setMessage] = useState("");

  function playNow(friend) {
    const result = challengeFriend(friend);
    setMessage(result.message);
  }

  return (
    <PreviewLayout>
      <header className="page-header">
        <div>
          <h1 className="page-title">Friends</h1>
          <p className="page-subtitle">Primary path for starting games in preview mode.</p>
        </div>
        <span className="page-chip">Friends-first</span>
      </header>

      <section className="friends-layout">
        <article className="panel surface-glass">
          <h3>Friends Hub</h3>
          <div className="friend-list">
            {state.friends.map((friend) => (
              <div className="friend-row" key={friend.username}>
                <div className="friend-meta">
                  <div className="avatar-chip">{friend.displayName.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <p className="friend-name">{friend.displayName}</p>
                    <p className="friend-subtext">
                      Rating {friend.elo} - {friend.status}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`tag ${friend.online ? "ui-ready" : "api-missing"}`}>{friend.online ? "ONLINE" : "OFFLINE"}</span>
                  <button className="button-primary" onClick={() => playNow(friend)}>
                    Play Now
                  </button>
                </div>
              </div>
            ))}
          </div>
          {message ? <p className="landing-note">{message}</p> : null}
        </article>

        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="panel surface-glass">
            <h3>Pending Friend Requests</h3>
            <ul className="stub-list">
              <li className="stub-item">
                <span>chess_ally_17 wants to connect</span>
                <div className="preview-row-actions">
                  <button className="button-primary" type="button">
                    Accept
                  </button>
                  <button className="button-secondary" type="button">
                    Decline
                  </button>
                </div>
              </li>
              <li className="stub-item">
                <span>rookandroll sent request</span>
                <span className="tag ui-ready">NEW</span>
              </li>
            </ul>
          </section>

          <section className="panel surface-glass">
            <h3>Invite Friends</h3>
            <p>Share invite links or send platform invites. Visual mock for now.</p>
            <div className="preview-row-actions">
              <button className="button-primary" type="button">
                Copy Invite Link
              </button>
              <button className="button-secondary" type="button">
                Send Invite
              </button>
            </div>
          </section>
        </aside>
      </section>
    </PreviewLayout>
  );
}
