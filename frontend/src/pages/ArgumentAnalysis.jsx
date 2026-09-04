import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FileSearch, History } from "lucide-react";
import { api } from "../lib/api";
import { downloadFile } from "../lib/downloadFile";
import Spinner, { LoadingBlock } from "../components/Spinner";
import HistoryPanel from "../components/HistoryPanel";
import OriginalSubmission from "../components/OriginalSubmission";
import ScoreBar from "../components/ScoreBar";
import VoiceInputButton from "../components/VoiceInputButton";
import SpeakButton from "../components/SpeakButton";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";
import HistoryDrawer from "../components/ui/HistoryDrawer";

export default function ArgumentAnalysis() {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Scroll the result into view whenever it changes (a fresh submit
  // or picking a past entry from history) - previously the loaded
  // content could render below the fold with nothing to bring it
  // into view, leaving it looking like nothing had happened.
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
  const [historySearch, setHistorySearch] = useState("");

  const loadHistory = () => {
    setHistoryLoading(true);
    api
      .get("/arguments/history", { params: { limit: 30 } })
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Deep-link support: a coach's feedback notification links here as
  // /analyze?item=<id> - once history loads, auto-select that exact
  // entry instead of leaving the learner on a blank form to search
  // through history themselves.
  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId && history.length > 0) {
      const match = history.find((h) => h.id === itemId);
      if (match) handleSelect(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/arguments/analyze", { text, topic: topic || null });
      setResult(res.data);
      setText("");
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not analyze that argument.");
    } finally {
      setLoading(false);
    }
  };

  // Selecting from history also closes the drawer, so the loaded
  // result is immediately front and center at full width instead of
  // sitting behind an open overlay.
  const handleSelect = (item) => {
    setResult(item);
    setHistoryOpen(false);
  };

  // "Practice again" - pre-fills the topic from a past item without
  // navigating away (same page, same tool) and clears the text so
  // they write a genuinely new argument, not re-submit the old one.
  const handlePracticeAgain = (e, item) => {
    e.stopPropagation();
    setTopic(item.topic || "");
    setText("");
    setResult(null);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredHistory = history.filter((item) => {
    if (!historySearch.trim()) return true;
    const haystack = `${item.topic || ""} ${item.input_text || ""}`.toLowerCase();
    return haystack.includes(historySearch.toLowerCase());
  });

  const handleDelete = async (item) => {
    setHistory((prev) => prev.filter((h) => h.id !== item.id));
    if (result?.id === item.id) setResult(null);
    try {
      await api.delete(`/arguments/history/${item.id}`);
    } catch {
      loadHistory();
    }
  };

  const handleDownload = (item) => {
    downloadFile(`/reports/item/arguments/${item.id}/pdf`, `argument-analysis-${item.id.slice(0, 8)}.pdf`);
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent-soft p-2.5">
            <FileSearch size={20} className="text-accent" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-4xl">Make your case, then find its cracks.</h1>
        </div>
        <GlassButton onClick={() => setHistoryOpen(true)} variant="glass" className="shrink-0">
          <History size={14} />
          History{history.length > 0 ? ` (${history.length})` : ""}
        </GlassButton>
      </motion.div>

      <div className="max-w-3xl mx-auto">
        <GlassCard className="p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassField
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic (optional)"
            />
            <div className="space-y-2">
              <GlassField
                multiline
                required
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or write the argument you want analyzed, or use voice input below..."
              />
              <div className="flex items-center justify-between">
                <VoiceInputButton
                  onTranscript={(spoken) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken))}
                />
                <SpeakButton text={text} label="Read back what you've written" />
              </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <GlassButton type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size={12} className="border-surface/40 border-t-surface" />
                  Analyzing...
                </>
              ) : (
                "Analyze argument"
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
            <OriginalSubmission text={result.input_text} topic={result.topic} />

            <GlassCard className="p-6 text-center">
              <p className="font-mono text-xs text-faint uppercase tracking-wide mb-1">
                Overall Score
              </p>
              <p className="font-display text-4xl text-accent">
                {result.overall_score?.toFixed(1)}
                <span className="text-faint text-lg">/10</span>
              </p>
            </GlassCard>

            <GlassCard className="p-6 space-y-3">
              {result.scores &&
                Object.entries(result.scores).map(([key, value]) => (
                  <ScoreBar key={key} label={key.replace(/_/g, " ")} value={value} />
                ))}
            </GlassCard>

            {result.strengths?.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="font-mono text-xs tracking-widest text-ok uppercase mb-2">
                  Strengths
                </h3>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            {result.weaknesses?.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="font-mono text-xs tracking-widest text-danger uppercase mb-2">
                  Weaknesses
                </h3>
                <ul className="space-y-1.5">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm">
                      {w}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            {result.claims?.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                  Claims Identified
                </h3>
                <div className="space-y-3">
                  {result.claims.map((c, i) => (
                    <div key={i} className="border border-glass-border rounded-xl p-3">
                      <p className="text-sm mb-1">{c.claim}</p>
                      <p className="font-mono text-xs text-faint uppercase">
                        {c.type} · evidence: {c.evidence_strength}
                      </p>
                      {c.note && <p className="text-xs text-faint mt-1.5">{c.note}</p>}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {result.summary_feedback && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-mono text-xs tracking-widest text-faint uppercase">
                    Summary
                  </h3>
                  <SpeakButton text={result.summary_feedback} />
                </div>
                <p className="text-sm">{result.summary_feedback}</p>
              </GlassCard>
            )}
          </motion.div>
        )}
      </div>

      <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Past analyses">
        <GlassField
          type="text"
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          placeholder="Search past analyses..."
          className="mb-3 !py-2 text-sm"
        />
        <HistoryPanel
          title="Past analyses"
          items={filteredHistory}
          loading={historyLoading}
          activeId={result?.id}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onDownload={handleDownload}
          emptyMessage={historySearch ? "No matches." : "No arguments analyzed yet."}
          getSpeakText={(item) => item.input_text}
          renderSummary={(item) => (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm truncate">{item.topic || item.input_text?.slice(0, 60) || "Untitled"}</p>
                <button
                  onClick={(e) => handlePracticeAgain(e, item)}
                  title="Practice this topic again"
                  className="shrink-0 font-mono text-[10px] uppercase text-faint hover:text-accent transition-colors"
                >
                  Again ↻
                </button>
              </div>
              <p className="font-mono text-xs text-faint mt-0.5">
                {item.overall_score?.toFixed(1)}/10 · {new Date(item.created_at).toLocaleDateString()}
              </p>
            </>
          )}
        />
      </HistoryDrawer>
    </div>
  );
}
