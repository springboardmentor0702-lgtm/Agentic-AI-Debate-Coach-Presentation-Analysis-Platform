import React, { useState } from 'react';
import { api } from '../services/api';
import AudioRecorder from '../components/AudioRecorder';
import { 
  Compass, Mic, Award, Clock, Sparkles, AlertCircle, 
  CheckCircle2, Download, FileText, ChevronRight, Volume2
} from 'lucide-react';

export default function PresentationStudio() {
  const [title, setTitle] = useState("Keynote & Persuasive Address");
  const [transcript, setTranscript] = useState("Good morning everyone. Today I, um, want to talk about the extraordinary transformation of artificial intelligence. Actually, when we examine the empirical evidence, like, basically 65% of students improve reasoning when given real-time coaching. Are we ready to embrace this revolution? Thank you.");
  const [duration, setDuration] = useState(45.0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    try {
      const res = await api.analyzePresentation(title, transcript, duration);
      setResult(res);
    } catch (err) {
      alert("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (fmt) => {
    try {
      const res = await api.exportReport("presentation", null, fmt);
      window.open(api.getDownloadUrl(res.filename), "_blank");
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-950/50 via-indigo-950/40 to-slate-900 border border-teal-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Presentation & Speech Intelligence
              </span>
              <span className="text-xs text-slate-400 font-mono">Acoustic & Lexical Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Speech Delivery & Prosody Lab
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Analyze speaking pace (WPM), eliminate vocal fillers, and optimize confidence and rhetorical engagement.
            </p>
          </div>

          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport("pdf")}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Speech Audit (PDF)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Station */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-teal-400" />
              <span>Speech Recording & Transcript Station</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Presentation Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Audio Recorder Component */}
            <AudioRecorder
              value={transcript}
              onChange={(val) => setTranscript(val)}
              onTranscriptReady={(text, secs) => {
                setTranscript(text);
                setDuration(secs);
              }}
              placeholder="Record your speech or edit the transcript..."
            />

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Speech Duration: <strong className="text-white">{Math.round(duration)} seconds</strong></span>
              <button
                onClick={handleAnalyze}
                disabled={loading || !transcript.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "Analyzing Audio..." : "Compute Presentation Metrics"}</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Metrics Panel */}
        <div className="lg:col-span-6 space-y-4">
          {!result ? (
            <div className="h-full min-h-[350px] bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
              <Compass className="w-12 h-12 text-slate-600" />
              <div className="text-sm font-semibold text-slate-300">No Speech Analysis Computed Yet</div>
              <p className="text-xs text-slate-500 max-w-sm">
                Record your voice or click 'Compute Presentation Metrics' above to generate speech pace, filler count, and clarity benchmarks.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in">
              
              {/* Header result */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Presentation Delivery Score</span>
                  <div className="text-2xl font-black text-white">{result.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-teal-400">{result.overall_presentation_score}%</div>
                  <div className="text-xs text-emerald-400 font-semibold">Executive Poise</div>
                </div>
              </div>

              {/* 4 Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* WPM */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Speech Pace (WPM)</span>
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">{result.speech_pace_wpm}</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">{result.pace_status}</div>
                </div>

                {/* Fillers */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Filler Words Count</span>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">{result.filler_words_count}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {result.filler_words_count === 0 ? "Flawless vocal discipline" : "Vocal bridge penalty"}
                  </div>
                </div>

                {/* Confidence */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Confidence Index</span>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">{result.confidence_score}%</div>
                  <div className="text-[11px] text-amber-300 mt-0.5">Lexical conviction</div>
                </div>

                {/* Engagement */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Audience Engagement</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">{result.engagement_score}%</div>
                  <div className="text-[11px] text-purple-300 mt-0.5">Rhetorical hooks</div>
                </div>

              </div>

              {/* Filler Words Breakdown Chips */}
              {Object.keys(result.filler_words_breakdown || {}).length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs">
                  <div className="font-semibold text-rose-300 mb-2">Detected Filler Words:</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.filler_words_breakdown).map(([w, cnt]) => (
                      <span key={w} className="px-2.5 py-1 rounded-md bg-rose-900/40 text-rose-200 border border-rose-800/40 font-mono text-[11px]">
                        "{w}": {cnt}x
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Feedback */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="font-bold text-white">Vocal Coach Feedback:</div>
                <p className="text-slate-300 leading-relaxed">{result.feedback}</p>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
