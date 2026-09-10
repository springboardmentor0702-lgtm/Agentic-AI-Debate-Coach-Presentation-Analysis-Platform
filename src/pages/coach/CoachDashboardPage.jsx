import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ShieldCheck, MessageSquareQuote, Send, CheckCircle2, Clock, Award } from 'lucide-react';
export const CoachDashboardPage = () => {
    const [feedbackQueue, setFeedbackQueue] = useState([]);
    const [learnerEmail, setLearnerEmail] = useState('learner@mindarena.ai');
    const [feedbackText, setFeedbackText] = useState('');
    const [targetPillar, setTargetPillar] = useState('Evidence Grounding');
    const [score, setScore] = useState(85);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        loadFeedback();
    }, []);
    async function loadFeedback() {
        try {
            const res = await api.getCoachFeedback();
            setFeedbackQueue(res || []);
        }
        catch (err) {
            console.error('Error loading coach feedback:', err);
        }
    }
    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.submitCoachFeedback({
                learner_email: learnerEmail,
                feedback: feedbackText,
                score,
                target_pillar: targetPillar
            });
            setSubmitted(true);
            setFeedbackText('');
            loadFeedback();
            setTimeout(() => setSubmitted(false), 3000);
        }
        catch (err) {
            console.error('Feedback submit failed:', err);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Coach Oversight Console
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-amber-400"/>
          Debate Coach Mentorship & Feedback Center
        </h1>
        <p className="text-xs text-slate-400">
          Conduct qualitative reviews on learner arguments and deliver rubric-grounded coaching feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Dispatch Form */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-amber-400"/>
            Dispatch Coaching Critique to Learner
          </h2>

          <form onSubmit={handleSubmitFeedback} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Learner Email</label>
              <input type="email" required value={learnerEmail} onChange={(e) => setLearnerEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"/>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Competency</label>
                <select value={targetPillar} onChange={(e) => setTargetPillar(e.target.value)} className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100">
                  <option value="Evidence Grounding">Evidence Grounding</option>
                  <option value="Logical Structure">Logical Structure</option>
                  <option value="Rebuttal Agility">Rebuttal Agility</option>
                  <option value="Voice & Cadence">Voice & Cadence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rubric Rating (0-100)</label>
                <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Qualitative Feedback & Notes</label>
              <textarea rows={4} required placeholder="Detail tactical adjustments, cross-examination traps, or empirical citations needed..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"/>
            </div>

            {submitted && (<div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5"/>
                <span>Feedback dispatched to learner dashboard!</span>
              </div>)}

            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20">
              <Send className="w-3.5 h-3.5"/>
              <span>{loading ? 'Transmitting...' : 'Transmit Feedback'}</span>
            </button>
          </form>
        </div>

        {/* Feedback History & Review */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400"/>
            Dispatched Critique History
          </h2>

          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {feedbackQueue.map((fb, idx) => (<div key={idx} className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="font-semibold text-white text-sm">{fb.target_pillar}</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">{fb.score}/100</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{fb.feedback}</p>
                <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3"/>
                  <span>Logged in learner transcript</span>
                </div>
              </div>))}
            {feedbackQueue.length === 0 && (<div className="text-xs text-slate-500 py-12 text-center">
                No critiques dispatched yet. Transmit your first feedback on the left.
              </div>)}
          </div>
        </div>
      </div>
    </div>);
};
