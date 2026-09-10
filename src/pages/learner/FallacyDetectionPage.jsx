import React, { useState } from 'react';
import { api } from '../../services/api';
import { VoiceInput } from '../../components/speech/VoiceInput';
import { ShieldAlert, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
export const FallacyDetectionPage = () => {
    const [argument, setArgument] = useState('If we allow schools to introduce four-day work weeks, students will inevitably cease learning altogether, crime rates will skyrocket in the streets, and society as we know it will completely collapse.');
    const [loading, setLoading] = useState(false);
    const [fallacies, setFallacies] = useState(null);
    const handleDetect = async (e) => {
        e.preventDefault();
        if (!argument)
            return;
        setLoading(true);
        try {
            const res = await api.detectFallacies({ argument });
            setFallacies(res.fallacies || []);
        }
        catch (err) {
            console.error('Detection error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-400"/>
          Fallacy Detection Engine
        </h1>
        <p className="text-xs text-slate-400">
          Inoculate your speeches against logical fallacies: Slippery Slope, Ad Hominem, Straw Man, False Dilemma, and Circular Reasoning.
        </p>
      </div>

      <form onSubmit={handleDetect} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300">
            Paste Argument Segment or Claim for Scrutiny
          </label>
          <VoiceInput onTranscript={(txt) => setArgument((prev) => prev + ' ' + txt)}/>
        </div>
        <textarea rows={4} required value={argument} onChange={(e) => setArgument(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-hidden"/>
        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs md:text-sm transition-all flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldAlert className="w-4 h-4"/>}
          <span>Audit for Fallacies</span>
        </button>
      </form>

      {fallacies && (<div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fallacy Audit Results ({fallacies.length} Identified)
          </div>
          {fallacies.length === 0 ? (<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0"/>
              <span>No cognitive or formal fallacies detected in this statement.</span>
            </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fallacies.map((f, i) => (<div key={i} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400"/>
                      {f.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold uppercase">
                      {f.severity} Severity
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{f.explanation}</p>
                  {f.quote && (<div className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded border border-slate-800">
                      "{f.quote}"
                    </div>)}
                  {f.correction && (<div className="text-xs text-emerald-400 pt-1">
                      <strong>Rhetorical Fix:</strong> {f.correction}
                    </div>)}
                </div>))}
            </div>)}
        </div>)}
    </div>);
};
