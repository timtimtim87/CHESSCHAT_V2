import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppChrome from "../components/AppChrome";
import { useAuth } from "../context/AuthContext";

export default function FriendsPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState("...");
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!accessToken) return;
    const [meRes, friendsRes, requestsRes] = await Promise.all([
      fetch("/api/me", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/friends", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/friends/requests", { headers: { Authorization: `Bearer ${accessToken}` } })
    ]);
    const mePayload = await meRes.json();
    const friendsPayload = await friendsRes.json();
    const requestsPayload = await requestsRes.json();
    if (meRes.ok) {
      setProfileName(mePayload.user?.display_name || mePayload.user?.username || "...");
    }
    if (friendsRes.ok) {
      setFriends(friendsPayload.friends || []);
    }
    if (requestsRes.ok) {
      setReceivedRequests(requestsPayload.received || []);
    }
  }

  useEffect(() => {
    void refresh();
  }, [accessToken]);

  async function sendInvite(e) {
    e.preventDefault();
    setMessage("");
    const username = inviteUsername.trim().toLowerCase();
    if (!username) return;
    const response = await fetch("/api/friends/requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload?.error?.message || "Unable to send invite.");
      return;
    }
    setInviteUsername("");
    setMessage("Friend request sent.");
  }

  async function respondRequest(requestId, action) {
    const response = await fetch(`/api/friends/requests/${requestId}/respond`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action })
    });
    if (response.ok) {
      await refresh();
    }
  }

  async function challengeFriend(username) {
    const response = await fetch("/api/challenges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload?.error?.message || "Unable to challenge.");
      return;
    }
    navigate(`/room/${payload.challenge.room_code}`);
  }

  return (
    <AppChrome profileName={profileName} onLogout={logout}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Friends Hub</h1>
          <p className="page-subtitle">Challenge friends, manage requests, and send invites.</p>
        </div>
        <span className="page-chip">Live API</span>
      </header>

      <section className="friends-layout">
        <article className="panel surface-glass">
          <h3>Friends</h3>
          <div className="friend-list">
            {friends.length === 0 ? <p className="friend-subtext">No friends added yet.</p> : null}
            {friends.map((friend) => (
              <div className="friend-row" key={`${friend.user_id}-${friend.friend_user_id}`}>
                <div className="friend-meta">
                  <div className="avatar-chip">{(friend.friend_username || "??").slice(0, 2).toUpperCase()}</div>
                  <div>
                    <p className="friend-name">{friend.friend_username || friend.friend_user_id}</p>
                    <p className="friend-subtext">Online status is in-app only for v1.</p>
                  </div>
                </div>
                <button className="button-primary" onClick={() => challengeFriend(friend.friend_username)}>
                  Play Now
                </button>
              </div>
            ))}
          </div>
        </article>

        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="panel surface-glass">
            <h3>Pending Friend Requests</h3>
            <ul className="stub-list">
              {receivedRequests.length === 0 ? <li className="stub-item">No pending requests.</li> : null}
              {receivedRequests.map((request) => (
                <li className="stub-item" key={request.request_id}>
                  <span>{request.sender_username || request.sender_user_id}</span>
                  <div className="preview-row-actions">
                    <button className="button-primary" onClick={() => respondRequest(request.request_id, "accept")}>
                      Accept
                    </button>
                    <button className="button-secondary" onClick={() => respondRequest(request.request_id, "decline")}>
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel surface-glass">
            <h3>Invite Friends</h3>
            <form className="form-row" onSubmit={sendInvite}>
              <input
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="friend_username"
                aria-label="Invite username"
              />
              <button className="button-primary" type="submit">
                Send Invite
              </button>
            </form>
            {message ? <p className="landing-note">{message}</p> : null}
          </section>
        </aside>
      </section>
    </AppChrome>
  );
}
