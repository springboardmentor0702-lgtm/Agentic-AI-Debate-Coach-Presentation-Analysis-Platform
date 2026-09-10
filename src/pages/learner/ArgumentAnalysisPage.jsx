import React, { useState } from 'react';
import { api } from '../../services/api';
import { VoiceInput } from '../../components/speech/VoiceInput';
import { BrainCircuit, CheckCircle2, AlertTriangle, HelpCircle, Send, Loader2, Sparkles } from 'lucide-react';
export const ArgumentAnalysisPage = () => {
    const [topic, setTopic] = useState('Universal Basic Income is essential for mitigating automation-driven displacement');
    const [argument, setArgument] = useState('Rapid proliferation of generative AI and autonomous robotics renders traditional retraining programs obsolete. Implementing an unconditional basic income provides an absolute financial floor that sustains consumer demand and preserves human dignity without disincentivizing creative or entrepreneurial endeavor.');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!topic || !argument)
            return;
        setError(null);
        setLoading(true);
        try {
            const res = await api.analyzeArgument({ topic, argument });
            setAnalysis(res);
        }
        catch (err) {
            setError(err.message || 'Analysis failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              AI Architecture #1: Fixed Pipeline
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-amber-400"/>
            Deterministic Argument Analysis
          </h1>
          <p className="text-xs text-slate-400">
            Rigorous LangGraph pipeline: Claims extraction → Evidence audit → Logical structure → Fallacy detection → Counterarguments → Synthesis.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Debate Topic / Proposition</label>
          <input type="text" required value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-hidden"/>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300">Your Full Argument or Speech Segment</label>
            <VoiceInput onTranscript={(txt) => setArgument((prev) => prev + ' ' + txt)}/>
          </div>
          <textarea required rows={5} value={argument} onChange={(e) => setArgument(e.target.value)} placeholder="State your claim, premise warrants, and empirical evidence..." className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-hidden"/>
        </div>

        {error && (<div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>)}

        <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs md:text-sm transition-all shadow-md shadow-amber-500/20">
          {loading ? (<>
              <Loader2 className="w-4 h-4 animate-spin"/>
              <span>Executing Fixed LangGraph Pipeline...</span>
            </>) : (<>
              <Send className="w-4 h-4"/>
              <span>Execute Analysis Pipeline</span>
            </>)}
        </button>
      </form>

      {/* Structured Results View */}
      {analysis && (<div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Score Banner */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400">Overall Score</div>
              <div className="text-2xl md:text-3xl font-black text-amber-400 mt-1">{analysis.overall_score}</div>
              <div className="text-[10px] text-slate-500">Weighted Scale / 100</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400">Logical Strength</div>
              <div className="text-2xl md:text-3xl font-black text-indigo-400 mt-1">{analysis.logical_strength}</div>
              <div className="text-[10px] text-slate-500">Deductive Coherence</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400">Evidence Quality</div>
              <div className="text-2xl md:text-3xl font-black text-blue-400 mt-1">{analysis.evidence_quality}</div>
              <div className="text-[10px] text-slate-500">Empirical Backing</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400">Fallacy Count</div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">
                {analysis.fallacies?.length || 0}
              </div>
              <div className="text-[10px] text-slate-500">Detected Flaws</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Claims Extraction */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
                Extracted Claims & Warrants (Step 1)
              </h3>
              <div className="space-y-2">
                {analysis.claims?.map((c, i) => (<div key={i} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-200 capitalize">{c.type || 'Proposition'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium">
                        {c.validity || 'Sound'}
                      </span>
                    </div>
                    <div className="text-slate-400">{c.claim}</div>
                  </div>))}
              </div>
            </div>

            {/* Step 2: Logical Structure & Evidence */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400"/>
                Evidence & Logic Analysis (Steps 2 & 3)
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="font-semibold text-slate-200 block mb-1">Evidence Audit:</span>
                  <p className="text-slate-400 leading-relaxed">{analysis.evidence_analysis}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="font-semibold text-slate-200 block mb-1">Logical Structure:</span>
                  <p className="text-slate-400 leading-relaxed">{analysis.logical_structure}</p>
                </div>
              </div>
            </div>

            {/* Step 4: Fallacies Audit */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400"/>
                Fallacy Detection (Step 4)
              </h3>
              {analysis.fallacies?.length === 0 ? (<div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  No cognitive or formal fallacies detected in this argument segment. High structural integrity.
                </div>) : (<div className="space-y-2">
                  {analysis.fallacies?.map((f, i) => (<div key={i} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                      <div className="flex items-center justify-between text-rose-300 font-bold mb-1">
                        <span>{f.name}</span>
                        <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20">{f.severity}</span>
                      </div>
                      <p className="text-slate-300">{f.explanation}</p>
                    </div>))}
                </div>)}
            </div>

            {/* Step 5: Counterarguments Generated */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400"/>
                Anticipated Counterarguments (Step 5)
              </h3>
              <div className="space-y-2">
                {analysis.counterarguments?.map((ca, i) => (<div key={i} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                    <div className="text-indigo-300 font-semibold mb-1">{ca.angle} Angle:</div>
                    <div className="text-slate-300 mb-1">{ca.refutation}</div>
                    {ca.vulnerability && (<div className="text-[10px] text-amber-400">Vulnerability: {ca.vulnerability}</div>)}
                  </div>))}
              </div>
            </div>
          </div>
        </div>)}
    </div>);
};
