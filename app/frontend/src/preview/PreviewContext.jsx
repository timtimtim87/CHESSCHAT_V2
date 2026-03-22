import { createContext, useContext, useMemo, useState } from "react";
import {
  clearPreviewSession,
  createPreviewGame,
  createPreviewNotification,
  loadPreviewSession,
  savePreviewSession
} from "./previewSession";

const PreviewContext = createContext(null);

export function PreviewProvider({ children }) {
  const [state, setState] = useState(() => loadPreviewSession());

  function update(updater) {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      savePreviewSession(next);
      return next;
    });
  }

  function authenticate() {
    update((prev) => ({ ...prev, isAuthenticated: true }));
  }

  function setPreviewUser({ username, displayName }) {
    update((prev) => ({
      ...prev,
      user: {
        username: (username || prev.user.username).trim() || prev.user.username,
        displayName: (displayName || prev.user.displayName).trim() || prev.user.displayName
      }
    }));
  }

  function resetSession() {
    const next = clearPreviewSession();
    savePreviewSession(next);
    setState(next);
  }

  function markNotificationRead(id) {
    update((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => (item.id === id ? { ...item, read: true } : item))
    }));
  }

  function challengeFriend(friend) {
    if (!friend.online) {
      return { ok: false, message: `${friend.displayName} is offline right now.` };
    }

    const challengeId = `${friend.username}-${Date.now()}`;
    update((prev) => ({
      ...prev,
      pendingOutgoing: {
        id: challengeId,
        friend: friend.displayName,
        status: "sent"
      },
      notifications: [
        createPreviewNotification({
          type: "challenge",
          title: `Challenge from ${friend.displayName}`,
          body: "Join a mock game room from notifications.",
          actions: ["accept", "reject"],
          metadata: { challengeId, friend: friend.displayName }
        }),
        ...prev.notifications
      ]
    }));

    return { ok: true, message: `Challenge sent to ${friend.displayName}.` };
  }

  function handleChallengeAction(notificationId, action) {
    update((prev) => {
      const target = prev.notifications.find((item) => item.id === notificationId);
      if (!target) {
        return prev;
      }

      const trimmedNotifications = prev.notifications.filter((item) => item.id !== notificationId);
      const friend = target.metadata?.friend || "Friend";

      if (action === "accept") {
        return {
          ...prev,
          activeGame: createPreviewGame(friend),
          pendingOutgoing: null,
          notifications: [
            createPreviewNotification({
              type: "success",
              title: `Joined game vs ${friend}`,
              body: "Routing to Game screen.",
              metadata: { routeTo: "/ui-preview/game" }
            }),
            ...trimmedNotifications
          ]
        };
      }

      return {
        ...prev,
        pendingOutgoing: null,
        notifications: [
          createPreviewNotification({
            type: "info",
            title: `Challenge declined`,
            body: `${friend} rejected the challenge.`
          }),
          ...trimmedNotifications
        ]
      };
    });
  }

  function quickChallengeByUsername(username) {
    const opponent = username.trim();
    if (!opponent) {
      return { ok: false, message: "Enter a username first." };
    }

    update((prev) => ({
      ...prev,
      activeGame: createPreviewGame(opponent),
      pendingOutgoing: null,
      notifications: [
        createPreviewNotification({
          type: "success",
          title: `Quick challenge started`,
          body: `Mock room ready vs ${opponent}.`
        }),
        ...prev.notifications
      ]
    }));

    return { ok: true, message: `Starting mock game with ${opponent}.` };
  }

  function toggleSetting(key) {
    update((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: !prev.settings[key]
      }
    }));
  }

  const unreadCount = state.notifications.filter((item) => !item.read).length;

  const value = useMemo(
    () => ({
      state,
      unreadCount,
      authenticate,
      setPreviewUser,
      resetSession,
      challengeFriend,
      handleChallengeAction,
      markNotificationRead,
      quickChallengeByUsername,
      toggleSetting
    }),
    [state, unreadCount]
  );

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error("usePreview must be used within PreviewProvider");
  }
  return context;
}
