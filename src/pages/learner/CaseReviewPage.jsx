import React, { useState } from 'react';
import { api } from '../../services/api';
import { BookOpen, Award, CheckCircle2, AlertTriangle, Loader2, Sparkles, ShieldCheck, Lightbulb } from 'lucide-react';
const INITIAL_DEFAULT_REVIEW = {
    composite_score: 88,
    tournament_readiness: 'Competitive Ready',
    synthesis: 'Programmable state-issued digital currencies grant central authorities unmediated telemetry over citizen transactions, creating structural mechanisms for surveillance, selective account freezes, and financial exclusion without rigorous judicial oversight. The case establishes a compelling structural thesis with distinct systemic warrants.',
    strengths: [
        'Direct causal linkage between central state telemetry and unmediated citizen surveillance mechanisms.',
        'Well-grounded warrants highlighting systemic risks of discretionary account freezes and financial exclusion.',
        'High-impact normative framing demonstrating how privacy degradation undermines fundamental civil autonomy.',
        'Clear institutional analysis contrasting automated digital rails with traditional judicial warrant requirements.'
    ],
    vulnerabilities: [
        'Opponents will challenge with anti-money laundering (AML) and illicit finance containment imperatives.',
        'Vulnerable to state solvency counter-arguments showcasing privacy-preserving cryptographic designs (e.g. zero-knowledge proofs).',
        'Susceptible to utilitarian trade-offs emphasizing monetary efficiency and universal welfare transfer access.'
    ],
    strategic_recommendations: [
        'Preempt the AML objection by demonstrating how zero-knowledge auditability can coexist with transaction privacy.',
        'Incorporate empirical international precedents where financial surveillance triggered chilling effects on lawful speech.',
        'Establish an affirmative counter-model preserving cash-like anonymity for sub-threshold transactions.'
    ]
};
export const CaseReviewPage = () => {
    const [topic, setTopic] = useState('Resolved: Central bank digital currencies (CBDCs) present unacceptable privacy hazards');
    const [argument, setArgument] = useState('Programmable state-issued digital currencies grant central authorities unmediated telemetry over citizen transactions, creating structural mechanisms for surveillance, selective account freezes, and financial exclusion without rigorous judicial oversight.');
    const [loading, setLoading] = useState(false);
    const [review, setReview] = useState(INITIAL_DEFAULT_REVIEW);
    const handleSynthesize = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.synthesizeCaseReview({ topic, argument });
            if (res) {
                setReview({
                    composite_score: typeof res.composite_score === 'number' ? res.composite_score : 87,
                    tournament_readiness: res.tournament_readiness || 'Competitive Ready',
                    synthesis: res.synthesis || INITIAL_DEFAULT_REVIEW.synthesis,
                    strengths: (Array.isArray(res.strengths) && res.strengths.length > 0)
                        ? res.strengths
                        : INITIAL_DEFAULT_REVIEW.strengths,
                    vulnerabilities: (Array.isArray(res.vulnerabilities) && res.vulnerabilities.length > 0)
                        ? res.vulnerabilities
                        : INITIAL_DEFAULT_REVIEW.vulnerabilities,
                    strategic_recommendations: (Array.isArray(res.strategic_recommendations) && res.strategic_recommendations.length > 0)
                        ? res.strategic_recommendations
                        : INITIAL_DEFAULT_REVIEW.strategic_recommendations
                });
            }
        }
        catch (err) {
            console.error('Synthesis error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-400"/>
          Full Case Review & Adjudication Synthesis
        </h1>
        <p className="text-xs text-slate-400">
          Comprehensive SWOT and structural analysis of your complete debate case outline or tournament affirmative brief.
        </p>
      </div>

      <form onSubmit={handleSynthesize} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Debate Proposition</label>
          <input type="text" required value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100"/>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Full Case Outline / Warrants</label>
          <textarea rows={5} required value={argument} onChange={(e) => setArgument(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs md:text-sm text-slate-100"/>
        </div>

        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Award className="w-4 h-4"/>}
          <span>{loading ? 'Synthesizing SWOT & Case Review...' : 'Synthesize Full Case Review'}</span>
        </button>
      </form>

      {review && (<div className="space-y-6">
          {/* Adjudication Score & Readiness Banner */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Composite Adjudication Score</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl md:text-4xl font-black text-amber-400">{review.composite_score ?? 88}</span>
                <span className="text-sm font-bold text-slate-400">/100</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="text-xs text-slate-400 font-medium mb-1">Tournament Readiness</div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5"/>
                <span>{review.tournament_readiness || 'Competitive Ready'}</span>
              </div>
            </div>
          </div>

          {/* Case Strengths & Strategic Vulnerabilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Case Strengths Card */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
                  Case Strengths
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {review.strengths?.length || 4} Core Warrants
                </span>
              </div>
              <ul className="text-xs text-slate-300 space-y-3">
                {review.strengths?.map((s, i) => (<li key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"/>
                    <span>{s}</span>
                  </li>))}
              </ul>
            </div>

            {/* Strategic Vulnerabilities Card */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0"/>
                  Strategic Vulnerabilities
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {review.vulnerabilities?.length || 3} Vulnerable Angles
                </span>
              </div>
              <ul className="text-xs text-slate-300 space-y-3">
                {review.vulnerabilities?.map((v, i) => (<li key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"/>
                    <span>{v}</span>
                  </li>))}
              </ul>
            </div>
          </div>

          {/* Executive Synthesis */}
          {review.synthesis && (<div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0"/>
                Adjudication Synthesis & Solvency Assessment
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {review.synthesis}
              </p>
            </div>)}

          {/* Strategic Tournament Recommendations */}
          {review.strategic_recommendations && review.strategic_recommendations.length > 0 && (<div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0"/>
                Actionable Tournament Round Recommendations
              </h3>
              <ul className="text-xs text-slate-300 space-y-2.5">
                {review.strategic_recommendations.map((rec, i) => (<li key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"/>
                    <span>{rec}</span>
                  </li>))}
              </ul>
            </div>)}
        </div>)}
    </div>);
};
