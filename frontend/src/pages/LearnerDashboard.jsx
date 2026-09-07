import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ScoreRadar from '../components/ScoreRadar';
import { 
  Award, Mic, TrendingUp, Flame, Play, Clock, 
  ArrowUpRight, CheckCircle2, AlertCircle, Compass, ChevronRight
} from 'lucide-react';

export default function LearnerDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.getLearnerDashboard();
      setData(res);
    } catch (err) {
      console.error("Dashboard err:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const radar = data?.radar_data || {
    argument_quality: 84,
    evidence_usage: 74,
    logical_consistency: 88,
    rebuttal_effectiveness: 76,
    communication_skills: 86
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-slate-900 border border-blue-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Learner Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">Rank: Collegiate Varsity</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome back, {data?.user_name || "Debater"}!
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            Your logical consistency index reached an all-time high of <strong className="text-blue-400">88/100</strong>. Ready for your next round against our agentic opponent?
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => onNavigate("studio")}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 group"
            >
              <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Launch Live AI Debate</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("presentation")}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Speech Delivery Lab</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Score</span>
            <Award className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {data?.avg_debate_score || 84.5}%
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+4.2% from last week</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Debates Completed</span>
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {data?.completed_debates || 6}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Oxford & Parliamentary rounds
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Speaking Cadence</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {data?.avg_speech_wpm || 145} <span className="text-sm font-normal text-slate-400">WPM</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">
            Optimal Persuasive Zone
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Practice Streak</span>
            <Flame className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {data?.current_streak_days || 4} <span className="text-sm font-normal text-slate-400">Days</span>
          </div>
          <div className="text-[11px] text-rose-400 font-semibold mt-1">
            Top 10% daily consistency
          </div>
        </div>

      </div>

      {/* Main Grid: Skill Radar + Trend Line + Coaching Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Radar Chart (30% Q, 20% E, 20% L, 15% R, 15% C) */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-white">Weighted Skill Evaluation Radar</h2>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Exact 100% Model</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time measurement across all 5 official adjudication dimensions.
            </p>
          </div>

          <div className="py-2 flex justify-center">
            <ScoreRadar scores={radar} size={280} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Argument Quality (30%)</span>
              <strong className="text-white text-sm">{radar.argument_quality}%</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Evidence Usage (20%)</span>
              <strong className="text-white text-sm">{radar.evidence_usage}%</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Logical Consistency (20%)</span>
              <strong className="text-white text-sm">{radar.logical_consistency}%</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Rebuttals (15%)</span>
              <strong className="text-white text-sm">{radar.rebuttal_effectiveness}%</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Communication (15%)</span>
              <strong className="text-white text-sm">{radar.communication_skills}%</strong>
            </div>
            <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-800/40">
              <span className="text-blue-300 block text-[10px]">Composite Grade</span>
              <strong className="text-blue-400 text-sm">Grade A (84.5%)</strong>
            </div>
          </div>
        </div>

        {/* Trend + Coaching Insights */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Recent Debate Trend */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Debate Score Trajectory</h2>
            <p className="text-xs text-slate-400 mb-4">Historical round progression and composite ratings</p>

            <div className="space-y-3">
              {(data?.trend_history || []).map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono font-bold text-xs">
                      #{t.session_id}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Debate Match Round #{t.session_id}</div>
                      <div className="text-[11px] text-slate-400">{t.date}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden hidden sm:block">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full" 
                        style={{ width: `${t.overall_score}%` }}
                      />
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/20 font-mono">
                      {t.overall_score}% ({t.grade})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Coaching Insights */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Adjudicator Coaching Insights</span>
              </h2>
              <button 
                onClick={() => onNavigate("pathways")}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>View Full Curriculum</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {(data?.coaching_insights || []).map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 text-xs text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <p className="leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
