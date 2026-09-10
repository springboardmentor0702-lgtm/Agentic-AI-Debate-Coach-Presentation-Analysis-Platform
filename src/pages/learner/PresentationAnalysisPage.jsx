import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { VoiceInput } from '../../components/speech/VoiceInput';
import { Mic, Activity, Loader2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
export const PresentationAnalysisPage = () => {
    const [title, setTitle] = useState('Final Keynote: Renewable Grid Decentralization');
    const [transcript, setTranscript] = useState('Um, good morning esteemed adjudicators. Today, like, I want to fundamentally address why renewable decentralized grids are, you know, not just ecologically superior, but economically resilient. Uh, when extreme climate events strike centralized power grids, millions lose power instantly. Decentralized microgrids prevent single-point failures.');
    const [durationSeconds, setDurationSeconds] = useState(120);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadHistory();
    }, []);
    async function loadHistory() {
        try {
            const list = await api.getPresentationHistory();
            setHistory(list || []);
            if (list && list.length > 0 && !result) {
                setResult(list[0]);
            }
        }
        catch (err) {
            console.error('Error loading presentations:', err);
        }
    }
    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!transcript)
            return;
        setError(null);
        setLoading(true);
        try {
            const res = await api.analyzePresentation({
                title,
                transcript,
                duration_seconds: durationSeconds
            });
            setResult(res);
            setHistory((prev) => [res, ...prev]);
        }
        catch (err) {
            setError(err.message || 'Speech analysis failed');
        }
        finally {
            setLoading(false);
        }
    };
    const radarData = result
        ? [
            { metric: 'Clarity', value: result.clarity_score || 85 },
            { metric: 'Confidence', value: result.confidence_score || 82 },
            { metric: 'Structure', value: result.structure_score || 88 },
            { metric: 'Pacing', value: Math.min(100, Math.max(50, 100 - Math.abs((result.words_per_minute || 140) - 140))) },
            { metric: 'Rhetoric', value: 84 }
        ]
        : [
            { metric: 'Clarity', value: 80 },
            { metric: 'Confidence', value: 75 },
            { metric: 'Structure', value: 85 },
            { metric: 'Pacing', value: 70 },
            { metric: 'Rhetoric', value: 80 }
        ];
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Voice & Speech Intelligence
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Mic className="w-6 h-6 text-amber-400"/>
            Presentation & Speech Delivery Analysis
          </h1>
          <p className="text-xs text-slate-400">
            Analyze cadence, speech velocity (WPM), filler word frequency, and structural rhetorical delivery.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Presentation Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden"/>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Seconds)</label>
            <input type="number" min={10} max={3600} required value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden"/>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300">Speech Transcript / Live Recording</label>
            <VoiceInput onTranscript={(txt) => setTranscript((prev) => prev + ' ' + txt)}/>
          </div>
          <textarea required rows={4} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Dictate with voice input or paste spoken transcript..." className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden"/>
        </div>

        {error && <div className="text-xs text-rose-400">{error}</div>}

        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs md:text-sm transition-all flex items-center gap-2 shadow-md shadow-amber-500/20">
          {loading ? (<>
              <Loader2 className="w-4 h-4 animate-spin"/>
              <span>Analyzing Speech Cadence & Fillers...</span>
            </>) : (<>
              <Activity className="w-4 h-4"/>
              <span>Evaluate Speech Metrics</span>
            </>)}
        </button>
      </form>

      {/* Analysis Output */}
      {result && (<div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Words Per Minute (WPM)</div>
              <div className="text-2xl md:text-3xl font-black text-amber-400 mt-1">
                {result.words_per_minute}
              </div>
              <div className="text-[10px] text-emerald-400">Target Range: 130 - 160 WPM</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Total Filler Words</div>
              <div className="text-2xl md:text-3xl font-black text-rose-400 mt-1">
                {result.filler_words?.reduce((acc, f) => acc + f.count, 0) || 0}
              </div>
              <div className="text-[10px] text-slate-500">Count in Speech</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Clarity Index</div>
              <div className="text-2xl md:text-3xl font-black text-indigo-400 mt-1">
                {result.clarity_score}/100
              </div>
              <div className="text-[10px] text-slate-500">Articulation Integrity</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Confidence Rating</div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">
                {result.confidence_score}/100
              </div>
              <div className="text-[10px] text-slate-500">Perceived Authority</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Radar Chart */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
              <h3 className="text-sm font-bold text-white mb-2 self-start flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400"/>
                Vocal & Rhetorical Multi-Dimensional Radar
              </h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155"/>
                    <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={11}/>
                    <PolarRadiusAxis domain={[0, 100]} stroke="#475569"/>
                    <Radar name="Learner" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Filler Words & Recommendations */}
            <div className="space-y-4">
              {/* Filler Words */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Detected Filler Words & Crutches
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {result.filler_words?.map((fw, idx) => (<div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                      <span className="text-slate-400 text-xs block capitalize">"{fw.word}"</span>
                      <span className="text-base font-bold text-amber-400">{fw.count}x</span>
                    </div>))}
                  {(!result.filler_words || result.filler_words.length === 0) && (<div className="text-xs text-emerald-400 col-span-3 py-2">
                      Zero filler words detected! Outstanding vocal discipline.
                    </div>)}
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Rhetorical Delivery Coaching Recommendations
                </h3>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {result.recommendations?.map((r, idx) => (<li key={idx}>{r}</li>))}
                </ul>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
};
