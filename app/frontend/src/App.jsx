import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import LobbyPage from "./pages/LobbyPage";
import ProfilePage from "./pages/ProfilePage";
import RoomPage from "./pages/RoomPage";
import FriendsPage from "./pages/FriendsPage";
import HistoryPage from "./pages/HistoryPage";
import RoomPreviewPage from "./pages/RoomPreviewPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { useAuth } from "./context/AuthContext";
import { config } from "./config";
import { deleteCookie, getCookie } from "./utils/cookies";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const isPreviewPath = window.location.pathname.startsWith("/ui-preview");

  useEffect(() => {
    if (isPreviewPath) {
      return;
    }
    if (!isAuthenticated) {
      return;
    }

    const pendingRoom = getCookie(config.pendingRoomCookieName);
    if (!/^[A-Z0-9]{5}$/.test(pendingRoom || "")) {
      return;
    }

    deleteCookie(config.pendingRoomCookieName, { domain: ".chess-chat.com" });
    window.location.replace(`/room/${pendingRoom}`);
  }, [isAuthenticated, isPreviewPath]);

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/lobby" replace /> : <LandingPage />} />
      <Route path="/ui-preview" element={<Navigate to="/ui-preview/lobby" replace />} />
      <Route path="/ui-preview/landing" element={<LandingPage preview />} />
      <Route path="/ui-preview/lobby" element={<LobbyPage preview />} />
      <Route path="/ui-preview/profile" element={<ProfilePage preview />} />
      <Route path="/ui-preview/friends" element={<FriendsPage preview />} />
      <Route path="/ui-preview/history" element={<HistoryPage preview />} />
      <Route path="/ui-preview/room" element={<RoomPreviewPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <LobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <FriendsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:code"
        element={
          <ProtectedRoute>
            <RoomPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
