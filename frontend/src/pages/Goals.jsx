import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Pencil, Check, X, Target } from "lucide-react";
import { api } from "../lib/api";
import Spinner, { LoadingBlock } from "../components/Spinner";
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

function GoalProgressBar({ current, target }) {
  const pct = Math.max(0, Math.min(100, (current / target) * 100));
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-mono text-xs text-faint uppercase tracking-wide">Progress</span>
        <span className="font-mono text-xs text-ink">
          {current.toFixed(1)} / {target.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 bg-line rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 100 ? "bg-ok" : "bg-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GoalCard({ goal, onDelete, onUpdate }) {
  const achieved = goal.status === "achieved";
  const [editing, setEditing] = useState(false);
  const [targetDraft, setTargetDraft] = useState(goal.target_value);
  const [deadlineDraft, setDeadlineDraft] = useState(goal.deadline || "");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setTargetDraft(goal.target_value);
    setDeadlineDraft(goal.deadline || "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(goal, {
      target_value: parseFloat(targetDraft),
      deadline: deadlineDraft || null,
    });
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <GlassCard className="p-4 !border-accent/40">
        <p className="text-sm mb-3">{goal.metric_label}</p>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <label className="block">
            <span className="block font-mono text-[10px] text-faint uppercase tracking-wide mb-1">
              Target (0-10)
            </span>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              className="w-24 bg-glass border border-glass-border rounded-xl px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] text-faint uppercase tracking-wide mb-1">
              Deadline
            </span>
            <input
              type="date"
              value={deadlineDraft}
              onChange={(e) => setDeadlineDraft(e.target.value)}
              className="bg-glass border border-glass-border rounded-xl px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            aria-label="Save changes"
            className="text-ok hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {saving ? <Spinner size={16} /> : <Check size={18} />}
          </button>
          <button
            onClick={() => setEditing(false)}
            aria-label="Cancel"
            className="text-faint hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-4 ${achieved ? "!border-ok/40" : ""}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-sm">{goal.metric_label}</p>
          <p className="font-mono text-xs text-faint uppercase mt-0.5">
            Target: {Number(goal.target_value).toFixed(1)}/10
            {goal.deadline && ` · by ${new Date(goal.deadline).toLocaleDateString()}`}
            {goal.assigned_by && " · assigned by your coach"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {achieved && (
            <span className="font-mono text-[10px] uppercase tracking-wide text-ok border border-ok/40 rounded-full px-1.5 py-0.5">
              Achieved
            </span>
          )}
          <button
            onClick={startEdit}
            aria-label="Edit goal"
            className="text-faint hover:text-accent transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(goal)}
            aria-label="Delete goal"
            className="text-faint hover:text-danger transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {goal.current_value !== null && goal.current_value !== undefined ? (
        <GoalProgressBar current={goal.current_value} target={Number(goal.target_value)} />
      ) : (
        <p className="text-xs text-faint italic">No data yet for this metric.</p>
      )}
    </GlassCard>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("overall_score");
  const [targetValue, setTargetValue] = useState("8.0");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const loadGoals = () => {
    setLoading(true);
    api
      .get("/goals")
      .then((res) => setGoals(res.data))
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.post("/goals", {
        metric,
        target_value: parseFloat(targetValue),
        deadline: deadline || null,
      });
      setDeadline("");
      loadGoals();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create that goal.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (goal) => {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    try {
      await api.delete(`/goals/${goal.id}`);
    } catch {
      loadGoals();
    }
  };

  const handleUpdate = async (goal, changes) => {
    try {
      await api.patch(`/goals/${goal.id}`, changes);
      loadGoals();
    } catch {
      loadGoals();
    }
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const achievedGoals = goals.filter((g) => g.status === "achieved");

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="rounded-xl bg-accent-soft p-2.5">
          <Target size={20} className="text-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-4xl">Set a target. Watch it move.</h1>
      </motion.div>
      <p className="text-faint mb-10">
        Pick a skill, set a number, and progress updates automatically as you practice —
        no need to check back and update it yourself.
      </p>

      <GlassCard className="p-5 mb-10">
        <form onSubmit={handleCreate} className="grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-end">
          <label className="block">
            <span className="block font-mono text-xs text-faint uppercase tracking-wide mb-1.5">
              Skill
            </span>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className={selectClass}>
              {METRIC_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <GlassField
            label="Target (0-10)"
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            required
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
          <GlassField
            label="Deadline (optional)"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <GlassButton type="submit" variant="primary" disabled={creating} className="h-fit">
            {creating ? <Spinner size={14} className="border-surface/40 border-t-surface" /> : "Add goal"}
          </GlassButton>
        </form>
      </GlassCard>

      {error && <p className="text-sm text-danger mb-6">{error}</p>}

      {loading ? (
        <LoadingBlock />
      ) : goals.length === 0 ? (
        <p className="text-sm text-faint">No goals yet. Set your first one above.</p>
      ) : (
        <div className="space-y-8">
          {activeGoals.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
                Active
              </h2>
              <div className="space-y-3">
                {activeGoals.map((g) => (
                  <GoalCard key={g.id} goal={g} onDelete={handleDelete} onUpdate={handleUpdate} />
                ))}
              </div>
            </div>
          )}
          {achievedGoals.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest text-ok uppercase mb-4">
                Achieved
              </h2>
              <div className="space-y-3">
                {achievedGoals.map((g) => (
                  <GoalCard key={g.id} goal={g} onDelete={handleDelete} onUpdate={handleUpdate} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
