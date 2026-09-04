import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { api } from "../lib/api";
import { LoadingBlock } from "../components/Spinner";
import GlassCard from "../components/ui/GlassCard";
import GlassButton from "../components/ui/GlassButton";

function DistributionChart({ distribution }) {
  return (
    <div className="h-56 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={distribution} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="range"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
          />
          <YAxis
            allowDecimals={false}
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
            formatter={(value) => [`${value} learner(s)`, "Count"]}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {distribution.map((d, i) => (
              <Cell key={i} fill={d.is_mine ? "var(--accent)" : "#9aa3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SkillRadarChart({ components }) {
  const data = components.map((c) => ({ label: c.label, percentile: c.percentile }));
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--line)" />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--faint)" }} />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "var(--faint)" }}
            axisLine={false}
          />
          <Radar
            dataKey="percentile"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--faint)" }}
            formatter={(value) => [`Top ${(100 - value).toFixed(0)}%`, "Standing"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PercentileRow({ label, score, percentile }) {
  return (
    <div className="flex items-center justify-between border border-glass-border rounded-xl px-4 py-3 bg-glass">
      <span className="text-sm">{label}</span>
      <div className="text-right">
        <span className="font-mono text-sm text-accent">{score.toFixed(1)}/10</span>
        <span className="font-mono text-xs text-faint ml-3">Top {(100 - percentile).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function PeerComparison() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/comparison")
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load comparison data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="rounded-xl bg-accent-soft p-2.5">
          <Users size={20} className="text-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-4xl">Where you stand, anonymously.</h1>
      </motion.div>
      <p className="text-faint mb-10">
        Compared only against other learners who've opted in. Nobody's name or exact
        score is ever shown to anyone else — including you.
      </p>

      {loading && <LoadingBlock />}
      {error && <p className="text-sm text-danger">{error}</p>}

      {data && !data.opted_in && (
        <GlassCard className="p-6 max-w-lg">
          <p className="text-sm mb-4">
            You're not part of the comparison pool yet — this is opt-in, so nobody sees
            your standing (including you) until you choose to join.
          </p>
          <GlassButton as={Link} to="/profile" variant="primary">
            Opt in on your profile →
          </GlassButton>
        </GlassCard>
      )}

      {data && data.opted_in && !data.enough_data && (
        <GlassCard className="p-6 max-w-lg">
          <p className="text-sm">
            Only {data.pool_size} learner(s) have opted in so far — at least{" "}
            {data.min_pool_size} are needed before a meaningful, anonymous comparison can
            be shown. This protects everyone's privacy: with too few people, an individual
            score becomes easy to guess.
          </p>
        </GlassCard>
      )}

      {data && data.opted_in && data.enough_data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-5xl grid lg:grid-cols-2 gap-8 items-start"
        >
          {data.overall && (
            <div>
              <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
                Overall standing
              </h2>
              <GlassCard className="p-6 text-center mb-6">
                <p className="font-mono text-xs text-faint uppercase tracking-wide mb-2">
                  Among {data.pool_size} opted-in learners
                </p>
                <p className="font-display text-5xl text-accent">
                  Top {(100 - data.overall.percentile).toFixed(0)}%
                </p>
                <p className="text-xs text-faint mt-2">
                  Your score: {data.overall.my_score.toFixed(1)}/10
                </p>
              </GlassCard>
              <GlassCard className="p-5">
                <DistributionChart distribution={data.overall.distribution} />
              </GlassCard>
            </div>
          )}

          {data.components.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
                By skill
              </h2>
              {data.components.length >= 3 && (
                <GlassCard className="p-5 mb-4">
                  <SkillRadarChart components={data.components} />
                </GlassCard>
              )}
              <div className="space-y-3">
                {data.components.map((c, i) => (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <PercentileRow label={c.label} score={c.my_score} percentile={c.percentile} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
