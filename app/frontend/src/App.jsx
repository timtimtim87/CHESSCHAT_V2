import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LobbyPage from "./pages/LobbyPage";
import RoomPage from "./pages/RoomPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/lobby" replace /> : <LandingPage />} />
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
