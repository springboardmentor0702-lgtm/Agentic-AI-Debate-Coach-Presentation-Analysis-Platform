import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Square, History } from "lucide-react";
import { api } from "../lib/api";
import { downloadFile } from "../lib/downloadFile";
import Spinner, { LoadingBlock } from "../components/Spinner";
import HistoryPanel from "../components/HistoryPanel";
import ScoreBar from "../components/ScoreBar";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";
import HistoryDrawer from "../components/ui/HistoryDrawer";
import SpeakButton from "../components/SpeakButton";

export default function PresentationAnalysis() {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [result, setResult] = useState(null);

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

  const recognitionRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      setTranscript(finalText);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      clearInterval(timerRef.current);
    };
  }, []);

  const loadHistory = () => {
    setHistoryLoading(true);
    api
      .get("/presentation/history", { params: { limit: 30 } })
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId && history.length > 0) {
      const match = history.find((h) => h.id === itemId);
      if (match) handleSelect(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, searchParams]);

  const startRecording = () => {
    setTranscript("");
    setResult(null);
    setDurationSeconds(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    recognitionRef.current?.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/presentation/analyze", {
        transcript,
        topic: topic || null,
        duration_seconds: durationSeconds,
      });
      setResult(res.data);
      setTranscript("");
      setDurationSeconds(0);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not analyze that recording.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    setResult(item);
    setTranscript(item.transcript || "");
    setHistoryOpen(false);
  };

  // "Practice again" here means: same topic, but a genuinely fresh
  // recording - clearing the old transcript and timer rather than
  // reusing spoken words from a past attempt.
  const handlePracticeAgain = (e, item) => {
    e.stopPropagation();
    setTopic(item.topic || "");
    setTranscript("");
    setDurationSeconds(0);
    setResult(null);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredHistory = history.filter((item) => {
    if (!historySearch.trim()) return true;
    const haystack = `${item.topic || ""} ${item.transcript || ""}`.toLowerCase();
    return haystack.includes(historySearch.toLowerCase());
  });

  const handleDelete = async (item) => {
    setHistory((prev) => prev.filter((h) => h.id !== item.id));
    if (result?.id === item.id) setResult(null);
    try {
      await api.delete(`/presentation/history/${item.id}`);
    } catch {
      loadHistory();
    }
  };

  const handleDownload = (item) => {
    downloadFile(
      `/reports/item/presentation/${item.id}/pdf`,
      `presentation-analysis-${item.id.slice(0, 8)}.pdf`
    );
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
            <Mic size={20} className="text-accent" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-4xl">Say it out loud, then see it clearly.</h1>
        </div>
        <GlassButton onClick={() => setHistoryOpen(true)} variant="glass" className="shrink-0">
          <History size={14} />
          History{history.length > 0 ? ` (${history.length})` : ""}
        </GlassButton>
      </motion.div>

      <div className="max-w-3xl mx-auto">
        <GlassCard className="p-6 mb-8">
          <div className="space-y-4">
            <GlassField
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic (optional)"
            />

            {!speechSupported && (
              <p className="text-sm text-danger">
                Your browser doesn't support speech recognition — try Chrome or Edge.
              </p>
            )}

            {speechSupported && (
              <div className="border border-glass-border rounded-xl p-5 bg-glass">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`font-mono text-xs uppercase tracking-wide px-4 py-2.5 rounded-full transition-colors inline-flex items-center gap-2 ${
                      isRecording
                        ? "bg-danger text-surface"
                        : "bg-accent text-surface hover:opacity-90"
                    }`}
                  >
                    {isRecording ? <Square size={12} /> : <Mic size={12} />}
                    {isRecording ? "Stop recording" : "Start recording"}
                  </button>
                  {(isRecording || durationSeconds > 0) && (
                    <span className="font-mono text-sm text-faint">
                      {String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:
                      {String(durationSeconds % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
                <GlassField
                  multiline
                  rows={6}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Your speech will appear here as you talk — or paste/edit a transcript directly."
                />
                <div className="flex justify-end mt-2">
                  <SpeakButton text={transcript} label="Read back the transcript" />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}
            <GlassButton
              onClick={handleSubmit}
              variant="primary"
              disabled={loading || !transcript.trim()}
            >
              {loading ? (
                <>
                  <Spinner size={12} className="border-surface/40 border-t-surface" />
                  Analyzing...
                </>
              ) : (
                "Analyze presentation"
              )}
            </GlassButton>
          </div>
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
            <GlassCard className="p-6 text-center">
              <p className="font-mono text-xs text-faint uppercase tracking-wide mb-1">
                Overall Score
              </p>
              <p className="font-display text-4xl text-accent">
                {result.overall_score?.toFixed(1)}
                <span className="text-faint text-lg">/10</span>
              </p>
            </GlassCard>

            {result.pace && (
              <div className="grid grid-cols-2 gap-3">
                <GlassCard className="p-3 text-center">
                  <p className="font-mono text-xs text-faint uppercase">Pace</p>
                  <p className="text-lg">{result.pace.wpm} wpm</p>
                  <p className="text-xs text-faint">{result.pace.assessment}</p>
                </GlassCard>
                {result.filler_words && (
                  <GlassCard className="p-3 text-center">
                    <p className="font-mono text-xs text-faint uppercase">Filler Words</p>
                    <p className="text-lg">{result.filler_words.total}</p>
                  </GlassCard>
                )}
              </div>
            )}

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

            {result.improvements?.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="font-mono text-xs tracking-widest text-danger uppercase mb-2">
                  Improvements
                </h3>
                <ul className="space-y-1.5">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
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

      <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Past recordings">
        <GlassField
          type="text"
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          placeholder="Search past recordings..."
          className="mb-3 !py-2 text-sm"
        />
        <HistoryPanel
          title="Past recordings"
          items={filteredHistory}
          loading={historyLoading}
          activeId={result?.id}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onDownload={handleDownload}
          emptyMessage={historySearch ? "No matches." : "No recordings analyzed yet."}
          getSpeakText={(item) => item.transcript}
          renderSummary={(item) => (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm truncate">
                  {item.topic || item.transcript?.slice(0, 60) || "Untitled"}
                </p>
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
