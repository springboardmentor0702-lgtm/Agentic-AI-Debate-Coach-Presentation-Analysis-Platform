import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, History } from "lucide-react";
import { api } from "../lib/api";
import Spinner, { LoadingBlock } from "../components/Spinner";
import HistoryPanel from "../components/HistoryPanel";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";
import HistoryDrawer from "../components/ui/HistoryDrawer";
import SpeakButton from "../components/SpeakButton";

export default function DebatePrepResearch() {
  const [topic, setTopic] = useState("");
  const [position, setPosition] = useState("");
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

  const loadHistory = () => {
    setHistoryLoading(true);
    api
      .get("/research/history", { params: { limit: 30 } })
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
    setLoading(true);
    try {
      const res = await api.post("/research/prepare", { topic, position: position || null });
      setResult(res.data);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not complete that research.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    setResult(item);
    setHistoryOpen(false);
  };

  const handleDelete = async (item) => {
    setHistory((prev) => prev.filter((h) => h.id !== item.id));
    if (result?.id === item.id) setResult(null);
    try {
      await api.delete(`/research/history/${item.id}`);
    } catch {
      loadHistory();
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
            <Search size={20} className="text-accent" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-4xl">Know your topic before they do.</h1>
        </div>
        <GlassButton onClick={() => setHistoryOpen(true)} variant="glass" className="shrink-0">
          <History size={14} />
          History{history.length > 0 ? ` (${history.length})` : ""}
        </GlassButton>
      </motion.div>
      <p className="text-faint mb-8 max-w-3xl mx-auto">
        An agent that actually decides for itself how much research it needs — it
        searches, checks what it found, and decides whether to search again, rather
        than following a fixed number of steps every time.
      </p>

      <div className="max-w-3xl mx-auto">
        <GlassCard className="p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassField
              required
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Debate topic — e.g. Universal basic income"
            />
            <GlassField
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Position (optional) — e.g. For, Against"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <GlassButton type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size={12} className="border-surface/40 border-t-surface" />
                  Researching — this can take a bit longer, it's genuinely multi-step...
                </>
              ) : (
                "Run research"
              )}
            </GlassButton>
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
              <p className="font-mono text-xs text-faint uppercase tracking-wide mb-2">
                What the agent actually did
              </p>
              <p className="text-sm">
                Ran {result.iterations} search{result.iterations === 1 ? "" : "es"} of its
                own choosing before deciding it had enough.
              </p>
              {result.queries_used?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {result.queries_used.map((q, i) => (
                    <li key={i} className="font-mono text-xs text-accent">
                      {i + 1}. "{q}"
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>

            {result.brief?.suggested_angle && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-mono text-xs tracking-widest text-accent uppercase">
                    Suggested angle
                  </h3>
                  <SpeakButton text={result.brief.suggested_angle} />
                </div>
                <p className="text-sm">{result.brief.suggested_angle}</p>
              </GlassCard>
            )}

            {result.brief?.key_facts?.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                  Key facts
                </h3>
                <div className="space-y-3">
                  {result.brief.key_facts.map((f, i) => (
                    <div key={i} className="border border-glass-border rounded-xl p-3">
                      <p className="text-sm mb-1">{f.fact}</p>
                      {f.source_url && (
                        <a
                          href={f.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-accent hover:underline break-all"
                        >
                          {f.source_url}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {result.brief?.counter_evidence?.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="font-mono text-xs tracking-widest text-danger uppercase mb-2">
                  Likely counter-evidence
                </h3>
                <ul className="space-y-1.5">
                  {result.brief.counter_evidence.map((c, i) => (
                    <li key={i} className="text-sm">
                      {c}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}
          </motion.div>
        )}
      </div>

      <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Past research">
        <HistoryPanel
          title="Past research"
          items={history}
          loading={historyLoading}
          activeId={result?.id}
          onSelect={handleSelect}
          onDelete={handleDelete}
          emptyMessage="No research run yet."
          getSpeakText={(item) => item.brief?.suggested_angle}
          renderSummary={(item) => (
            <>
              <p className="text-sm truncate">{item.topic}</p>
              <p className="font-mono text-xs text-faint mt-0.5">
                {item.iterations} search{item.iterations === 1 ? "" : "es"} ·{" "}
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </>
          )}
        />
      </HistoryDrawer>
    </div>
  );
}
