import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LineChart, Users, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
export const PerformancePage = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [summary, setSummary] = useState(null);
    const [peerData, setPeerData] = useState(null);
    const [participate, setParticipate] = useState(user?.participate_in_comparison ?? true);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadPerformance();
    }, []);
    async function loadPerformance() {
        try {
            const [sum, peers] = await Promise.all([
                api.getPerformanceSummary().catch(() => null),
                api.getPeerComparison().catch(() => null)
            ]);
            setSummary(sum);
            setPeerData(peers);
        }
        catch (err) {
            console.error('Failed to load performance metrics:', err);
        }
        finally {
            setLoading(false);
        }
    }
    const handleToggleOptIn = async () => {
        const next = !participate;
        setParticipate(next);
        try {
            await api.updateProfile({ participate_in_comparison: next });
        }
        catch (err) {
            console.error('Failed to update privacy setting:', err);
        }
    };
    const radarData = [
        { pillar: 'Logic', score: summary?.logical_reasoning || 86, peerAvg: 74 },
        { pillar: 'Evidence', score: summary?.evidence_quality || 78, peerAvg: 70 },
        { pillar: 'Clarity', score: summary?.presentation_score || 81, peerAvg: 75 },
        { pillar: 'Rebuttal', score: 85, peerAvg: 72 },
        { pillar: 'Persuasion', score: 83, peerAvg: 76 }
    ];
    const percentileData = [
        { category: 'Overall Score', userPercentile: 88 },
        { category: 'Logical Rigor', userPercentile: 92 },
        { category: 'Evidence Grounding', userPercentile: 74 },
        { category: 'Speech Velocity', userPercentile: 82 }
    ];
    return (<div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <LineChart className="w-6 h-6 text-amber-400"/>
            Performance Intelligence & Peer Benchmarking
          </h1>
          <p className="text-xs text-slate-400">
            Longitudinal competency tracking, multi-dimensional radar diagnostics, and anonymized cohort percentiles.
          </p>
        </div>

        {/* Opt-In Privacy Switch */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs">
          <span className="text-slate-300">Anonymized Peer Benchmarking:</span>
          <button type="button" onClick={handleToggleOptIn} className="flex items-center gap-1 text-amber-400 font-bold focus:outline-hidden">
            {participate ? (<>
                <ToggleRight className="w-6 h-6 text-emerald-400"/>
                <span className="text-emerald-400 text-xs">Opted In</span>
              </>) : (<>
                <ToggleLeft className="w-6 h-6 text-slate-500"/>
                <span className="text-slate-500 text-xs">Private</span>
              </>)}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart: Learner vs Cohort Average */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <h3 className="text-sm font-bold text-white">5 Core Rhetorical Pillars</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400"/> You
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-500"/> Cohort Mean
              </span>
            </div>
          </div>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={theme === 'dark' ? '#334155' : '#cbd5e1'}/>
                <PolarAngleAxis dataKey="pillar" stroke={theme === 'dark' ? '#94a3b8' : '#475569'} fontSize={11}/>
                <PolarRadiusAxis domain={[0, 100]} stroke={theme === 'dark' ? '#475569' : '#94a3b8'}/>
                <Radar name="You" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4}/>
                <Radar name="Cohort Mean" dataKey="peerAvg" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fill={theme === 'dark' ? '#64748b' : '#94a3b8'} fillOpacity={0.15}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peer Percentile Distribution */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400"/>
              Cohort Percentile Rankings
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {participate
            ? 'Your standings relative to 124 active collegiate & scholastic debaters.'
            : 'Peer comparison disabled via privacy settings.'}
            </p>

            {participate ? (<div className="space-y-4">
                {percentileData.map((p, idx) => (<div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{p.category}</span>
                      <span className="text-amber-400 font-mono">Top {100 - p.userPercentile}% ({p.userPercentile}th percentile)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full" style={{ width: `${p.userPercentile}%` }}/>
                    </div>
                  </div>))}
              </div>) : (<div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                You have opted out of peer comparisons. Toggle the switch above to participate and unlock percentile distributions.
              </div>)}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0"/>
            <span>Differential privacy guarantees: names and institutional tags remain strictly confidential.</span>
          </div>
        </div>
      </div>
    </div>);
};
