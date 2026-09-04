import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { UserMinus, FileDown } from "lucide-react";
import { api } from "../lib/api";
import { LoadingBlock } from "../components/Spinner";
import Spinner from "../components/Spinner";
import { downloadFile } from "../lib/downloadFile";
import GlassButton from "../components/ui/GlassButton";

const selectClass =
  "flex-1 bg-glass border border-glass-border backdrop-blur-xl rounded-xl px-4 py-3 text-base text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

function TrendChart({ trend }) {
  if (trend.length < 2) {
    return <p className="text-sm text-faint">Not enough history in this class yet to show a trend.</p>;
  }
  return (
    <div className="h-48 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="period" tick={{ fontSize: 10, fill: "var(--faint)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--faint)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} width={24} />
          <Tooltip
            contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--faint)" }}
          />
          <Line type="monotone" dataKey="average_score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ClassDetail() {
  const { id } = useParams();
  const [roster, setRoster] = useState([]);
  const [trend, setTrend] = useState([]);
  const [allLearners, setAllLearners] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/classes/${id}/roster`),
      api.get(`/classes/${id}/trend`),
      api.get("/dashboards/coach/students"),
    ])
      .then(([rosterRes, trendRes, allRes]) => {
        setRoster(rosterRes.data);
        setTrend(trendRes.data);
        setAllLearners(allRes.data);
      })
      .catch((err) => setError(err.response?.data?.detail || "Could not load this class."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const rosterIds = new Set(roster.map((r) => r.id));
  const availableToAdd = allLearners.filter((l) => !rosterIds.has(l.id));

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedToAdd) return;
    setAddingMember(true);
    try {
      await api.post(`/classes/${id}/members`, { learner_id: selectedToAdd });
      setSelectedToAdd("");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add that learner.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (learnerId) => {
    setRoster((prev) => prev.filter((r) => r.id !== learnerId));
    try {
      await api.delete(`/classes/${id}/members/${learnerId}`);
    } catch {
      load();
    }
  };

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      await downloadFile(`/reports/classes/${id}/pdf`, `class-report-${id.slice(0, 8)}.pdf`);
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <div>
        <p className="text-sm text-danger mb-4">{error}</p>
        <Link to="/classes" className="font-mono text-xs text-faint hover:text-ink">
          ← Back to classes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/classes" className="font-mono text-xs text-faint hover:text-ink transition-colors">
        ← All classes
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4 mt-4 mb-8"
      >
        <h1 className="font-display text-4xl">Class roster.</h1>
        <GlassButton onClick={handleDownloadReport} variant="glass" disabled={downloadingReport} className="shrink-0">
          {downloadingReport ? <Spinner size={14} /> : <FileDown size={14} />}
          Class report (PDF)
        </GlassButton>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-10"
      >
        <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
          Class trend — pooled weekly average
        </h2>
        <TrendChart trend={trend} />
      </motion.div>

      <div className="mb-8 max-w-lg">
        <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
          Add a learner
        </h2>
        <form onSubmit={handleAddMember} className="flex items-center gap-3">
          <select
            value={selectedToAdd}
            onChange={(e) => setSelectedToAdd(e.target.value)}
            className={selectClass}
          >
            <option value="">Select a learner...</option>
            {availableToAdd.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name}
              </option>
            ))}
          </select>
          <GlassButton type="submit" variant="primary" disabled={addingMember || !selectedToAdd} className="shrink-0">
            {addingMember ? <Spinner size={14} className="border-surface/40 border-t-surface" /> : "Add"}
          </GlassButton>
        </form>
        {availableToAdd.length === 0 && (
          <p className="text-xs text-faint mt-2">Every learner on the platform is already in this class.</p>
        )}
      </div>

      <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
        Roster ({roster.length})
      </h2>
      {roster.length === 0 ? (
        <p className="text-sm text-faint">No members yet — add one above.</p>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border overflow-hidden"
        >
          {roster.map((l, i) => (
            <div key={l.id} className="group flex items-center justify-between px-4 py-3">
              <Link
                to={`/coach-dashboard/learner/${l.id}`}
                className="flex items-center gap-3 min-w-0 hover:text-accent transition-colors"
              >
                <span className="font-mono text-xs text-faint w-6 shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm truncate">{l.full_name}</p>
                  <p className="font-mono text-xs text-faint uppercase">
                    {l.experience_level || "Unspecified"}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-sm text-accent">
                  {l.overall_score !== null ? `${l.overall_score.toFixed(1)}/10` : "—"}
                </span>
                <button
                  onClick={() => handleRemoveMember(l.id)}
                  aria-label="Remove from class"
                  className="opacity-0 group-hover:opacity-100 text-faint hover:text-danger transition-opacity"
                >
                  <UserMinus size={14} />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
