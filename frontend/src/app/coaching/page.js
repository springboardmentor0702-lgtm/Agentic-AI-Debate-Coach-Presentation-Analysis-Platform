"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CoachingPage() {
  const [coachingData, setCoachingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoaching = async () => {
      try {
        const token = Cookies.get("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const res = await axios.post(
          `${API_BASE}/api/coaching`,
          {
            scores: {
              argument_quality: 82.0,
              reasoning_quality: 78.0,
              evidence_strength: 65.0,
              clarity_relevance: 85.0,
              persuasiveness: 72.0
            }
          },
          { headers }
        );
        setCoachingData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCoaching();
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
              Personalized Curriculum
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              5-Week Action Plan • Gap Mitigation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
            Personalized Coaching Pathways & Roadmap
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tailored skill development plans, gap mitigation drills, and structured 5-week progressive mastery roadmaps.
          </p>
        </div>

        <Link
          href="/simulation"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 self-start md:self-center"
        >
          Practice in Debate Arena →
        </Link>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center text-slate-500 font-semibold border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span>Synthesizing your personalized 5-week debater curriculum...</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* STRENGTHS & GROWTH AREAS BANNER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-3xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span>🌟</span> Demonstrable Strength
              </span>
              <strong className="text-xl font-black text-emerald-950 dark:text-emerald-100 block mt-1">
                {coachingData?.strongest_skill?.replace("_", " ").toUpperCase() || "CLARITY & RELEVANCE"}
              </strong>
              <p className="text-xs text-emerald-900 dark:text-emerald-300/90 leading-relaxed">
                You articulate propositions concisely and keep debate points tightly aligned with the central resolution without straying into tangential topics.
              </p>
            </div>

            <div className="p-6 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-3xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <span>⚡</span> Primary Growth Area
              </span>
              <strong className="text-xl font-black text-amber-950 dark:text-amber-100 block mt-1">
                {coachingData?.weakest_skill?.replace("_", " ").toUpperCase() || "EVIDENCE USAGE"}
              </strong>
              <p className="text-xs text-amber-900 dark:text-amber-300/90 leading-relaxed">
                Prioritize quantifiable empirical citations and peer-reviewed studies to maximize cross-examination credibility against aggressive opponents.
              </p>
            </div>
          </div>

          {/* 5-WEEK STRUCTURED ROADMAP */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  5-Week Structured Learning Roadmap
                </h2>
                <p className="text-xs text-slate-500">
                  Phased curriculum targeting argumentation, rebuttal power, and vocal mastery
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold w-max">
                Curriculum Active
              </span>
            </div>

            <div className="space-y-3.5">
              {(coachingData?.personalized_learning_plan || []).map((week) => (
                <div
                  key={week.week}
                  className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-600/20 shrink-0">
                      W{week.week}
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                        {week.focus}
                      </strong>
                      <span className="text-xs text-slate-600 dark:text-slate-400 block mt-1 leading-relaxed">
                        {week.activity}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      week.priority === 'high'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}>
                      {week.priority} Priority
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-1">Status: In Progress</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TARGETED DRILLS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Specific Coaching Directives & Practice Drills
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(coachingData?.recommendations || []).map((rec, idx) => (
                <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">{rec.title}</strong>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">Score: {rec.score}%</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rec.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
