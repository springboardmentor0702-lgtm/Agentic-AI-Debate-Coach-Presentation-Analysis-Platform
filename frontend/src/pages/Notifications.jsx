import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, Clock } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import Spinner, { LoadingBlock } from "../components/Spinner";

const TYPE_LABELS = {
  debate_result: "Debate",
  coaching_ready: "Coaching",
  milestone: "Milestone",
  announcement: "Announcement",
};

const inputClass =
  "w-full bg-surface-2 border border-line rounded-sm px-3 py-2.5 text-base text-ink focus:outline-none focus:border-accent transition-colors";

function isRealNotificationId(id) {
  return !id.startsWith("reminder-") && !id.startsWith("announcement-");
}

/**
 * Header row (type badge + unread dot) sits on its own line above the
 * title/message/date - deliberately not a side-by-side flex column
 * with the text, since a fixed-width badge next to variable-length
 * text is exactly what caused the earlier alignment bug (badge height
 * and text baseline never quite lined up, and long messages made it
 * worse). Stacking removes the failure mode entirely.
 */
function NotificationRow({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-4 transition-colors ${
        item.link ? "cursor-pointer hover:bg-surface-2" : ""
      } ${!item.read ? "bg-accent-soft/40" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-faint border border-line rounded-sm px-1.5 py-0.5">
          {TYPE_LABELS[item.type] || item.type}
        </span>
        {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
      </div>
      <p className="text-sm">{item.title}</p>
      <p className="text-xs text-faint mt-0.5">
        {item.message}
        {item.scheduled_for && (
          <>
            {" "}
            <span className="text-ink">
              {new Date(item.scheduled_for).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </>
        )}
      </p>
      <p className="font-mono text-[10px] text-faint mt-1.5">
        {new Date(item.created_at).toLocaleString()}
      </p>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { items, loading, refresh } = useNotifications();
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [announceError, setAnnounceError] = useState(null);
  const [announcing, setAnnouncing] = useState(false);

  const reminders = items.filter((i) => i.type === "reminder");
  const notifications = items.filter((i) => i.type !== "reminder");

  const handleClick = async (item) => {
    if (item.link) navigate(item.link);
    if (!item.read && isRealNotificationId(item.id)) {
      try {
        await api.patch(`/notifications/${item.id}/read`);
        refresh();
      } catch {
        // non-critical
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      refresh();
    } catch {
      // non-critical
    }
  };

  const handleAnnounce = async (e) => {
    e.preventDefault();
    setAnnounceError(null);
    setAnnouncing(true);
    try {
      await api.post("/notifications/announcements", {
        title: announceTitle,
        message: announceMessage,
      });
      setAnnounceTitle("");
      setAnnounceMessage("");
      refresh();
    } catch (err) {
      setAnnounceError(err.response?.data?.detail || "Could not post announcement.");
    } finally {
      setAnnouncing(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-4xl mb-2">Notifications.</h1>
      <p className="text-faint mb-10">
        Reminders need action from you. Notifications are things that already
        happened.
      </p>

      {profile?.role === "admin" && (
        <form
          onSubmit={handleAnnounce}
          className="border border-line rounded-sm p-5 mb-10 space-y-3"
        >
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            Post an announcement
          </p>
          <input
            required
            value={announceTitle}
            onChange={(e) => setAnnounceTitle(e.target.value)}
            placeholder="Title"
            className={inputClass}
          />
          <textarea
            required
            rows={2}
            value={announceMessage}
            onChange={(e) => setAnnounceMessage(e.target.value)}
            placeholder="Message"
            className={inputClass}
          />
          {announceError && <p className="text-sm text-danger">{announceError}</p>}
          <button
            type="submit"
            disabled={announcing}
            className="font-mono text-xs uppercase tracking-wide bg-accent text-surface px-4 py-2.5 rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {announcing ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={12} className="border-surface/40 border-t-surface" />
                Posting...
              </span>
            ) : (
              "Post to everyone"
            )}
          </button>
        </form>
      )}

      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-10">
          {reminders.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest text-accent uppercase mb-4 flex items-center gap-2">
                <Clock size={12} />
                Reminders — needs your action
              </h2>
              <div className="border border-accent/30 rounded-sm divide-y divide-line">
                {reminders.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onClick={() => handleClick(item)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-xs tracking-widest text-faint uppercase">
                Notifications
              </h2>
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="font-mono text-xs uppercase tracking-wide text-faint hover:text-accent transition-colors flex items-center gap-1.5"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-faint">Nothing here yet.</p>
            ) : (
              <div className="border border-line rounded-sm divide-y divide-line">
                {notifications.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onClick={() => handleClick(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
