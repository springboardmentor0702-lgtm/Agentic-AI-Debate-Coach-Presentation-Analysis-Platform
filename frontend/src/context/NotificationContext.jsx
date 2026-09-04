import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);
const POLL_INTERVAL_MS = 30000;

export function NotificationProvider({ children }) {
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/notifications");
      setItems(res.data.items);
      setUnreadCount(res.data.unread_count);
    } catch {
      // Notifications are a nice-to-have - never worth surfacing an
      // error banner for a failed background refresh.
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
    // No websockets in this project - a light poll keeps the unread
    // badge roughly current without needing real-time infrastructure.
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ items, unreadCount, loading, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return ctx;
}
