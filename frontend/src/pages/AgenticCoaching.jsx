import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircleQuestion, History } from "lucide-react";
import { api } from "../lib/api";
import Spinner, { LoadingBlock } from "../components/Spinner";
import HistoryPanel from "../components/HistoryPanel";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";
import HistoryDrawer from "../components/ui/HistoryDrawer";
import SpeakButton from "../components/SpeakButton";

const TOOL_LABELS = {
  get_performance_history: "Checked your performance history",
  search_coaching_knowledge: "Searched coaching knowledge",
  check_active_goals: "Checked your active goals",
  propose_goal: "Considered a new goal",
};

export default function AgenticCoaching() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const resultRef = useRef(null);
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [acceptingGoal, setAcceptingGoal] = useState(false);
  const [goalAccepted, setGoalAccepted] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const loadHistory = () => {
    setHistoryLoading(true);
    api
      .get("/coaching-agent/history", { params: { limit: 30 } })
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGoalAccepted(false);
    setJustSent(false);
    setLoading(true);
    try {
      const res = await api.post("/coaching-agent/ask", { question });
      setResult(res.data);
      setQuestion(""); // clear the box now that it's actually been sent
      setJustSent(true);
      setTimeout(() => setJustSent(false), 3000);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not complete that coaching request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    setResult(item);
    setGoalAccepted(false);
    setJustSent(false);
    setHistoryOpen(false);
  };

  const handleDelete = async (item) => {
    setHistory((prev) => prev.filter((h) => h.id !== item.id));
    if (result?.id === item.id) setResult(null);
    try {
      await api.delete(`/coaching-agent/history/${item.id}`);
    } catch {
      loadHistory();
    }
  };

  const handleAcceptGoal = async () => {
    if (!result?.proposed_goal) return;
    setAcceptingGoal(true);
    try {
      await api.post("/goals", {
        metric: result.proposed_goal.metric,
        target_value: result.proposed_goal.target_value,
      });
      setGoalAccepted(true);
    } catch {
      // form stays as-is so they can retry from the Goals page directly
    } finally {
      setAcceptingGoal(false);
    }
  };

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
            <MessageCircleQuestion size={20} className="text-accent" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-4xl">Ask your coach anything.</h1>
        </div>
        <GlassButton onClick={() => setHistoryOpen(true)} variant="glass" className="shrink-0">
          <History size={14} />
          History{history.length > 0 ? ` (${history.length})` : ""}
        </GlassButton>
      </motion.div>
      <p className="text-faint mb-8 max-w-3xl mx-auto">
        This agent decides for itself what it needs to check — your performance
        history, the coaching knowledge base, your existing goals — before answering.
        Different questions get different tools, chosen by the model, not a fixed script.
      </p>

      <div className="max-w-3xl mx-auto">
        <GlassCard className="p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassField
              multiline
              required
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What should I focus on next? Or: How do I structure a stronger rebuttal?"
            />
            <div className="flex justify-end -mt-2">
              <SpeakButton text={question} label="Read back what you've written" />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex items-center gap-3">
              <GlassButton type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size={12} className="border-surface/40 border-t-surface" />
                    Thinking...
                  </>
                ) : (
                  "Ask"
                )}
              </GlassButton>
              {justSent && !loading && (
                <span className="font-mono text-xs text-ok">Sent — see the answer below ✓</span>
              )}
            </div>
          </form>
        </GlassCard>

        {loading && <LoadingBlock />}

        {result && !loading && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <GlassCard className="p-4">
              <p className="font-mono text-xs text-faint uppercase tracking-wide mb-1.5">
                You asked
              </p>
              <p className="text-sm">{result.question}</p>
            </GlassCard>

            {result.tools_used?.length > 0 && (
              <GlassCard className="p-4">
                <p className="font-mono text-xs text-faint uppercase tracking-wide mb-2">
                  What the agent checked
                </p>
                <ul className="space-y-1">
                  {result.tools_used.map((tool, i) => (
                    <li key={i} className="font-mono text-xs text-accent">
                      {TOOL_LABELS[tool] || tool}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-xs tracking-widest text-accent uppercase">
                  Answer
                </p>
                <SpeakButton text={result.response} />
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{result.response}</p>
            </GlassCard>

            {result.proposed_goal && (
              <GlassCard className="p-5 !border-accent/40">
                <p className="font-mono text-xs text-accent uppercase tracking-wide mb-2">
                  Suggested goal
                </p>
                <p className="text-sm mb-1">
                  {result.proposed_goal.metric?.replace(/_/g, " ")} → {result.proposed_goal.target_value}/10
                </p>
                <p className="text-xs text-faint mb-3">{result.proposed_goal.rationale}</p>
                {goalAccepted ? (
                  <p className="text-xs text-ok">Added to your goals.</p>
                ) : (
                  <GlassButton
                    onClick={handleAcceptGoal}
                    variant="primary"
                    disabled={acceptingGoal}
                    className="!px-4 !py-2"
                  >
                    {acceptingGoal ? "Adding..." : "Accept this goal"}
                  </GlassButton>
                )}
              </GlassCard>
            )}
          </motion.div>
        )}
      </div>

      <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Past questions">
        <HistoryPanel
          title="Past questions"
          items={history}
          loading={historyLoading}
          activeId={result?.id}
          onSelect={handleSelect}
          onDelete={handleDelete}
          emptyMessage="No questions asked yet."
          getSpeakText={(item) => item.response}
          renderSummary={(item) => (
            <>
              <p className="text-sm truncate">{item.question}</p>
              <p className="font-mono text-xs text-faint mt-0.5">
                {item.iterations} tool{item.iterations === 1 ? "" : "s"} used ·{" "}
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </>
          )}
        />
      </HistoryDrawer>
    </div>
  );
}
