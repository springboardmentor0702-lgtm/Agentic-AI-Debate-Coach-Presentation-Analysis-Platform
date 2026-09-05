"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PRESET_ARGUMENTS = [
  {
    label: "Universal Basic Income (with Fallacies)",
    topic: "Universal Basic Income and Technological Automation",
    text: "Governments should establish a universal basic income because automation will displace 30 percent of routine jobs by 2030, according to recent economic studies. Furthermore, anyone who opposes this policy is an uneducated idiot who wants people to starve. Therefore, we either implement unconditional cash transfers immediately or society will completely collapse."
  },
  {
    label: "AI Safety Audits (Ethical Stance)",
    topic: "Mandatory Audits for Frontier AI Labs",
    text: "Frontier artificial intelligence models present severe dual-use cyber and biosecurity risks. Independent external red-teaming and verifiable capability thresholds must be legally mandated before deploying frontier models, ensuring technological progress remains aligned with human safety."
  },
  {
    label: "Clean Nuclear Energy (Policy Stance)",
    topic: "Modular Nuclear Power Expansion",
    text: "Renewable energy cannot single-handedly meet continuous grid baseload demand without prohibitive battery storage expenditures. Advanced nuclear fission provides high-density, carbon-free baseload electricity, making strategic state investment in next-generation reactors essential for true energy independence."
  }
];

export default function AnalyzePage() {
  const [topic, setTopic] = useState(PRESET_ARGUMENTS[0].topic);
  const [text, setText] = useState(PRESET_ARGUMENTS[0].text);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Counterargument state
  const [counterType, setCounterType] = useState("logical");
  const [counterResult, setCounterResult] = useState(null);
  const [counterLoading, setCounterLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setAnalysis(null);
    setCounterResult(null);

    try {
      const token = Cookies.get("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_BASE}/api/analysis/argument`,
        { text, topic },
        { headers }
      );
      setAnalysis(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed. Ensure the text is at least 10 characters.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCounterargument = async () => {
    setCounterLoading(true);
    try {
      const token = Cookies.get("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_BASE}/api/counterargument/generate`,
        { argument: text, topic, counter_type: counterType },
        { headers }
      );
      setCounterResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCounterLoading(false);
    }
  };

  const handleCopyRebuttal = () => {
    if (!counterResult?.counterargument) return;
    navigator.clipboard.writeText(counterResult.counterargument);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
              Argument Mining & Fallacy Lab
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              5 Criteria • 8 Fallacies • 5 Rebuttals
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
            Intelligent Argument & Fallacy Inspector
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Extract structural premises, benchmark evidentiary reasoning, detect cognitive fallacies, and synthesize multi-perspective rebuttals.
          </p>
        </div>
      </div>

      {/* INPUT WORKBENCH */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        
        {/* TOPIC & PRESET BUTTONS */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Debate Proposition / Topic
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Universal Basic Income"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 self-center">Argument Presets:</span>
            {PRESET_ARGUMENTS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setTopic(preset.topic);
                  setText(preset.text);
                }}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors border border-slate-200 dark:border-slate-700"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* ARGUMENT BODY */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Argument Text (Claims + Evidence + Warrant)
          </label>
          <textarea
            rows={5}
            className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed bg-white dark:bg-slate-900"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter or paste the argument text to analyze..."
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-mono">
            {text.trim().split(/\s+/).filter(Boolean).length} words • {text.length} characters
          </span>
          <button
            onClick={handleAnalyze}
            disabled={loading || text.length < 10}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            {loading ? "Parsing Argument Syntax & Fallacies..." : "Run Multi-Dimensional Analysis"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}
      </div>

      {/* ANALYSIS RESULTS */}
      {analysis && (
        <div className="space-y-6">
          
          {/* 5-CRITERIA SCORECARD TILES */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
                  Diagnostic Telemetry
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  5-Dimensional Argument Evaluation
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase font-semibold">Argument Strength:</span>
                <strong className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {analysis.evaluation?.argument_strength || analysis.argument_score}%
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              {[
                { label: "Clarity", val: analysis.evaluation?.clarity, icon: "🔍", color: "from-indigo-600 to-indigo-500" },
                { label: "Relevance", val: analysis.evaluation?.relevance, icon: "🎯", color: "from-blue-600 to-cyan-500" },
                { label: "Evidence Strength", val: analysis.evaluation?.evidence_strength, icon: "📊", color: "from-emerald-600 to-teal-500" },
                { label: "Logical Consistency", val: analysis.evaluation?.logical_consistency, icon: "⚖️", color: "from-purple-600 to-pink-500" },
                { label: "Persuasiveness", val: analysis.evaluation?.persuasiveness, icon: "🔥", color: "from-amber-500 to-orange-500" }
              ].map((crit) => (
                <div key={crit.label} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1">
                  <div className="text-xl">{crit.icon}</div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{crit.label}</span>
                  <strong className="text-2xl font-black text-slate-900 dark:text-slate-100 block font-mono">{crit.val}%</strong>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                    <div className={`h-full bg-gradient-to-r ${crit.color} rounded-full`} style={{ width: `${crit.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CLAIMS & EVIDENCE EXTRACTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Claims */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📌</span> Identified Core Claims ({analysis.claims?.length || 0})
              </h3>
              <div className="space-y-2.5">
                {(analysis.claims || []).map((claim, idx) => (
                  <div key={idx} className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">Claim #{idx + 1}:</span>
                    {claim.sentence || claim}
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence & Reasoning */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🔬</span> Evidence Markers & Reasoning Connectors
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <strong className="block text-slate-900 dark:text-slate-100 mb-1">Empirical Evidence Markers:</strong>
                  {analysis.evidence?.evidence_markers?.length > 0 ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{analysis.evidence.evidence_markers.join(", ")}</span>
                  ) : (
                    <span className="text-slate-400">No empirical citation terms found.</span>
                  )}
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <strong className="block text-slate-900 dark:text-slate-100 mb-1">Logical Transition Connectors:</strong>
                  {analysis.reasoning?.reasoning_markers?.length > 0 ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{analysis.reasoning.reasoning_markers.join(", ")}</span>
                  ) : (
                    <span className="text-slate-400">No transitional inference keywords detected.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* LOGICAL FALLACY DETECTION RADAR */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🛡️</span> Classical Logical Fallacy Diagnostics
                </h3>
                <p className="text-xs text-slate-500">
                  Scanned for all 8 classical fallacies (Ad Hominem, Straw Man, False Dilemma, Slippery Slope, etc.)
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold w-max ${
                (analysis.fallacies || []).length > 0
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
              }`}>
                {analysis.fallacies?.length || 0} Fallacies Flagged
              </span>
            </div>

            {analysis.fallacies?.length === 0 ? (
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5">
                <span className="text-base">✓</span>
                <span>No logical fallacies detected in this text. Reasoning is structurally sound!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.fallacies.map((fal, idx) => (
                  <div key={idx} className="p-5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm text-rose-900 dark:text-rose-200 font-black">{fal.name}</strong>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 px-2.5 py-0.5 rounded-full">
                        Fallacy Flagged
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                      <strong>Harm:</strong> {fal.explanation}
                    </p>
                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 font-medium">
                      <strong>💡 Strategic Fix:</strong> {fal.correction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COUNTERARGUMENT & REBUTTAL ENGINE */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>⚔️</span> Counterargument & Rebuttal Synthesizer
                </h3>
                <p className="text-xs text-slate-500">
                  Select from 5 strategic rebuttal perspectives
                </p>
              </div>

              {/* PERSPECTIVE SELECTOR */}
              <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                {[
                  { id: "logical", label: "Logical Rebuttal" },
                  { id: "evidence", label: "Evidence-Based" },
                  { id: "ethical", label: "Ethical Stance" },
                  { id: "practical", label: "Practicality" },
                  { id: "policy", label: "Policy Shift" }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setCounterType(btn.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      counterType === btn.id
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateCounterargument}
              disabled={counterLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              {counterLoading ? "Synthesizing Counterargument..." : `Generate ${counterType.toUpperCase()} Rebuttal`}
            </button>

            {counterResult && (
              <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl space-y-4 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block text-[10px]">
                      Synthesized Opposing Rebuttal ({counterResult.type?.toUpperCase()})
                    </span>
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-semibold mt-1.5 leading-relaxed">
                      "{counterResult.counterargument}"
                    </p>
                  </div>
                  <button
                    onClick={handleCopyRebuttal}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 shrink-0 ml-4 transition-colors"
                  >
                    {copied ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                    <strong className="block text-indigo-900 dark:text-indigo-300 mb-0.5">Strategic Debate Tip:</strong>
                    <span className="text-slate-600 dark:text-slate-300">{counterResult.strategy}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                    <strong className="block text-indigo-900 dark:text-indigo-300 mb-0.5">Cross-Examination Challenge:</strong>
                    <span className="text-slate-600 dark:text-slate-300">{counterResult.challenge_question}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
