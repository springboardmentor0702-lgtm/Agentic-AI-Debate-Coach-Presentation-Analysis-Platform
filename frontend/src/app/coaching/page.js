"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CoachingPage() {
  const [coachingData, setCoachingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoaching = async () => {
      try {
        const token = Cookies.get("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Call coaching endpoint with user benchmark scores
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
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Recommendation & Coaching Pathways
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Personalized Coaching Pathways
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tailored skill development plans, gap mitigation drills, and structured 5-week improvement roadmaps.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500 font-medium border border-slate-200">
            Synthesizing personalized coaching pathways...
          </div>
        ) : (
          <div className="space-y-6">

            {/* STRENGTHS & WEAKNESSES BANNER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Top Strengths</span>
                <strong className="text-lg font-black text-emerald-950 block mt-1">
                  {coachingData?.strongest_skill?.replace("_", " ").toUpperCase() || "CLARITY & RELEVANCE"}
                </strong>
                <p className="text-xs text-emerald-800 mt-1">
                  You articulate ideas concisely and keep debate points tightly aligned with the central proposition.
                </p>
              </div>

              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Primary Growth Area</span>
                <strong className="text-lg font-black text-amber-950 block mt-1">
                  {coachingData?.weakest_skill?.replace("_", " ").toUpperCase() || "EVIDENCE USAGE"}
                </strong>
                <p className="text-xs text-amber-800 mt-1">
                  Prioritize quantifiable empirical citations to maximize cross-examination credibility.
                </p>
              </div>
            </div>

            {/* 5-WEEK STRUCTURED LEARNING PLAN */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">5-Week Structured Learning Roadmap</h2>
              <div className="space-y-3">
                {(coachingData?.personalized_learning_plan || []).map((week) => (
                  <div key={week.week} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                        W{week.week}
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-slate-900 block">{week.focus}</strong>
                        <span className="text-xs text-slate-600 block mt-0.5">{week.activity}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                        week.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {week.priority} Priority
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-1">Target: Next Debate</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TARGETED RECOMMENDATIONS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Specific Coaching Recommendations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(coachingData?.recommendations || []).map((rec, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-sm font-bold text-slate-900">{rec.title}</strong>
                      <span className="text-xs font-mono font-bold text-indigo-600">Score: {rec.score}%</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {rec.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
