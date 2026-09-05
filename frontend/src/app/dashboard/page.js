"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("learner");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async (roleView) => {
    setLoading(true);
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      if (!user) {
        const userRes = await axios.get(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userRes.data);
        if (roleView === undefined) {
          const userRole = userRes.data.role?.toLowerCase() || "learner";
          roleView = userRole.includes("coach") ? "coach" : userRole.includes("educator") ? "educator" : userRole.includes("admin") ? "admin" : "learner";
          setActiveTab(roleView);
        }
      }

      const res = await axios.get(`${API_BASE}/api/dashboard?role_view=${roleView || activeTab}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        Cookies.remove("token");
        router.push("/login");
      } else {
        setError("Failed to load dashboard data. Ensure backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleTabSwitch = (tabKey) => {
    setActiveTab(tabKey);
    fetchDashboard(tabKey);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* HERO EXECUTIVE BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-4 -bottom-4 w-60 h-60 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide flex items-center gap-1.5">
                <span>⚡</span> Debater Command Center
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                🔥 14-Day Practice Streak
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold">
                Top 8% Cohort
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Welcome back, {user?.name || "Debater"}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track multi-format debate sessions, eliminate cognitive fallacies, and master high-stakes presentation delivery through continuous agentic coaching.
            </p>
          </div>

          {/* QUICK LAUNCH ACTIONS */}
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            <Link
              href="/simulation"
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
            >
              <span>🤖</span>
              <span>New AI Debate</span>
            </Link>
            <Link
              href="/presentation"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl backdrop-blur-sm border border-white/15 transition-all transform hover:-translate-y-0.5"
            >
              <span>🎙️</span>
              <span>Speech Studio</span>
            </Link>
            <Link
              href="/analyze"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl backdrop-blur-sm border border-white/15 transition-all transform hover:-translate-y-0.5"
            >
              <span>🔍</span>
              <span>Analyze Argument</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ROLE ADAPTIVE SEGMENTED TABS */}
      <div className="flex bg-slate-200/80 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full md:w-max border border-slate-300/80 dark:border-slate-700/80 shadow-2xs">
        {[
          { id: "learner", label: "Learner View", icon: "🎓" },
          { id: "coach", label: "Debate Coach", icon: "🧑‍🏫" },
          { id: "educator", label: "Educator Cohort", icon: "🏫" },
          { id: "admin", label: "Admin Console", icon: "🛡️" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 text-center text-slate-500 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span>Syncing platform telemetry & AI model benchmarks...</span>
        </div>
      ) : (
        <>
          {/* ========================================================
              1. LEARNER DASHBOARD VIEW
              ======================================================== */}
          {activeTab === "learner" && (
            <div className="space-y-6">
              {/* METRICS ROW */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Overall Weighted Score */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-glow">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Weighted Performance
                    </span>
                    <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs">
                      ⚖️
                    </span>
                  </div>
                  <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                    {dashboardData?.performance_scores?.overall || 82}%
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>↑ +5.4%</span>
                    <span className="text-slate-400 font-normal">vs last month</span>
                  </div>
                </div>

                {/* 2. Debates Completed */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-glow">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Debates Completed
                    </span>
                    <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs">
                      🏆
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                    {dashboardData?.stats?.total_debates || 6}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Across 3 parliamentary formats
                  </div>
                </div>

                {/* 3. Speeches Analyzed */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-glow">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Speech Studio
                    </span>
                    <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-xs">
                      🎙️
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                    {dashboardData?.stats?.total_presentations || 4}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Avg Cadence: <strong className="text-slate-800 dark:text-slate-200">144 WPM</strong>
                  </div>
                </div>

                {/* 4. Fallacy Defense Rate */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-glow">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Fallacy Defense Rate
                    </span>
                    <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs">
                      🛡️
                    </span>
                  </div>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    94%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    8 Classical fallacies tracked
                  </div>
                </div>
              </div>

              {/* WEIGHTED PERFORMANCE MATRIX & COACHING INSIGHTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 5-CRITERIA SCORING BREAKDOWN */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Weighted Performance Scoring Engine
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Official 30/20/20/15/15 rubric defined in platform specification
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold w-max">
                      Composite: {dashboardData?.performance_scores?.overall || 82}%
                    </span>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "Argument Quality", weight: 30, score: dashboardData?.performance_scores?.argument_quality || 82, color: "from-indigo-600 to-indigo-500" },
                      { label: "Evidence Usage", weight: 20, score: dashboardData?.performance_scores?.evidence_usage || 74, color: "from-blue-600 to-cyan-500" },
                      { label: "Logical Consistency", weight: 20, score: dashboardData?.performance_scores?.logical_consistency || 80, color: "from-emerald-600 to-teal-500" },
                      { label: "Rebuttal Effectiveness", weight: 15, score: dashboardData?.performance_scores?.rebuttal_effectiveness || 75, color: "from-purple-600 to-pink-500" },
                      { label: "Communication Skills", weight: 15, score: dashboardData?.performance_scores?.communication_skills || 85, color: "from-amber-500 to-orange-500" },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{item.label} <span className="text-slate-400 font-normal">({item.weight}% weight)</span></span>
                          <span className="font-mono">{item.score} / 100</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-mono">Formula: 30% Arg + 20% Evid + 20% Logic + 15% Rebut + 15% Comm</span>
                    <Link href="/reports" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                      Audit Trail Details →
                    </Link>
                  </div>
                </div>

                {/* COACHING INSIGHTS */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>💡</span> AI Coach Insights
                      </h2>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                        Live
                      </span>
                    </div>

                    <div className="space-y-3 mt-4">
                      {(dashboardData?.coaching_insights || []).map((insight, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                        >
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link
                    href="/coaching"
                    className="w-full text-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20"
                  >
                    Open 5-Week Action Plan →
                  </Link>
                </div>
              </div>

              {/* RECENT DEBATES TABLE */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Recent Debate Sessions
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Logged debates across Parliamentary, Oxford, and Policy formats
                    </p>
                  </div>
                  <Link
                    href="/simulation"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    + Launch New Simulation
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-bold">Debate Topic</th>
                        <th className="py-3 px-4 font-bold">Format</th>
                        <th className="py-3 px-4 font-bold">Position</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold">Score</th>
                        <th className="py-3 px-4 font-bold">Date</th>
                        <th className="py-3 px-4 font-bold text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(dashboardData?.debate_history || []).map((session, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                            {session.topic}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {session.format}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              session.position === 'for'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            }`}>
                              {session.position?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {session.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {session.score}%
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                            {session.date}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href="/reports"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                            >
                              PDF →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              2. DEBATE COACH DASHBOARD VIEW
              ======================================================== */}
          {activeTab === "coach" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Student Cohort Progress Monitoring
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-bold">Student Name</th>
                        <th className="py-3 px-4 font-bold">Email</th>
                        <th className="py-3 px-4 font-bold">Experience</th>
                        <th className="py-3 px-4 font-bold">Debates</th>
                        <th className="py-3 px-4 font-bold">Avg Score</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(dashboardData?.student_progress || []).map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{st.name}</td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{st.email}</td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 capitalize">{st.experience_level}</td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{st.debates_count}</td>
                          <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">{st.avg_score}%</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              {st.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Cohort Skill Gap Analysis
                  </h2>
                  <div className="space-y-3">
                    {(dashboardData?.skill_gap_analysis || []).map((gap, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div>
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{gap.skill}</strong>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Cohort Avg: {gap.cohort_average}% vs Target: {gap.benchmark}%</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gap.gap < 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                            {gap.gap > 0 ? `+${gap.gap}%` : `${gap.gap}%`}
                          </span>
                          <span className="block text-[10px] text-slate-400 uppercase mt-0.5">{gap.priority} Priority</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Coach Directives & Action Items
                  </h2>
                  <div className="space-y-3">
                    {(dashboardData?.coaching_recommendations || []).map((rec, idx) => (
                      <div key={idx} className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-950 dark:text-indigo-200">
                        🎯 {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              3. EDUCATOR DASHBOARD VIEW
              ======================================================== */}
          {activeTab === "educator" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Enrolled Students</span>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{dashboardData?.class_analytics?.total_enrolled || 34}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Active This Week</span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{dashboardData?.class_analytics?.active_this_week || 28}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Class Average</span>
                  <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{dashboardData?.class_analytics?.class_average_score || 81.3}%</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Total Debates</span>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{dashboardData?.class_analytics?.total_debates_conducted || 142}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Student Leaderboard & Cohort Rankings
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-bold">Rank</th>
                        <th className="py-3 px-4 font-bold">Student</th>
                        <th className="py-3 px-4 font-bold">Debates</th>
                        <th className="py-3 px-4 font-bold">Speeches</th>
                        <th className="py-3 px-4 font-bold">Debate Avg</th>
                        <th className="py-3 px-4 font-bold">Speech Avg</th>
                        <th className="py-3 px-4 font-bold">Overall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(dashboardData?.student_rankings || []).map((rank) => (
                        <tr key={rank.rank} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-black text-indigo-600 dark:text-indigo-400">#{rank.rank}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{rank.name}</td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{rank.debates}</td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{rank.presentations}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{rank.debate_avg}%</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{rank.speech_avg}%</td>
                          <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">{rank.overall}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              4. ADMIN DASHBOARD VIEW
              ======================================================== */}
          {activeTab === "admin" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Platform Users</span>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{dashboardData?.platform_analytics?.total_users || 42}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Debate Sessions</span>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{dashboardData?.platform_analytics?.total_debate_sessions || 186}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">System Uptime</span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{dashboardData?.platform_analytics?.system_uptime || "99.98%"}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">API Success Rate</span>
                  <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{dashboardData?.platform_analytics?.api_success_rate || "99.8%"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    AI Model Telemetry & Latency
                  </h2>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-slate-600 dark:text-slate-400">LLM Reasoning Engine</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">Healthy (Active)</strong>
                    </div>
                    <div className="flex justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-slate-600 dark:text-slate-400">Inference Latency</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{dashboardData?.ai_model_monitoring?.average_inference_latency_ms || 284} ms</strong>
                    </div>
                    <div className="flex justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-slate-600 dark:text-slate-400">Speech-to-Text Model</span>
                      <strong className="text-slate-800 dark:text-slate-200">Native Audio Engine Ready</strong>
                    </div>
                    <div className="flex justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-slate-600 dark:text-slate-400">Fallacy Engine</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">8 Supported Fallacies Active</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Live System Event Audit
                  </h2>
                  <div className="space-y-2 text-xs font-mono">
                    {(dashboardData?.system_reports || []).map((rpt, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg flex justify-between">
                        <span className="text-slate-700 dark:text-slate-300">{rpt.event}</span>
                        <span className="text-slate-400">{new Date(rpt.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
