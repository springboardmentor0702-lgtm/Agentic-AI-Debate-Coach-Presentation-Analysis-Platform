import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Search, BookOpen, ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react';
export const ResearchPage = () => {
    const [topic, setTopic] = useState('CRISPR gene editing in human embryos and ethical boundaries');
    const [loading, setLoading] = useState(false);
    const [brief, setBrief] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadHistory();
    }, []);
    async function loadHistory() {
        try {
            const list = await api.getResearchHistory();
            setHistory(list || []);
            if (list && list.length > 0 && !brief) {
                setBrief(list[0]);
            }
        }
        catch (err) {
            console.error('Failed to load research history:', err);
        }
    }
    const handleResearch = async (e) => {
        e.preventDefault();
        if (!topic)
            return;
        setError(null);
        setLoading(true);
        try {
            const res = await api.generateResearchBrief(topic);
            setBrief(res);
            setHistory((prev) => [res, ...prev]);
        }
        catch (err) {
            setError(err.message || 'Research failed');
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
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
              AI Architecture #3: ReAct Autonomous Agent
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Search className="w-6 h-6 text-amber-400"/>
            Self-Directed Debate Research Agent
          </h1>
          <p className="text-xs text-slate-400">
            Autonomous ReAct cycle: Decides queries, invokes live Wikipedia REST API tool, evaluates information sufficiency, and synthesizes citations.
          </p>
        </div>
      </div>

      {/* Query Search Form */}
      <form onSubmit={handleResearch} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <label className="block text-xs font-semibold text-slate-300">
          Target Debate Topic / Motion for Dossier Investigation
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input type="text" required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter debate proposition..." className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-hidden"/>
          <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20">
            {loading ? (<>
                <Loader2 className="w-4 h-4 animate-spin"/>
                <span>ReAct Loop In Progress...</span>
              </>) : (<>
                <Search className="w-4 h-4"/>
                <span>Synthesize Dossier</span>
              </>)}
          </button>
        </div>

        {error && <div className="text-xs text-rose-400">{error}</div>}
      </form>

      {/* Research Dossier Output */}
      {brief && (<div className="space-y-6 animate-in fade-in duration-300">
          {/* Agent Observability Panel: Iterations & Tool Execution Metadata */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <RefreshCw className="w-4 h-4"/>
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Agent Autonomous Loop Completed
                </div>
                <div className="text-[11px] text-slate-400">
                  Total Tool Iterations: <strong className="text-amber-400 font-mono">{brief.iterations}</strong> • Wikipedia REST API invoked
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400">
                Stopping Condition: Sufficiency Reached
              </span>
            </div>
          </div>

          {/* Dossier Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Executive Summary & Contentions */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400"/>
                  Executive Research Brief
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {brief.brief?.executive_summary || 'Autonomous synthesis briefing.'}
                </p>

                {/* Affirmative vs Negative Contentions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30">
                    <span className="text-xs font-bold text-emerald-400 block mb-2">
                      Affirmative Warrants (PRO):
                    </span>
                    <div className="space-y-2">
                      {brief.brief?.affirmative_arguments?.map((a, i) => (<div key={i} className="text-xs text-slate-300">
                          <strong className="text-white block">{a.contention}</strong>
                          <span className="text-slate-400">{a.warrant}</span>
                          <span className="block text-[10px] text-emerald-500/80 mt-0.5 font-mono">
                            Ref: {a.source_ref}
                          </span>
                        </div>))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-800/30">
                    <span className="text-xs font-bold text-indigo-400 block mb-2">
                      Negative Warrants (CON):
                    </span>
                    <div className="space-y-2">
                      {brief.brief?.negative_arguments?.map((n, i) => (<div key={i} className="text-xs text-slate-300">
                          <strong className="text-white block">{n.contention}</strong>
                          <span className="text-slate-400">{n.warrant}</span>
                          <span className="block text-[10px] text-indigo-400/80 mt-0.5 font-mono">
                            Ref: {n.source_ref}
                          </span>
                        </div>))}
                    </div>
                  </div>
                </div>

                {/* Empirical Data Points */}
                {brief.brief?.empirical_data_points && (<div className="mt-4 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-xs font-bold text-amber-400 block mb-1.5">
                      Empirical Data Points & Case Studies:
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                      {brief.brief.empirical_data_points.map((pt, idx) => (<li key={idx}>{pt}</li>))}
                    </ul>
                  </div>)}
              </div>
            </div>

            {/* Verified Sources & History */}
            <div className="space-y-4">
              {/* Verified Sources */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400"/>
                  Verified External Citations
                </h3>
                <div className="space-y-2">
                  {brief.sources?.map((s, idx) => (<a key={idx} href={s.url} target="_blank" rel="noopener noreferrer" className="block p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 transition-colors text-xs">
                      <div className="font-semibold text-slate-200 flex items-center justify-between">
                        <span className="truncate">{s.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 shrink-0"/>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {s.snippet}
                      </p>
                    </a>))}
                </div>
              </div>

              {/* Research Dossier History */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Past Dossiers
                </h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {history.map((h) => (<button key={h.id} onClick={() => setBrief(h)} className={`w-full text-left p-2 rounded-lg text-xs truncate border transition-colors ${brief?.id === h.id
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'}`}>
                      {h.topic}
                    </button>))}
                </div>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
};
