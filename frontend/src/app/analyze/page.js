"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AnalyzePage() {
  const [topic, setTopic] = useState("Universal Basic Income and Technological Automation");
  const [text, setText] = useState(
    "Governments should establish a universal basic income because automation will displace 30 percent of routine jobs by 2030, according to recent economic studies. Furthermore, anyone who opposes this policy is an uneducated idiot who wants people to starve. Therefore, we either implement unconditional cash transfers immediately or society will completely collapse."
  );
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Modules 4, 5 & 6 • Argument Mining & Fallacy Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Argument & Fallacy Analysis Engine
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Extract claims, evaluate reasoning quality and evidence, identify 8 classical logical fallacies, and generate strategic counterarguments.
          </p>
        </div>

        {/* INPUT BOX */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Debate Topic</label>
            <input
              type="text"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Universal Basic Income"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Argument Body (Claim + Evidence + Reasoning)</label>
            <textarea
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your argument..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {text.trim().split(/\s+/).filter(Boolean).length} words • {text.length} characters
            </span>
            <button
              onClick={handleAnalyze}
              disabled={loading || text.length < 10}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              {loading ? "Analyzing Argument..." : "Run Multi-Dimensional Analysis"}
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* ANALYSIS RESULTS */}
        {analysis && (
          <div className="space-y-6">
            {/* 5 EVALUATION CRITERIA CARDS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900">5-Dimensional Evaluation Score</h2>
                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  Overall Strength: {analysis.evaluation?.argument_strength || analysis.argument_score}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Clarity", val: analysis.evaluation?.clarity, icon: "🔍" },
                  { label: "Relevance", val: analysis.evaluation?.relevance, icon: "🎯" },
                  { label: "Evidence Strength", val: analysis.evaluation?.evidence_strength, icon: "📊" },
                  { label: "Logical Consistency", val: analysis.evaluation?.logical_consistency, icon: "⚖️" },
                  { label: "Persuasiveness", val: analysis.evaluation?.persuasiveness, icon: "🔥" }
                ].map((crit) => (
                  <div key={crit.label} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <div className="text-lg mb-1">{crit.icon}</div>
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">{crit.label}</span>
                    <strong className="text-xl font-black text-slate-900 block mt-0.5">{crit.val}%</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* CLAIMS & EVIDENCE EXTRACTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Claims */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span>📌</span> Identified Claims ({analysis.claims?.length || 0})
                </h3>
                <div className="space-y-2.5">
                  {(analysis.claims || []).map((claim, idx) => (
                    <div key={idx} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-slate-800">
                      <span className="font-bold text-indigo-700 mr-2">Claim #{idx + 1}:</span>
                      {claim.sentence || claim}
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence & Reasoning */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span>🔬</span> Evidence & Reasoning Breakdown
                </h3>
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="block text-slate-900 mb-1">Evidence Markers Detected:</strong>
                    {analysis.evidence?.evidence_markers?.length > 0 ? (
                      <span className="text-indigo-700 font-semibold">{analysis.evidence.evidence_markers.join(", ")}</span>
                    ) : (
                      <span className="text-slate-500">No formal citation keywords found.</span>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="block text-slate-900 mb-1">Reasoning Connectors:</strong>
                    {analysis.reasoning?.reasoning_markers?.length > 0 ? (
                      <span className="text-indigo-700 font-semibold">{analysis.reasoning.reasoning_markers.join(", ")}</span>
                    ) : (
                      <span className="text-slate-500">No logical transitional conjunctions detected.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* LOGICAL FALLACIES DETECTION (MODULE 5) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>⚠️</span> Logical Fallacy Detection Engine
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  (analysis.fallacies || []).length > 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {analysis.fallacies?.length || 0} Fallacies Detected
                </span>
              </div>

              {analysis.fallacies?.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <span>✓</span> No classical logical fallacies were identified in this argument. Excellent reasoning discipline!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.fallacies.map((fal, idx) => (
                    <div key={idx} className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm text-rose-900 font-black">{fal.name}</strong>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-200/80 text-rose-800 px-2 py-0.5 rounded">
                          Fallacy Detected
                        </span>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        <strong>Explanation:</strong> {fal.explanation}
                      </p>
                      <div className="pt-2 border-t border-rose-200/80 text-xs text-rose-900 font-medium">
                        <strong>💡 How to correct:</strong> {fal.correction}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COUNTERARGUMENT GENERATION ENGINE (MODULE 6) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>⚔️</span> Counterargument & Rebuttal Generation Engine
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select one of the 5 counterargument perspectives specified in the platform architecture.
                  </p>
                </div>

                {/* TYPE SELECTOR */}
                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  {[
                    { id: "logical", label: "Logical Rebuttal" },
                    { id: "evidence", label: "Evidence-Based" },
                    { id: "ethical", label: "Ethical Stance" },
                    { id: "practical", label: "Practical Constraints" },
                    { id: "policy", label: "Policy Alternatives" }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setCounterType(btn.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded ${
                        counterType === btn.id
                          ? "bg-white text-indigo-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                {counterLoading ? "Generating Counterargument..." : `Generate ${counterType.toUpperCase()} Counterargument`}
              </button>

              {counterResult && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 mt-4 text-xs">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-indigo-700 block text-[10px]">
                      Opposing Rebuttal ({counterResult.type?.toUpperCase()})
                    </span>
                    <p className="text-sm text-slate-900 font-medium mt-1 leading-relaxed">
                      "{counterResult.counterargument}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-indigo-200/80">
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                      <strong className="block text-indigo-900 mb-0.5">Strategic Debate Tip:</strong>
                      <span className="text-slate-600">{counterResult.strategy}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                      <strong className="block text-indigo-900 mb-0.5">Challenge Question:</strong>
                      <span className="text-slate-600">{counterResult.challenge_question}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
