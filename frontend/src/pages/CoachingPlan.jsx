import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Compass, History } from "lucide-react";
import { api } from "../lib/api";
import { downloadFile } from "../lib/downloadFile";
import Spinner, { LoadingBlock } from "../components/Spinner";
import HistoryPanel from "../components/HistoryPanel";
import ScoreBar from "../components/ScoreBar";
import GlassCard from "../components/ui/GlassCard";
import GlassButton from "../components/ui/GlassButton";
import HistoryDrawer from "../components/ui/HistoryDrawer";
import SpeakButton from "../components/SpeakButton";

// Deep-links a weak performance area back to the tool that actually
// practices it.
const COMPONENT_TOOL_ROUTES = {
  argument_quality: "/analyze",
  evidence_usage: "/analyze",
  logical_consistency: "/fallacies",
  rebuttal_effectiveness: "/debates",
  communication_skills: "/presentation",
};

// Matches the backend's own WEAK_THRESHOLD in coaching_service.py -
// used here only to decide which scored components get a "practice
// this" link, not to duplicate any scoring logic.
const WEAK_THRESHOLD = 7.0;

export default function CoachingPlan() {
  const [plan, setPlan] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const resultRef = useRef(null);
  useEffect(() => {
    if (plan && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [plan]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = () => {
    setHistoryLoading(true);
    api
      .get("/coaching/history", { params: { limit: 30 } })
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/coaching/plan");
      setPlan(res.data);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate a coaching plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    setPlan(item);
    setHistoryOpen(false);
  };

  const handleDelete = async (item) => {
    setHistory((prev) => prev.filter((h) => h.id !== item.id));
    if (plan?.id === item.id) setPlan(null);
    try {
      await api.delete(`/coaching/history/${item.id}`);
    } catch {
      loadHistory();
    }
  };

  const handleDownload = (item) => {
    downloadFile(`/reports/item/coaching/${item.id}/pdf`, `coaching-plan-${item.id.slice(0, 8)}.pdf`);
  };

  const scoredComponents = (plan?.performance_snapshot?.components || []).filter((c) => c.has_data);
  const weakComponents = scoredComponents.filter((c) => c.score < WEAK_THRESHOLD);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between gap-4 mb-2"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent-soft p-2.5">
            <Compass size={20} className="text-accent" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-4xl">Your next move.</h1>
        </div>
        <GlassButton onClick={() => setHistoryOpen(true)} variant="glass" className="shrink-0">
          <History size={14} />
          History{history.length > 0 ? ` (${history.length})` : ""}
        </GlassButton>
      </motion.div>
      <p className="text-faint mb-8 max-w-3xl mx-auto">
        Grounded recommendations based on your actual performance history, not
        generic advice — retrieved from a coaching knowledge base for the
        specific skills that need it most.
      </p>

      <div className="max-w-3xl mx-auto min-w-0">
        <GlassButton onClick={handleGenerate} variant="primary" disabled={loading} className="mb-8">
          {loading ? (
            <>
              <Spinner size={12} className="border-surface/40 border-t-surface" />
              Generating...
            </>
          ) : (
            "Generate coaching plan"
          )}
        </GlassButton>

        {error && <p className="text-sm text-danger mb-4">{error}</p>}
        {loading && <LoadingBlock />}

        {plan && !loading && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-glass-border pb-4">
              <h2 className="font-mono text-xs tracking-widest text-faint uppercase">
                Your coaching plan
              </h2>
              {plan.id ? (
                <GlassButton
                  onClick={() => handleDownload(plan)}
                  variant="primary"
                  className="!px-4 !py-2"
                >
                  <Download size={13} />
                  Download PDF
                </GlassButton>
              ) : (
                <span className="font-mono text-xs text-faint italic">
                  Couldn't be saved — download unavailable
                </span>
              )}
            </div>

            {plan.summary_feedback && (
              <GlassCard className="p-5 !border-accent/40">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-xs text-accent uppercase tracking-wide">Summary</p>
                  <SpeakButton text={plan.summary_feedback} />
                </div>
                <p className="text-sm">{plan.summary_feedback}</p>
              </GlassCard>
            )}

            {scoredComponents.length > 0 && (
              <GlassCard className="p-5">
                <p className="font-mono text-xs text-faint uppercase tracking-wide mb-3">
                  Performance snapshot
                </p>
                <div className="space-y-3">
                  {scoredComponents.map((c) => (
                    <ScoreBar key={c.key} label={c.label} value={c.score} />
                  ))}
                </div>
              </GlassCard>
            )}

            {plan.recommendations?.length > 0 && (
              <div>
                <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {plan.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm border border-glass-border rounded-xl p-3 break-words">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.skill_development_plan?.length > 0 && (
              <div>
                <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                  Skill-building exercises
                </h3>
                <ul className="space-y-1.5">
                  {plan.skill_development_plan.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2 min-w-0">
                      <span className="text-accent shrink-0">•</span>
                      <span className="min-w-0 break-words">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.learning_path?.length > 0 && (
              <div>
                <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                  Learning path
                </h3>
                <ol className="space-y-1.5">
                  {plan.learning_path.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2 min-w-0">
                      <span className="font-mono text-accent shrink-0">{i + 1}.</span>
                      <span className="min-w-0 break-words">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {weakComponents.length > 0 && (
              <div>
                <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                  Practice these next
                </h3>
                <div className="flex flex-wrap gap-3">
                  {weakComponents.map(
                    (c) =>
                      COMPONENT_TOOL_ROUTES[c.key] && (
                        <Link
                          key={c.key}
                          to={COMPONENT_TOOL_ROUTES[c.key]}
                          className="font-mono text-xs uppercase tracking-wide text-accent hover:underline"
                        >
                          {c.label} →
                        </Link>
                      )
                  )}
                </div>
              </div>
            )}

            {plan.knowledge_used?.length > 0 && (
              <p className="text-xs text-faint italic">
                Grounded in: {plan.knowledge_used.map((k) => k.title).join(", ")}
              </p>
            )}
          </motion.div>
        )}
      </div>

      <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Past plans">
        <HistoryPanel
          title="Past plans"
          items={history}
          loading={historyLoading}
          activeId={plan?.id}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onDownload={handleDownload}
          emptyMessage="No coaching plans generated yet."
          getSpeakText={(item) => item.summary_feedback}
          renderSummary={(item) => (
            <>
              <p className="text-sm truncate">{item.summary_feedback || "Coaching plan"}</p>
              <p className="font-mono text-xs text-faint mt-0.5">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </>
          )}
        />
      </HistoryDrawer>
    </div>
  );
}
