import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { FileDown, LayoutDashboard } from "lucide-react";
import { api } from "../lib/api";
import { LoadingBlock } from "../components/Spinner";
import Spinner from "../components/Spinner";
import { downloadFile } from "../lib/downloadFile";
import GlassButton from "../components/ui/GlassButton";

function ClassTrendChart({ trend }) {
  if (trend.length < 2) {
    return (
      <p className="text-sm text-faint">
        Not enough history across your learners yet to show a trend.
      </p>
    );
  }
  return (
    <div className="h-48 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="period"
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
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--faint)" }}
            formatter={(value, name, props) => [`${value}/10 (${props.payload.count} data points)`, "Class average"]}
          />
          <Line
            type="monotone"
            dataKey="average_score"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CoachDashboard() {
  const [learners, setLearners] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    api
      .get("/dashboards/coach/students")
      .then((res) => setLearners(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load student data."))
      .finally(() => setLoading(false));

    api
      .get("/dashboards/coach/class-trend")
      .then((res) => setTrend(res.data))
      .catch(() => setTrend([]));
  }, []);

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      await downloadFile("/reports/class/pdf", "class-report.pdf");
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4 mb-2"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent-soft p-2.5">
            <LayoutDashboard size={20} className="text-accent" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-4xl">Every learner, ranked.</h1>
        </div>
        <GlassButton onClick={handleDownloadReport} variant="glass" disabled={downloadingReport} className="shrink-0">
          {downloadingReport ? <Spinner size={14} /> : <FileDown size={14} />}
          Class report (PDF)
        </GlassButton>
      </motion.div>
      <p className="text-faint mb-8">
        Every learner on the platform, ranked by overall performance score.
        There's no class or cohort system yet, so this is everyone — not
        just students assigned to you. Click a learner to see their work.
      </p>

      {loading && <LoadingBlock />}
      {error && <p className="text-sm text-danger">{error}</p>}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-10"
      >
        <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
          Class trend — pooled weekly average
        </h2>
        <ClassTrendChart trend={trend} />
      </motion.div>

      {!loading && !error && learners.length === 0 && (
        <p className="text-sm text-faint">No learners have signed up yet.</p>
      )}

      {!loading && learners.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border overflow-hidden"
        >
          {learners.map((l, i) => (
            <Link
              key={l.id}
              to={`/coach-dashboard/learner/${l.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-glass-strong transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs text-faint w-6 shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm truncate">{l.full_name}</p>
                  <p className="font-mono text-xs text-faint uppercase">
                    {l.experience_level || "Unspecified"} ·{" "}
                    {l.data_counts.argument_analyses} analyses ·{" "}
                    {l.data_counts.debate_rounds} rounds ·{" "}
                    {l.data_counts.presentation_analyses} presentations
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm text-accent shrink-0 ml-4">
                {l.overall_score !== null ? `${l.overall_score.toFixed(1)}/10` : "—"}
              </span>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
