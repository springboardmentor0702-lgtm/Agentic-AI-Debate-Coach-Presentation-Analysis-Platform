import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, ChevronDown, FileSearch, AlertTriangle, Swords, Mic } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Spinner, { LoadingBlock } from "../components/Spinner";
import ScoreBar from "../components/ScoreBar";
import StreakBadge from "../components/StreakBadge";
import GlassCard from "../components/ui/GlassCard";
import GlassButton from "../components/ui/GlassButton";

const TREND_COLORS = {
  argument_quality: "#8b80f9",
  evidence_usage: "#4caf6d",
  logical_consistency: "#e5484d",
  rebuttal_effectiveness: "#f5a623",
  communication_skills: "#3aa9d8",
};

// Real numbers pulled straight from /scoring/performance's data_counts,
// which the page already fetches - these were simply never rendered
// before. Icons match the same tool icons used on the marketing Home
// page, for visual consistency.
const QUICK_STATS = [
  { key: "argument_analyses", label: "Argument Analyses", icon: FileSearch },
  { key: "fallacy_detections", label: "Fallacy Checks", icon: AlertTriangle },
  { key: "debate_rounds", label: "Debate Rounds", icon: Swords },
  { key: "presentation_analyses", label: "Presentation Runs", icon: Mic },
];

const ACTIVITY_CHART_COLORS = ["#8b80f9", "#4caf6d", "#e5484d", "#f5a623", "#3aa9d8", "#c084fc", "#5eb1d6"];

function TrendChart({ history }) {
  if (history.length < 2) {
    return <p className="text-sm text-faint">Not enough history yet to show a trend.</p>;
  }

  const chartData = history
    .slice()
    .reverse()
    .map((snapshot) => {
      const point = {
        date: new Date(snapshot.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      };
      for (const c of snapshot.components || []) {
        if (c.has_data) point[c.key] = c.score;
      }
      return point;
    });

  const activeKeys = Object.keys(TREND_COLORS).filter((key) =>
    chartData.some((point) => point[key] !== undefined)
  );

  return (
    <div className="h-64 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--faint)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--faint)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} width={24} />
          <Tooltip
            contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--faint)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {activeKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key.replace(/_/g, " ")}
              stroke={TREND_COLORS[key]}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Composition of recent activity by tool - genuinely derived from the
// same activity feed already fetched below, not invented data. Gives
// a quick "what have I actually been practicing" read at a glance.
function ActivityByToolChart({ activity }) {
  if (activity.length === 0) return null;

  const counts = {};
  for (const item of activity) {
    const label = item.tool_label || "Other";
    counts[label] = (counts[label] || 0) + 1;
  }
  const data = Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="h-48 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--faint)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--faint)" }}
            formatter={(value) => [`${value} item(s)`, "Count"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={ACTIVITY_CHART_COLORS[i % ACTIVITY_CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Each row expands in place to show the full, untruncated text of
// that activity item - previously the summary was hard-cut at 50
// characters with no way to ever see the rest.
function ActivityRow({ item, isExpanded, onToggle }) {
  const fullText = item.input_text || item.transcript || "";
  const summary = item.topic || fullText.slice(0, 50) || "Untitled";
  const hasMore = fullText && fullText.length > 0;

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-glass-strong transition-colors"
      >
        <div className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-wide text-faint border border-glass-border rounded-full px-1.5 py-0.5 mr-2">
            {item.tool_label}
          </span>
          <span className="text-sm">{summary}</span>
        </div>
        {hasMore && (
          <ChevronDown
            size={14}
            className={`shrink-0 mt-1 text-faint transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && hasMore && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-sm text-faint px-4 pb-4 whitespace-pre-wrap leading-relaxed">
              {fullText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [performance, setPerformance] = useState(null);
  const [history, setHistory] = useState([]);
  const [activity, setActivity] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickingTopic, setPickingTopic] = useState(false);

  // "View all" (was a dead link to a route that doesn't exist) now
  // just reveals the rest of the already-fetched activity list.
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  const toggleRow = (key) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSurpriseMe = async () => {
    setPickingTopic(true);
    try {
      const res = await api.get("/topics/random");
      navigate(`/debates?suggested_topic=${encodeURIComponent(res.data.topic)}`);
    } catch {
      navigate("/topics");
    } finally {
      setPickingTopic(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/scoring/performance"),
      api.get("/scoring/history", { params: { limit: 30 } }),
      // Fetch a larger batch up front so "View all" can just reveal
      // more of what's already in memory instead of a second round
      // trip - the visible count is still capped at 6 until expanded.
      api.get("/dashboards/learner/activity", { params: { limit: 50 } }),
      api.get("/goals"),
    ])
      .then(([perfRes, historyRes, activityRes, goalsRes]) => {
        setPerformance(perfRes.data);
        setHistory(historyRes.data);
        setActivity(activityRes.data);
        setGoals(goalsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock />;

  const activeGoals = goals.filter((g) => g.status === "active");
  const visibleActivity = activityExpanded ? activity : activity.slice(0, 6);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-4xl mb-1">Welcome back, {profile?.full_name?.split(" ")[0]}.</h1>
        <p className="text-faint mb-8">Here's where things stand.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-8"
      >
        <StreakBadge />
      </motion.div>

      {performance?.data_counts && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {QUICK_STATS.map(({ key, label, icon: Icon }) => (
            <GlassCard key={key} className="p-4">
              <Icon size={16} className="text-accent mb-2" strokeWidth={1.75} />
              <p className="font-display text-2xl">{performance.data_counts[key] ?? 0}</p>
              <p className="font-mono text-[10px] text-faint uppercase tracking-wide">{label}</p>
            </GlassCard>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid lg:grid-cols-[1fr_1.3fr] gap-10 items-start mb-10"
      >
        <GlassCard className="p-5">
          <div className="flex items-baseline justify-between mb-4">
            <span className="font-mono text-xs text-faint uppercase tracking-wide">Overall Score</span>
            <span className="font-display text-3xl text-accent">
              {performance?.overall_score !== null && performance?.overall_score !== undefined
                ? performance.overall_score.toFixed(1)
                : "—"}
              <span className="text-faint text-base">/10</span>
            </span>
          </div>
          <div className="space-y-3">
            {performance?.components
              ?.filter((c) => c.has_data)
              .map((c) => (
                <ScoreBar key={c.key} label={c.label} value={c.score} />
              ))}
          </div>
          {!performance?.components?.some((c) => c.has_data) && (
            <p className="text-sm text-faint">
              No scored activity yet —{" "}
              <Link to="/analyze" className="text-accent hover:underline">
                try Argument Analysis
              </Link>{" "}
              to get started.
            </p>
          )}
        </GlassCard>

        <div>
          <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">Trend</h2>
          <TrendChart history={history} />
        </div>
      </motion.div>

      {activity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
            Recent activity by tool
          </h2>
          <ActivityByToolChart activity={activity} />
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs tracking-widest text-faint uppercase">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-faint">No activity yet.</p>
          ) : (
            <>
              <div className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border overflow-hidden">
                {visibleActivity.map((item) => {
                  const key = `${item.kind}-${item.id}`;
                  return (
                    <ActivityRow
                      key={key}
                      item={item}
                      isExpanded={expandedRows.has(key)}
                      onToggle={() => toggleRow(key)}
                    />
                  );
                })}
              </div>
              {activity.length > 6 && (
                <button
                  onClick={() => setActivityExpanded((v) => !v)}
                  className="mt-3 font-mono text-xs uppercase tracking-wide text-accent hover:underline"
                >
                  {activityExpanded ? "Show less" : `View all (${activity.length})`}
                </button>
              )}
            </>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs tracking-widest text-faint uppercase">Active Goals</h2>
            <Link to="/goals" className="text-xs text-accent hover:underline">
              Manage goals
            </Link>
          </div>
          {activeGoals.length === 0 ? (
            <p className="text-sm text-faint">
              No active goals —{" "}
              <Link to="/goals" className="text-accent hover:underline">
                set one
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-3">
              {activeGoals.map((goal) => (
                <GlassCard key={goal.id} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm">{goal.metric.replace(/_/g, " ")}</span>
                    <span className="font-mono text-xs text-accent">{goal.target_value}/10</span>
                  </div>
                  {goal.assigned_by && (
                    <span className="font-mono text-[10px] text-faint uppercase">Assigned by your coach</span>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <GlassCard className="mt-10 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-xs tracking-widest text-faint uppercase mb-1">
              Ready for the Debate?
            </p>
            <p className="text-sm text-faint">
              Browse the topic library, or let us pick one for you.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <GlassButton as={Link} to="/topics" variant="glass">
              Browse topics
            </GlassButton>
            <GlassButton onClick={handleSurpriseMe} variant="primary" disabled={pickingTopic}>
              {pickingTopic ? (
                <Spinner size={12} className="border-surface/40 border-t-surface" />
              ) : (
                <Shuffle size={14} />
              )}
              Surprise me
            </GlassButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
