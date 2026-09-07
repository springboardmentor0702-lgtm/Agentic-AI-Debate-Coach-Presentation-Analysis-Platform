import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  BookOpen, CheckCircle2, Circle, Award, ArrowRight, 
  Lightbulb, ShieldAlert, Sparkles, Play, Target
} from 'lucide-react';

export default function LearningPathways({ onNavigate }) {
  const [path, setPath] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPathData();
  }, []);

  const loadPathData = async () => {
    try {
      const [pathRes, recRes] = await Promise.all([
        api.getLearningPath(),
        api.getRecommendations()
      ]);
      setPath(pathRes);
      setRecommendations(recRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMilestone = async (milestoneId) => {
    try {
      const updated = await api.toggleMilestone(milestoneId);
      setPath(prev => ({
        ...prev,
        progress_percentage: updated.progress_percentage,
        milestones: updated.milestones
      }));
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Personalized Learning Pathways
              </span>
              <span className="text-xs text-slate-400 font-mono">Agentic Curriculum Generator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {path?.title || "Debate Mastery Track"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Targeted drills designed from your recent debate clashes, evidence citations, and speech cadence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-blue-400 font-mono">
                {path?.progress_percentage || 0}%
              </div>
              <div className="text-[11px] text-slate-400">Total Completion</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2.5 mt-6 overflow-hidden border border-slate-800">
          <div 
            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700" 
            style={{ width: `${path?.progress_percentage || 0}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Milestones Roadmap */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Curriculum Modules & Milestone Drills</span>
            </h2>
            <span className="text-xs text-slate-400">Click circle to complete drill</span>
          </div>

          <div className="space-y-3">
            {(path?.milestones || []).map((m, idx) => (
              <div 
                key={m.id || idx}
                className={`p-4 rounded-xl border transition-all ${
                  m.completed 
                    ? "bg-slate-950/40 border-slate-800 text-slate-400" 
                    : "bg-slate-950 border-blue-900/40 text-slate-200 shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => handleToggleMilestone(m.id)}
                      className="mt-0.5 text-slate-500 hover:text-blue-400 transition"
                    >
                      {m.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 hover:text-blue-400" />
                      )}
                    </button>
                    <div>
                      <div className={`text-sm font-bold ${m.completed ? "line-through text-slate-500" : "text-white"}`}>
                        {m.title}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {m.description}
                      </p>

                      {m.drills && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {m.drills.map((d, i) => (
                            <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                              Drill: {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                    {m.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Exercises & Personalized Coaching Tips */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Targeted Gauntlets */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Recommended Sparring Drills</span>
            </h2>

            <div className="space-y-2.5">
              {(recommendations?.recommended_exercises || []).map((ex, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-blue-400">{ex.name}</div>
                  <div className="text-[11px] text-slate-400">{ex.benefit}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Duration: {ex.duration}</span>
                    <button 
                      onClick={() => onNavigate("studio")}
                      className="text-blue-400 hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <span>Start Drill</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personalized Coaching Tips */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Tailored Coaching Notes</span>
            </h2>

            <div className="space-y-2 text-xs">
              {(recommendations?.personalized_coaching_tips || []).map((tip, i) => (
                <div key={i} className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-slate-300 leading-relaxed">
                  {tip}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
