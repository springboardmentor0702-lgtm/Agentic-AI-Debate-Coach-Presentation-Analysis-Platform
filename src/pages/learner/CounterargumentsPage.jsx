import React, { useState } from 'react';
import { api } from '../../services/api';
import { VoiceInput } from '../../components/speech/VoiceInput';
import { MessageSquareQuote, Shield, Loader2, Sparkles } from 'lucide-react';
export const CounterargumentsPage = () => {
    const [topic, setTopic] = useState('Carbon taxes are the most effective economic mechanism to reduce emissions');
    const [argument, setArgument] = useState('By putting an escalating price on carbon pollution, we harness market dynamics to disincentivize heavy emitters while revenue recycling neutralizes the regressive impact on lower-income households.');
    const [loading, setLoading] = useState(false);
    const [counters, setCounters] = useState(null);
    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic || !argument)
            return;
        setLoading(true);
        try {
            const res = await api.generateCounterarguments({ topic, argument });
            setCounters(res.counterarguments || []);
        }
        catch (err) {
            console.error('Counterargument generation failed:', err);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <MessageSquareQuote className="w-6 h-6 text-indigo-400"/>
          Proactive Counterargument Generator
        </h1>
        <p className="text-xs text-slate-400">
          Stress-test your propositions by generating strong opposing angles, refutations, and anticipated vulnerabilities.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Debate Proposition</label>
          <input type="text" required value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden"/>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300">Your Affirmative Case Claim</label>
            <VoiceInput onTranscript={(txt) => setArgument((prev) => prev + ' ' + txt)}/>
          </div>
          <textarea rows={4} required value={argument} onChange={(e) => setArgument(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden"/>
        </div>

        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs md:text-sm transition-all flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Shield className="w-4 h-4"/>}
          <span>Synthesize Opposing Angles</span>
        </button>
      </form>

      {counters && (<div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Synthesized Opposing Counterarguments ({counters.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {counters.map((c, idx) => (<div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400"/>
                  {c.angle} Angle
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{c.refutation}</p>
                {c.vulnerability && (<div className="pt-2 border-t border-slate-800/80 text-[11px] text-amber-400">
                    <strong>Vulnerability:</strong> {c.vulnerability}
                  </div>)}
              </div>))}
          </div>
        </div>)}
    </div>);
};
