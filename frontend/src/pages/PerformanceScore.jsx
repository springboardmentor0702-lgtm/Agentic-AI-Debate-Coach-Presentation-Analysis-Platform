import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../lib/api";
import { LoadingBlock } from "../components/Spinner";
import ScoreBar from "../components/ScoreBar";
import GlassCard from "../components/ui/GlassCard";

const COMPONENT_LINKS = {
  argument_quality: { to: "/analyze", label: "Run an argument analysis" },
  evidence_usage: { to: "/analyze", label: "Run an argument analysis" },
  logical_consistency: { to: "/fallacies", label: "Run a fallacy check" },
  rebuttal_effectiveness: { to: "/debates", label: "Try a debate simulation" },
  communication_skills: { to: "/presentation", label: "Try a presentation analysis" },
};

// A fixed categorical palette for the chart specifically - mid-tone
// colors read fine against both the dark and light surface, unlike
// the single brand accent (which is tuned per-theme, not meant for
// distinguishing 5 simultaneous series).
const COMPONENT_COLORS = {
  argument_quality: "#7c6df0",
  evidence_usage: "#3fa968",
  logical_consistency: "#e0a83c",
  rebuttal_effectiveness: "#4a9fd8",
  communication_skills: "#d8618f",
};

function TrendChart({ snapshots }) {
  if (snapshots.length < 2) {
    return (
      <p className="text-sm text-faint">
        Complete a couple more scored activities to see a trend line per skill here.
      </p>
    );
  }

  const chartData = snapshots.map((snap) => {
    const point = {
      date: new Date(snap.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
    (snap.components || []).forEach((c) => {
      if (c.has_data) point[c.key] = c.score;
    });
    return point;
  });

  return (
    <div className="h-64 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            width={24}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--faint)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            formatter={(value) => COMPONENT_LABELS_SHORT[value] || value}
          />
          {Object.entries(COMPONENT_COLORS).map(([key, color]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 2, fill: color }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const COMPONENT_LABELS_SHORT = {
  argument_quality: "Argument",
  evidence_usage: "Evidence",
  logical_consistency: "Logic",
  rebuttal_effectiveness: "Rebuttal",
  communication_skills: "Delivery",
};

export default function PerformanceScore() {
  const [data, setData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/scoring/performance")
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load your performance score."))
      .finally(() => setLoading(false));

    api
      .get("/scoring/history", { params: { limit: 50 } })
      .then((res) => setSnapshots(res.data))
      .catch(() => setSnapshots([]));
  }, []);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="rounded-xl bg-accent-soft p-2.5">
          <BarChart3 size={20} className="text-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-4xl">The final verdict, weighted.</h1>
      </motion.div>

      {loading && <LoadingBlock />}
      {error && <p className="text-sm text-danger">{error}</p>}

      {data && (
        <>
          <GlassCard className="p-6 mb-10 text-center">
            <p className="font-mono text-xs text-faint uppercase tracking-wide mb-2">
              Overall Performance Score
            </p>
            {data.overall_score !== null ? (
              <p className="font-display text-5xl text-accent">
                {data.overall_score.toFixed(1)}
                <span className="text-faint text-xl">/10</span>
              </p>
            ) : (
              <p className="font-mono text-sm text-faint">
                Not enough data yet — try any tool below to get started.
              </p>
            )}
          </GlassCard>

          <GlassCard className="p-6 space-y-6 mb-10">
            {data.components.map((c) =>
              c.has_data ? (
                <ScoreBar
                  key={c.key}
                  label={`${c.label} (${c.weight_pct}% weight)`}
                  value={c.score}
                />
              ) : (
                <div key={c.key}>
                  <span className="block font-mono text-xs text-faint uppercase tracking-wide mb-1.5">
                    {c.label} ({c.weight_pct}% weight)
                  </span>
                  <div className="flex items-center justify-between border border-glass-border rounded-xl px-3 py-2">
                    <span className="text-xs text-faint italic">Not enough data yet</span>
                    <Link
                      to={COMPONENT_LINKS[c.key].to}
                      className="font-mono text-xs text-accent hover:underline whitespace-nowrap ml-4"
                    >
                      {COMPONENT_LINKS[c.key].label} →
                    </Link>
                  </div>
                </div>
              )
            )}
          </GlassCard>

          <GlassCard className="p-6 mb-10">
            <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
              Skill trends over time
            </h2>
            <TrendChart snapshots={snapshots} />
          </GlassCard>

          <p className="font-mono text-xs text-faint">
            Based on {data.data_counts.argument_analyses} argument analyses,{" "}
            {data.data_counts.fallacy_detections} fallacy checks,{" "}
            {data.data_counts.debate_rounds} debate rounds, and{" "}
            {data.data_counts.presentation_analyses} presentation analyses.
          </p>
        </>
      )}
    </div>
  );
}
