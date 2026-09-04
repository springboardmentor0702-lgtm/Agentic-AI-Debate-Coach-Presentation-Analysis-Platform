import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { LoadingBlock } from "../components/Spinner";
import Spinner from "../components/Spinner";
import ScoreBar from "../components/ScoreBar";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";

const METRIC_OPTIONS = [
  { value: "overall_score", label: "Overall Score" },
  { value: "argument_quality", label: "Argument Quality" },
  { value: "evidence_usage", label: "Evidence Usage" },
  { value: "logical_consistency", label: "Logical Consistency" },
  { value: "rebuttal_effectiveness", label: "Rebuttal Effectiveness" },
  { value: "communication_skills", label: "Communication Skills" },
];

const selectClass =
  "w-full bg-glass border border-glass-border backdrop-blur-xl rounded-xl px-4 py-3 text-base text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

function activityTitle(item) {
  return item.topic || item.input_text?.slice(0, 60) || item.transcript?.slice(0, 60) || "Untitled";
}

function activityDomId(kind, id) {
  return `activity-${kind}-${id}`;
}

function FeedbackForm({ item, onSubmit, onCancel }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(item, text);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <GlassField
        multiline
        required
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write feedback for this piece of work..."
      />
      <div className="flex items-center gap-2">
        <GlassButton type="submit" variant="primary" disabled={saving} className="!px-3 !py-1.5">
          {saving ? <Spinner size={12} className="border-surface/40 border-t-surface" /> : "Send"}
        </GlassButton>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-xs uppercase tracking-wide text-faint hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function LearnerDetail() {
  const { id } = useParams();
  const { profile: currentProfile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackTargetId, setFeedbackTargetId] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [highlightedActivity, setHighlightedActivity] = useState(null);

  // Assign goal form
  const [goalMetric, setGoalMetric] = useState("overall_score");
  const [goalTarget, setGoalTarget] = useState("8.0");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [assigningGoal, setAssigningGoal] = useState(false);
  const [goalError, setGoalError] = useState(null);
  const [goalSuccess, setGoalSuccess] = useState(false);

  // Suggest topic form
  const [topic, setTopic] = useState("");
  const [suggestingTopic, setSuggestingTopic] = useState(false);
  const [topicError, setTopicError] = useState(null);
  const [topicSuccess, setTopicSuccess] = useState(false);

  const highlightTimeoutRef = useRef(null);

  const load = () => {
    setLoading(true);
    api
      .get(`/dashboards/coach/students/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load this learner."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    return () => clearTimeout(highlightTimeoutRef.current);
  }, [id]);

  const handleLeaveFeedback = async (item, text) => {
    try {
      const res = await api.post(`/dashboards/coach/students/${id}/feedback`, {
        item_type: item.kind,
        item_id: item.id,
        feedback_text: text,
      });
      setFeedbackTargetId(null);

      // Optimistic update - build the enriched entry locally instead
      // of re-fetching everything (performance + activity + feedback),
      // which previously caused the whole page to flash/reload for
      // what should be a small, quiet action.
      const newEntry = {
        id: res.data.id,
        item_type: item.kind,
        item_id: item.id,
        coach_name: currentProfile?.full_name || "You",
        tool_label: item.tool_label,
        item_title: activityTitle(item),
        feedback_text: text,
        created_at: res.data.created_at || new Date().toISOString(),
      };
      setData((prev) => ({ ...prev, feedback: [newEntry, ...prev.feedback] }));

      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch {
      // form stays open so they can retry
    }
  };

  const handleFeedbackEntryClick = (entry) => {
    const domId = activityDomId(entry.item_type, entry.item_id);
    const el = document.getElementById(domId);
    if (!el) return; // the item may have since been deleted by the learner
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedActivity(domId);
    clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedActivity(null), 2000);
  };

  const handleAssignGoal = async (e) => {
    e.preventDefault();
    setGoalError(null);
    setGoalSuccess(false);
    setAssigningGoal(true);
    try {
      await api.post(`/dashboards/coach/students/${id}/goals`, {
        metric: goalMetric,
        target_value: parseFloat(goalTarget),
        deadline: goalDeadline || null,
      });
      setGoalSuccess(true);
    } catch (err) {
      setGoalError(err.response?.data?.detail || "Could not assign that goal.");
    } finally {
      setAssigningGoal(false);
    }
  };

  const handleSuggestTopic = async (e) => {
    e.preventDefault();
    setTopicError(null);
    setTopicSuccess(false);
    setSuggestingTopic(true);
    try {
      await api.post(`/dashboards/coach/students/${id}/suggest-topic`, { topic });
      setTopic("");
      setTopicSuccess(true);
    } catch (err) {
      setTopicError(err.response?.data?.detail || "Could not send that suggestion.");
    } finally {
      setSuggestingTopic(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <div>
        <p className="text-sm text-danger mb-4">{error}</p>
        <Link to="/coach-dashboard" className="font-mono text-xs text-faint hover:text-ink">
          ← Back to all learners
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const { profile, performance, activity, feedback } = data;

  return (
    <div>
      <Link
        to="/coach-dashboard"
        className="font-mono text-xs text-faint hover:text-ink transition-colors"
      >
        ← All learners
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-4xl mt-4 mb-1">{profile.full_name}</h1>
        <p className="text-faint mb-10">{profile.experience_level || "Unspecified experience"}</p>
      </motion.div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-10 items-start">
        <div>
          <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
            Performance breakdown
          </h2>
          <GlassCard className="p-5 mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-mono text-xs text-faint uppercase">Overall</span>
              <span className="font-mono text-lg text-accent">
                {performance.overall_score !== null ? `${performance.overall_score.toFixed(1)}/10` : "—"}
              </span>
            </div>
            <div className="space-y-3">
              {performance.components
                .filter((c) => c.has_data)
                .map((c) => (
                  <ScoreBar key={c.key} label={c.label} value={c.score} />
                ))}
            </div>
          </GlassCard>

          <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-sm text-faint">No activity yet.</p>
          ) : (
            <div className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border overflow-hidden mb-10">
              {activity.map((item) => {
                const domId = activityDomId(item.kind, item.id);
                return (
                  <div
                    key={domId}
                    id={domId}
                    className={`px-4 py-3 transition-colors duration-500 ${
                      highlightedActivity === domId ? "bg-accent-soft" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] uppercase tracking-wide text-faint border border-glass-border rounded-full px-1.5 py-0.5 mr-2">
                          {item.tool_label}
                        </span>
                        <span className="text-sm">{activityTitle(item)}</span>
                      </div>
                      <button
                        onClick={() => setFeedbackTargetId(item.id)}
                        aria-label="Leave feedback"
                        className="shrink-0 text-faint hover:text-accent transition-colors"
                      >
                        <MessageSquarePlus size={16} />
                      </button>
                    </div>
                    {feedbackTargetId === item.id && (
                      <FeedbackForm
                        item={item}
                        onSubmit={handleLeaveFeedback}
                        onCancel={() => setFeedbackTargetId(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <GlassCard className="p-5">
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase mb-4">
              Assign a goal
            </h2>
            <form onSubmit={handleAssignGoal} className="space-y-3">
              <select value={goalMetric} onChange={(e) => setGoalMetric(e.target.value)} className={selectClass}>
                {METRIC_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <GlassField
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="Target (0-10)"
              />
              <GlassField
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
              />
              {goalError && <p className="text-xs text-danger">{goalError}</p>}
              {goalSuccess && <p className="text-xs text-ok">Goal assigned.</p>}
              <GlassButton type="submit" variant="primary" disabled={assigningGoal} className="w-full">
                {assigningGoal ? "Assigning..." : "Assign goal"}
              </GlassButton>
            </form>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase mb-4">
              Suggest a debate topic
            </h2>
            <form onSubmit={handleSuggestTopic} className="space-y-3">
              <GlassField
                multiline
                required
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="This house believes..."
              />
              {topicError && <p className="text-xs text-danger">{topicError}</p>}
              {topicSuccess && <p className="text-xs text-ok">Sent.</p>}
              <GlassButton type="submit" variant="primary" disabled={suggestingTopic} className="w-full">
                {suggestingTopic ? "Sending..." : "Send suggestion"}
              </GlassButton>
            </form>
          </GlassCard>

          {feedback.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono text-xs tracking-widest text-faint uppercase">
                  Feedback given
                </h2>
                {feedbackSuccess && (
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ok">
                    Sent ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-faint mb-3 -mt-2">
                Click an entry to jump to that piece of work above.
              </p>
              <div className="space-y-3">
                {feedback.map((f) => (
                  <GlassCard key={f.id} as="button" hover onClick={() => handleFeedbackEntryClick(f)} className="w-full text-left p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-faint border border-glass-border rounded-full px-1.5 py-0.5">
                        {f.tool_label}
                      </span>
                      <span className="text-xs text-faint truncate">{f.item_title}</span>
                    </div>
                    <p className="text-sm">{f.feedback_text}</p>
                    <p className="font-mono text-[10px] text-faint uppercase mt-1.5">
                      {f.coach_name} · {new Date(f.created_at).toLocaleDateString()}
                    </p>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
