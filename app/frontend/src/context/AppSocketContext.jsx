import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ChessChatSocket } from "../services/socket";
import { useAuth } from "./AuthContext";

export const AppSocketContext = createContext(null);

export function AppSocketProvider({ children, disabled = false }) {
  const { isAuthenticated, getValidToken } = useAuth();
  const socketRef = useRef(null);
  const listenersRef = useRef(new Set());
  const [socketState, setSocketState] = useState({
    status: "idle",
    reconnectAttempt: 0,
    retryInMs: 0,
    connectionSerial: 0
  });

  useEffect(() => {
    if (disabled || !isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketState({
        status: "idle",
        reconnectAttempt: 0,
        retryInMs: 0,
        connectionSerial: 0
      });
      return;
    }

    const socket = new ChessChatSocket({
      getToken: getValidToken,
      onStateChange: (next) => {
        setSocketState((prev) => ({
          status: next.status,
          reconnectAttempt: next.reconnectAttempt || 0,
          retryInMs: next.retryInMs || 0,
          connectionSerial:
            next.status === "connected" && prev.status !== "connected"
              ? prev.connectionSerial + 1
              : prev.connectionSerial
        }));
      },
      onMessage: (payload) => {
        listenersRef.current.forEach((listener) => listener(payload));
      }
    });

    socketRef.current = socket;
    void socket.connect();

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [disabled, isAuthenticated, getValidToken]);

  const value = useMemo(
    () => ({
      socketState,
      send: (type, payload = {}) => {
        socketRef.current?.send(type, payload);
      },
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      }
    }),
    [socketState]
  );

  return <AppSocketContext.Provider value={value}>{children}</AppSocketContext.Provider>;
}

export function useAppSocket() {
  const context = useContext(AppSocketContext);
  if (!context) {
    throw new Error("useAppSocket must be used inside AppSocketProvider");
  }
  return context;
}
