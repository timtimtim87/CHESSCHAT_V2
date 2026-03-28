import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import LobbyPage from "./pages/LobbyPage";
import ProfilePage from "./pages/ProfilePage";
import RoomPage from "./pages/RoomPage";
import FriendsPage from "./pages/FriendsPage";
import HistoryPage from "./pages/HistoryPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { useAuth } from "./context/AuthContext";
import { AppSocketProvider } from "./context/AppSocketContext";
import { config } from "./config";
import { deleteCookie, getCookie } from "./utils/cookies";
import { isValidRoomCode } from "./utils/roomCode";
import { PreviewProvider, usePreview } from "./preview/PreviewContext";
import PreviewLandingPage from "./preview/pages/PreviewLandingPage";
import PreviewRegisterPage from "./preview/pages/PreviewRegisterPage";
import PreviewConfirmPage from "./preview/pages/PreviewConfirmPage";
import PreviewGamePage from "./preview/pages/PreviewGamePage";
import PreviewFriendsPage from "./preview/pages/PreviewFriendsPage";
import PreviewProfilePage from "./preview/pages/PreviewProfilePage";
import PreviewHistoryPage from "./preview/pages/PreviewHistoryPage";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function PreviewProtectedRoute({ children }) {
  const { state } = usePreview();
  if (!state.isAuthenticated) {
    return <Navigate to="/ui-preview/landing" replace />;
  }
  return children;
}

function PreviewAnonRoute({ children }) {
  const { state } = usePreview();
  if (state.isAuthenticated) {
    return <Navigate to="/ui-preview/game" replace />;
  }
  return children;
}

function PreviewRoot() {
  return (
    <PreviewProvider>
      <Outlet />
    </PreviewProvider>
  );
}

function PreviewRoutes() {
  return (
    <Route path="/ui-preview" element={<PreviewRoot />}>
      <Route index element={<Navigate to="/ui-preview/landing" replace />} />
      <Route
        path="landing"
        element={
          <PreviewAnonRoute>
            <PreviewLandingPage />
          </PreviewAnonRoute>
        }
      />
      <Route
        path="register"
        element={
          <PreviewAnonRoute>
            <PreviewRegisterPage />
          </PreviewAnonRoute>
        }
      />
      <Route
        path="confirm"
        element={
          <PreviewAnonRoute>
            <PreviewConfirmPage />
          </PreviewAnonRoute>
        }
      />
      <Route path="lobby" element={<Navigate to="/ui-preview/play" replace />} />
      <Route path="play" element={<Navigate to="/ui-preview/game" replace />} />
      <Route path="room" element={<Navigate to="/ui-preview/game" replace />} />
      <Route
        path="game"
        element={
          <PreviewProtectedRoute>
            <PreviewGamePage />
          </PreviewProtectedRoute>
        }
      />
      <Route
        path="profile"
        element={
          <PreviewProtectedRoute>
            <PreviewProfilePage />
          </PreviewProtectedRoute>
        }
      />
      <Route
        path="friends"
        element={
          <PreviewProtectedRoute>
            <PreviewFriendsPage />
          </PreviewProtectedRoute>
        }
      />
      <Route
        path="history"
        element={
          <PreviewProtectedRoute>
            <PreviewHistoryPage />
          </PreviewProtectedRoute>
        }
      />
    </Route>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/lobby" replace /> : <LandingPage />} />
      {PreviewRoutes()}
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
    if (!isValidRoomCode(pendingRoom || "")) {
      return;
    }

    deleteCookie(config.pendingRoomCookieName, { domain: ".chess-chat.com" });
    window.location.replace(`/room/${pendingRoom}`);
  }, [isAuthenticated, isPreviewPath]);

  return (
    <AppSocketProvider disabled={isPreviewPath}>
      <AppRoutes />
    </AppSocketProvider>
  );
}
