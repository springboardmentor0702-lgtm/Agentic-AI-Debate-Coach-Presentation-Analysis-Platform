import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { VoiceInput } from '../../components/speech/VoiceInput';
import { Bot, Send, Loader2, Wrench, Sparkles } from 'lucide-react';
export const AskCoachPage = () => {
    const [question, setQuestion] = useState('Why do I consistently drop rounds on evidence warrants even when my logical structure scores above 85?');
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState(null);
    const [pastSessions, setPastSessions] = useState([]);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadSessions();
    }, []);
    async function loadSessions() {
        try {
            const list = await api.getCoachingSessions();
            setPastSessions(list || []);
            if (list && list.length > 0 && !session) {
                setSession(list[0]);
            }
        }
        catch (err) {
            console.error('Failed to load coaching sessions:', err);
        }
    }
    const handleAsk = async (e) => {
        e.preventDefault();
        if (!question)
            return;
        setError(null);
        setLoading(true);
        try {
            const res = await api.askCoach(question);
            setSession(res);
            setPastSessions((prev) => [res, ...prev]);
        }
        catch (err) {
            setError(err.message || 'Coaching consultation failed');
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
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              AI Architecture #4: Tool-Calling AI Assistant
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Bot className="w-6 h-6 text-amber-400"/>
            Autonomous AI Assistant
          </h1>
          <p className="text-xs text-slate-400">
            Autonomous agent armed with 4 diagnostic tools: `get_performance_summary`, `get_debate_history`, `get_fallacy_patterns`, and `propose_training_goal`.
          </p>
        </div>
      </div>

      {/* Question Form */}
      <form onSubmit={handleAsk} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300">
            Ask Your AI Assistant Anything
          </label>
          <VoiceInput onTranscript={(txt) => setQuestion((prev) => prev + ' ' + txt)}/>
        </div>
        <textarea rows={3} required value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Inquire about recurring vulnerabilities, tournament strategy, evidence retrieval, or goal tracking..." className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-hidden"/>

        {error && <div className="text-xs text-rose-400">{error}</div>}

        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs md:text-sm transition-all flex items-center gap-2 shadow-md shadow-amber-500/20">
          {loading ? (<>
              <Loader2 className="w-4 h-4 animate-spin"/>
              <span>AI Assistant Invoking Diagnostic Tools...</span>
            </>) : (<>
              <Send className="w-4 h-4"/>
              <span>Consult AI Assistant</span>
            </>)}
        </button>
      </form>

      {/* Consultation Diagnosis Result */}
      {session && (<div className="space-y-6 animate-in fade-in duration-300">
          {/* Autonomous Tool Execution Observability Banner */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Wrench className="w-4 h-4"/>
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Autonomous Tool Selection Trace
                </div>
                <div className="text-[11px] text-slate-400">
                  Tools invoked dynamically based on your question semantics
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {session.tools_used?.map((t, idx) => (<span key={idx} className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300">
                  🛠️ {t}()
                </span>))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Coach Recommendation */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400"/>
                  AI Assistant Recommendation & Strategic Advice
                </h3>
                <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-3">
                  <p>{session.final_recommendation}</p>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses Breakdown */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  Identified Strengths
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {session.strengths?.map((s, i) => (<li key={i}>{s}</li>))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
                  Vulnerabilities to Rectify
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {session.weaknesses?.map((w, i) => (<li key={i}>{w}</li>))}
                </ul>
              </div>

              {/* Past Sessions */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Past Consultations
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {pastSessions.map((s) => (<button key={s.id} onClick={() => setSession(s)} className={`w-full text-left p-2 rounded-lg text-xs truncate border transition-colors ${session?.id === s.id
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'}`}>
                      {s.question}
                    </button>))}
                </div>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
};
