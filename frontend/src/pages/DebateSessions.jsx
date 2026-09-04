import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, Download, CalendarClock, Check, X, Users, Bot, Shuffle, Swords } from "lucide-react";
import { api } from "../lib/api";
import { useNotifications } from "../context/NotificationContext";
import Spinner, { LoadingBlock } from "../components/Spinner";
import { downloadFile } from "../lib/downloadFile";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";

const selectClass =
  "w-full bg-glass border border-glass-border backdrop-blur-xl rounded-xl px-4 py-3 text-base text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function DebateSessions() {
  const navigate = useNavigate();
  const { refresh: refreshNotifications } = useNotifications();
  const [searchParams] = useSearchParams();

  const [sessions, setSessions] = useState([]);
  const [invites, setInvites] = useState([]);
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [topic, setTopic] = useState(searchParams.get("suggested_topic") || "");
  const [format, setFormat] = useState("one_on_one");
  const [userPosition, setUserPosition] = useState("For");
  const [roundsTarget, setRoundsTarget] = useState("3");
  const [opponentUsername, setOpponentUsername] = useState("");
  const [usernameCheck, setUsernameCheck] = useState({ status: "idle", name: null });

  // Purely informational - never gates or blocks submission. Debounced
  // with cancellation so a slow, superseded request can't overwrite a
  // newer result, and so it doesn't fire on every keystroke.
  useEffect(() => {
    const username = opponentUsername.trim();
    if (!username) {
      setUsernameCheck({ status: "idle", name: null });
      return;
    }
    setUsernameCheck({ status: "checking", name: null });
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/profiles/search", { params: { username } });
        if (!cancelled) setUsernameCheck({ status: "found", name: res.data.full_name });
      } catch {
        if (!cancelled) setUsernameCheck({ status: "not_found", name: null });
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [opponentUsername]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [pickingTopic, setPickingTopic] = useState(false);

  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.get("/debates/sessions"),
      api.get("/debates/invites"),
      api.get("/debates/formats"),
    ])
      .then(([sessionsRes, invitesRes, formatsRes]) => {
        setSessions(sessionsRes.data);
        setInvites(invitesRes.data);
        setFormats(formatsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSurpriseMe = async () => {
    setPickingTopic(true);
    try {
      const res = await api.get("/topics/random");
      setTopic(res.data.topic);
    } catch {
      // no topics available - the field just stays as it was
    } finally {
      setPickingTopic(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await api.post("/debates/sessions", {
        topic,
        format,
        user_position: userPosition,
        rounds_target: Number(roundsTarget),
        opponent_username: opponentUsername || null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      });
      if (opponentUsername) {
        setTopic("");
        setOpponentUsername("");
        loadAll();
      } else {
        navigate(`/debates/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create that debate.");
    } finally {
      setCreating(false);
    }
  };

  const handleRespondInvite = async (invite, accept) => {
    try {
      await api.post(`/debates/sessions/${invite.id}/respond`, { accept });
      loadAll();
      refreshNotifications();
      if (accept) navigate(`/debates/${invite.id}`);
    } catch {
      loadAll();
    }
  };

  const handleDelete = async (e, session) => {
    e.preventDefault();
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    try {
      await api.delete(`/debates/sessions/${session.id}`);
    } catch {
      loadAll();
    }
  };

  const handleDownload = (e, session) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFile(
      `/reports/item/debates/${session.id}/pdf`,
      `debate-session-${session.id.slice(0, 8)}.pdf`
    );
  };

  const startEditSchedule = (e, session) => {
    e.preventDefault();
    e.stopPropagation();
    setScheduleDraft(toDatetimeLocalValue(session.scheduled_for));
    setEditingScheduleId(session.id);
  };

  const cancelEditSchedule = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingScheduleId(null);
  };

  const saveSchedule = async (e, session) => {
    e.preventDefault();
    e.stopPropagation();
    setSavingSchedule(true);
    try {
      const res = await api.patch(`/debates/sessions/${session.id}/schedule`, {
        scheduled_for: scheduleDraft ? new Date(scheduleDraft).toISOString() : null,
      });
      setSessions((prev) => prev.map((s) => (s.id === session.id ? res.data : s)));
      refreshNotifications();
    } catch {
      loadAll();
    } finally {
      setSavingSchedule(false);
      setEditingScheduleId(null);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="rounded-xl bg-accent-soft p-2.5">
          <Swords size={20} className="text-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-4xl">Argue it out.</h1>
      </motion.div>

      <div className="max-w-3xl mx-auto">
        {invites.length > 0 && (
          <div className="mb-10">
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase mb-4">
              Debate invites
            </h2>
            <div className="border border-accent/40 rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border overflow-hidden">
              {invites.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm">{inv.topic}</p>
                    <p className="font-mono text-xs text-faint uppercase">
                      Invited you to debate {inv.ai_position} it
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRespondInvite(inv, true)}
                      className="font-mono text-xs uppercase tracking-wide bg-accent text-surface px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondInvite(inv, false)}
                      className="font-mono text-xs uppercase tracking-wide text-faint hover:text-danger transition-colors px-2"
                    >
                      Decline
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <GlassCard className="p-5 mb-10">
        <form onSubmit={handleCreate} className="space-y-4">
          <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-1">
            Start a debate
          </h2>
          <div className="flex gap-2">
            <GlassField
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic — e.g. This house believes social media should be regulated"
              className="flex-1"
            />
            <GlassButton
              type="button"
              onClick={handleSurpriseMe}
              variant="glass"
              disabled={pickingTopic}
              title="Pick a random topic from the library"
              className="shrink-0"
            >
              {pickingTopic ? (
                <Spinner size={12} className="border-faint/40 border-t-faint" />
              ) : (
                <Shuffle size={14} />
              )}
              Surprise me
            </GlassButton>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <select value={format} onChange={(e) => setFormat(e.target.value)} className={selectClass}>
              {(formats.length ? formats : [{ key: "one_on_one", label: "One-on-One" }]).map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select value={userPosition} onChange={(e) => setUserPosition(e.target.value)} className={selectClass}>
              <option value="For">I'll argue For</option>
              <option value="Against">I'll argue Against</option>
            </select>
          </div>

          <label className="block">
            <span className="block font-mono text-xs text-faint uppercase tracking-wide mb-1.5">
              Number of rounds
            </span>
            <select value={roundsTarget} onChange={(e) => setRoundsTarget(e.target.value)} className={selectClass}>
              <option value="1">1 round</option>
              <option value="3">3 rounds</option>
              <option value="5">5 rounds</option>
              <option value="7">7 rounds</option>
            </select>
          </label>

          <GlassField
            label="Opponent (optional)"
            value={opponentUsername}
            onChange={(e) => setOpponentUsername(e.target.value)}
            placeholder="Leave blank to debate the AI, or enter a username to invite a real person"
          />
          {usernameCheck.status === "checking" && (
            <p className="text-xs text-faint -mt-2 flex items-center gap-1.5">
              <Spinner size={10} className="border-faint/40 border-t-faint" /> Checking...
            </p>
          )}
          {usernameCheck.status === "found" && (
            <p className="text-xs text-ok -mt-2 flex items-center gap-1.5">
              <Check size={12} /> Found {usernameCheck.name}
            </p>
          )}
          {usernameCheck.status === "not_found" && (
            <p className="text-xs text-faint -mt-2">
              No user found with that username — you can still try creating the invite.
            </p>
          )}

          <GlassField
            label="Schedule for later (optional)"
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <GlassButton type="submit" variant="primary" disabled={creating}>
            {creating ? (
              <Spinner size={12} className="border-surface/40 border-t-surface" />
            ) : opponentUsername ? (
              "Send invite"
            ) : (
              "Start debating the AI"
            )}
          </GlassButton>
        </form>
      </GlassCard>

      {loading && <LoadingBlock />}

      {!loading && sessions.length === 0 && (
        <p className="text-sm text-faint">No debates yet — start one above.</p>
      )}

      {!loading && sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border overflow-hidden"
        >
          {sessions.map((s, i) =>
            editingScheduleId === s.id ? (
              <div key={s.id} className="px-4 py-3 bg-glass-strong">
                <p className="text-sm truncate mb-2">{s.topic}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleDraft}
                    onChange={(e) => setScheduleDraft(e.target.value)}
                    className="flex-1 bg-surface border border-glass-border rounded-xl px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={(e) => saveSchedule(e, s)}
                    disabled={savingSchedule}
                    aria-label="Save schedule"
                    className="text-ok hover:opacity-80 disabled:opacity-40 transition-opacity shrink-0"
                  >
                    {savingSchedule ? <Spinner size={16} /> : <Check size={18} />}
                  </button>
                  <button
                    onClick={cancelEditSchedule}
                    aria-label="Cancel"
                    className="text-faint hover:text-ink transition-colors shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="font-mono text-[10px] text-faint mt-1.5">
                  Leave blank and save to clear the schedule.
                </p>
              </div>
            ) : (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
              >
                <Link
                  to={`/debates/${s.id}`}
                  className="group flex items-start gap-2 px-4 py-3 hover:bg-glass-strong transition-colors"
                >
                  <div className="mt-0.5 text-faint shrink-0">
                    {s.mode === "human_vs_human" ? <Users size={14} /> : <Bot size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{s.topic}</p>
                    <p className="font-mono text-xs text-faint uppercase mt-0.5">
                      {s.user_position} · {s.round_count} round{s.round_count === 1 ? "" : "s"} ·{" "}
                      {s.mode === "human_vs_human"
                        ? s.invite_status === "pending"
                          ? "invite pending"
                          : s.invite_status === "declined"
                          ? "declined"
                          : "vs. opponent"
                        : "vs. AI"}
                      {s.scheduled_for &&
                        ` · scheduled ${new Date(s.scheduled_for).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    <button
                      onClick={(e) => startEditSchedule(e, s)}
                      aria-label="Edit schedule"
                      className="text-faint hover:text-accent transition-colors"
                    >
                      <CalendarClock size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDownload(e, s)}
                      aria-label="Download this debate as a PDF"
                      className="text-faint hover:text-accent transition-colors"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, s)}
                      aria-label="Delete this debate"
                      className="text-faint hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Link>
              </motion.div>
            )
          )}
        </motion.div>
      )}
      </div>
    </div>
  );
}
