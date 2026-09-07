import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  GraduationCap, Trophy, BarChart3, Download, Award, 
  Users, CheckCircle2, TrendingUp, FileSpreadsheet
} from 'lucide-react';

export default function EducatorDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEducatorData();
  }, []);

  const loadEducatorData = async () => {
    try {
      const res = await api.getEducatorDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCohort = async (fmt) => {
    try {
      const res = await api.exportReport("progress", null, fmt);
      window.open(api.getDownloadUrl(res.filename), "_blank");
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/50 via-teal-950/30 to-slate-900 border border-emerald-500/20 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Educator Portal
              </span>
              <span className="text-xs text-slate-400">{data?.class_name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Class Cohort Intelligence & Rankings
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Aggregate dialectical performance, grading distributions, and institutional accreditation analytics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportCohort("pdf")}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Dossier (PDF)</span>
            </button>
            <button
              onClick={() => handleExportCohort("csv")}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cohort KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Class Average Score</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{data?.cohort_average_score}%</div>
          <div className="text-[11px] text-emerald-300 mt-1">Grade A- benchmark</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Curriculum Completion</div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">{data?.cohort_completion_rate}%</div>
          <div className="text-[11px] text-emerald-400 mt-1">+6% ahead of schedule</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Enrolled Students</div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">{data?.enrolled_students || 4}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active collegiate debaters</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-semibold uppercase">Passing Ratio</div>
          <div className="text-2xl sm:text-3xl font-black text-teal-400 mt-1">100%</div>
          <div className="text-[11px] text-teal-300 mt-1">Zero students under risk</div>
        </div>
      </div>

      {/* Grid: Rankings Table + Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Student Leaderboard */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Classroom Rankings & Leaderboard</span>
              </h2>
              <p className="text-xs text-slate-400">Ranked by weighted composite debate performance</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Official Fall 2026</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Weighted Score</th>
                  <th className="p-3">Rounds Won</th>
                  <th className="p-3">Standing Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(data?.student_rankings || []).map((s) => (
                  <tr key={s.rank} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-sm">
                      {s.rank === 1 && <span className="text-amber-400">🥇 #1</span>}
                      {s.rank === 2 && <span className="text-slate-300">🥈 #2</span>}
                      {s.rank === 3 && <span className="text-amber-600">🥉 #3</span>}
                      {s.rank > 3 && <span className="text-slate-500">#{s.rank}</span>}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-500">{s.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {s.score}%
                      </span>
                    </td>
                    <td className="p-3 font-mono">{s.debates_completed}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        s.tier === "Gold" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        s.tier === "Silver" ? "bg-slate-400/20 text-slate-200 border border-slate-400/30" :
                        "bg-amber-900/20 text-amber-500 border border-amber-800/30"
                      }`}>
                        {s.tier} Honor Roll
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade Distribution & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Grade Distribution</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">Class score bracket breakdown</p>

            <div className="space-y-3">
              {Object.entries(data?.grade_distribution || {}).map(([gradeRange, count]) => (
                <div key={gradeRange} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{gradeRange}</span>
                    <span className="font-mono text-emerald-400 font-bold">{count} debaters</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" 
                      style={{ width: `${Math.min(100, count * 22)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-2">Institutional Actions</h2>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => handleExportCohort("pdf")}
                className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-200 transition flex items-center justify-between"
              >
                <span>Download Semester Accreditation Packet</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate("reports")}
                className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-200 transition flex items-center justify-between"
              >
                <span>Audit Presentation Audio Metrics</span>
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
