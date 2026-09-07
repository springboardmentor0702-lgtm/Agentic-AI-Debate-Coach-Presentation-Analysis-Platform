import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Users, UserCheck, ShieldAlert, Award, ArrowUpRight, 
  Search, Check, AlertTriangle, FileText
} from 'lucide-react';

export default function CoachDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoachData();
  }, []);

  const loadCoachData = async () => {
    try {
      const res = await api.getCoachDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const filteredStudents = (data?.student_roster || []).filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-500/20 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Debate Coach Command Center
              </span>
              <span className="text-xs text-slate-400">Coach: {data?.coach_name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Student Progress & Evaluation Roster
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Monitor individual skill trajectories, identify common logical fallacies, and assign targeted drills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("reports")}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 flex items-center gap-2 transition"
            >
              <FileText className="w-4 h-4" />
              <span>Export Cohort Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Enrolled Students</div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">{data?.total_students || 1}</div>
          <div className="text-[11px] text-emerald-400 mt-1">100% active participants</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Pending Reviews</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">{data?.pending_evaluations || 2}</div>
          <div className="text-[11px] text-slate-400 mt-1">Oxford rounds submitted</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Active Drill Gauntlets</div>
          <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">{data?.active_coaching_sessions || 8}</div>
          <div className="text-[11px] text-purple-300 mt-1">Assigned this week</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Top Flagged Flaw</div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 mt-1">False Dilemma</div>
          <div className="text-[11px] text-rose-300/80 mt-1">7 occurrences detected</div>
        </div>
      </div>

      {/* Main Section: Student Roster Table + Fallacy Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Student Roster */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-white">Monitored Debaters</h2>
              <p className="text-xs text-slate-400">Track scores, experience levels, and primary skill gap</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search debaters..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Debater</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Avg Score</th>
                  <th className="p-3">Rounds</th>
                  <th className="p-3">Flagged Focus Area</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-500">{s.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        {s.experience}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        {s.average_score}%
                      </span>
                    </td>
                    <td className="p-3 font-mono">{s.debates_count}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/30">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>{s.flagged_skill_gap}</span>
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => onNavigate("pathways")}
                        className="px-2.5 py-1 rounded-md bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold text-[11px] transition"
                      >
                        Assign Drill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fallacy Distribution & Skill Gaps */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Cohort Fallacy Distribution</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">Observed logic infractions across 8 categories</p>

            <div className="space-y-2.5">
              {Object.entries(data?.fallacy_distribution || {}).map(([fname, count]) => (
                <div key={fname} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{fname}</span>
                    <span className="font-mono text-slate-400 font-bold">{count} hits</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full" 
                      style={{ width: `${Math.min(100, count * 12)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-3">Priority Coaching Interventions</h2>
            <div className="space-y-2.5 text-xs">
              {(data?.skill_gap_summary || []).map((gap, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{gap.gap}</div>
                    <div className="text-[10px] text-slate-400">{gap.affected_students} debaters require remediation</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gap.severity === 'High' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'}`}>
                    {gap.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
