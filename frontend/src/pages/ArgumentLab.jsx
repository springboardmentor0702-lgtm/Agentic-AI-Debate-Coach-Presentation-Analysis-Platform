import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, 
  HelpCircle, ArrowRight, Lightbulb, Copy, Check, BookOpen, Search
} from 'lucide-react';

export default function ArgumentLab() {
  const [inputText, setInputText] = useState(
    "Don't listen to him, he is an incompetent idiot. Either we immediately ban all combustion engines or our entire planet will inevitably suffer total catastrophic collapse next year."
  );
  const [context, setContext] = useState("Environmental Policy & Energy Transition");

  // Output states
  const [analysis, setAnalysis] = useState(null);
  const [fallacies, setFallacies] = useState(null);
  const [rebuttals, setRebuttals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Glossary states
  const [showDictionary, setShowDictionary] = useState(false);
  const [glossaryTerms, setGlossaryTerms] = useState([]);
  const [glossarySearch, setGlossarySearch] = useState("");

  useEffect(() => {
    // Pre-fetch glossary
    api.getGlossary().then(terms => setGlossaryTerms(terms)).catch(() => {});
  }, []);

  const handleRunFullAnalysis = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const [argRes, falRes, rebRes] = await Promise.all([
        api.analyzeArgument(inputText),
        api.detectFallacies(inputText),
        api.generateCounterarguments(inputText, context)
      ]);
      setAnalysis(argRes);
      setFallacies(falRes);
      setRebuttals(rebRes);
    } catch (err) {
      alert("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyRebuttal = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            Argument Intelligence & Fallacy Lab
          </span>
          <span className="text-xs text-slate-400 font-mono">Dialectical Verification Suite</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Argument Mining, Fallacy Scanner & Rebuttal Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Deconstruct claims, flag all 8 logical fallacies, score against the 5 criteria, and generate 5 counter-tactics.
        </p>
      </div>

      {/* Input Workbench */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Argument or Debate Passage to Scrutinize</label>
            <textarea
              rows={3}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
          </div>

          <div className="sm:col-span-4 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Debate Motion / Context</label>
              <input
                type="text"
                value={context}
                onChange={e => setContext(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleRunFullAnalysis}
              disabled={loading || !inputText.trim()}
              className="w-full py-3 mt-3 sm:mt-0 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Synthesizing Argument..." : "Run Multi-Engine Inspection"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results View */}
      {analysis && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* 1. Evaluation Criteria Scores (5 Criteria) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between">
              <span>5 Core Evaluation Criteria</span>
              <span className="text-xs text-indigo-400 font-mono">Normalized 0-100</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">1. Clarity</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">{analysis.clarity_score}%</span>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${analysis.clarity_score}%` }} />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">2. Relevance</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">{analysis.relevance_score}%</span>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${analysis.relevance_score}%` }} />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">3. Evidence</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">{analysis.evidence_strength_score}%</span>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analysis.evidence_strength_score}%` }} />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">4. Logic Rigor</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">{analysis.logical_consistency_score}%</span>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${analysis.logical_consistency_score}%` }} />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">5. Persuasiveness</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">{analysis.persuasiveness_score}%</span>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${analysis.persuasiveness_score}%` }} />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <strong className="text-white">Extracted Claim: </strong>{analysis.claim}
            </div>
          </div>

          {/* 2. Logical Fallacy Detections (All 8 Fallacies Supported) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Fallacy Detection Audit</span>
              </h2>
              {fallacies?.detected_fallacies?.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800/40">
                  Credibility Penalty: -{fallacies.credibility_penalty}%
                </span>
              )}
            </div>

            {fallacies?.detected_fallacies?.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Zero logical fallacies detected. The line of argument complies with formal reasoning standards.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fallacies?.detected_fallacies?.map((f, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-rose-300 text-sm">{f.fallacy_type}</span>
                        {f.simple_name && (
                          <span className="text-[11px] text-amber-300 ml-2 font-medium">({f.simple_name})</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/50 text-rose-200">
                        {f.severity} Severity
                      </span>
                    </div>
                    {f.simple_meaning && (
                      <div className="p-2 rounded bg-amber-950/30 border border-amber-900/30 text-amber-200 text-xs leading-relaxed">
                        💡 <strong>Plain English:</strong> {f.simple_meaning}
                      </div>
                    )}
                    <div className="text-slate-400 italic bg-slate-950/60 p-2 rounded border border-rose-950">
                      "{f.quote}"
                    </div>
                    <p className="text-slate-300 leading-relaxed">{f.explanation}</p>
                    <div className="p-2 rounded bg-slate-950 text-emerald-400 border border-emerald-950">
                      <strong>Remedy: </strong>{f.correction_suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 5 Counterargument Paradigms */}
          {rebuttals?.rebuttals?.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  <span>5 Counterargument Paradigms</span>
                </h2>
                <span className="text-xs text-slate-400">Complete clash toolkit</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-slate-200">
                <strong className="text-amber-300">Recommended Strategy: </strong>
                {rebuttals.recommended_strategy}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rebuttals.rebuttals.map((r, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-blue-400">{r.argument_type}</span>
                        <button
                          onClick={() => copyRebuttal(r.rebuttal_text, i)}
                          className="p-1 rounded text-slate-400 hover:text-white transition"
                          title="Copy text"
                        >
                          {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{r.rebuttal_text}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div className="text-slate-400">
                        <strong className="text-purple-300">Cross-Exam Question: </strong>"{r.challenge_question}"
                      </div>
                      <div className="text-slate-400">
                        <strong className="text-amber-300">Tactic Tip: </strong>{r.strategy_tip}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. Plain-English Debate Terms Dictionary Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">📖 Plain-English Debate Dictionary</h2>
              <p className="text-xs text-slate-400">Master complex debate and argumentation vocabulary explained in everyday language.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDictionary(!showDictionary)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold self-start sm:self-auto transition"
          >
            {showDictionary ? "Hide Dictionary" : "Browse Words & Concepts"}
          </button>
        </div>

        {showDictionary && (
          <div className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                placeholder="Search words (e.g. Warrant, Rebuttal, Slippery Slope, Cadence, Externalities)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
              {glossaryTerms
                .filter(t => 
                  !glossarySearch || 
                  t.term?.toLowerCase().includes(glossarySearch.toLowerCase()) || 
                  t.simple_name?.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                  t.plain_english?.toLowerCase().includes(glossarySearch.toLowerCase())
                )
                .map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{item.term}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        {item.simple_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.plain_english}</p>
                    {item.example && (
                      <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <strong className="text-amber-300">Everyday Example: </strong>
                        <span>{item.example}</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
