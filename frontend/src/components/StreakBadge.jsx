import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { api } from "../lib/api";

/**
 * Self-contained - fetches its own data, renders nothing while
 * loading or on error rather than showing a broken placeholder.
 * Drop <StreakBadge /> anywhere on the Dashboard; it doesn't need any
 * props or access to the page's existing state.
 */
export default function StreakBadge() {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    api
      .get("/streaks/me")
      .then((res) => setStreak(res.data))
      .catch(() => setStreak(null));
  }, []);

  if (!streak) return null;

  return (
    <div className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Flame
          size={20}
          className={streak.current_streak > 0 ? "text-accent" : "text-faint"}
          fill={streak.current_streak > 0 ? "currentColor" : "none"}
        />
        <div>
          <p className="text-sm">
            {streak.current_streak > 0
              ? `${streak.current_streak}-day streak`
              : "No active streak yet"}
          </p>
          {streak.longest_streak > streak.current_streak && (
            <p className="font-mono text-xs text-faint">
              Best: {streak.longest_streak} day{streak.longest_streak === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {streak.show_inactivity_reminder && (
        <p className="text-xs text-faint text-right max-w-[12rem]">
          It's been {streak.days_since_last_activity} days — jump back in?
        </p>
      )}
    </div>
  );
}
