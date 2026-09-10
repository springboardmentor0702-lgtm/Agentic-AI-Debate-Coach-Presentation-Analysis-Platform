import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { VoiceInput } from '../../components/speech/VoiceInput';
import { Swords, Shield, Award, Send, Loader2, Users, CheckCircle, Clock } from 'lucide-react';
export const DebatePage = () => {
    const [activeTab, setActiveTab] = useState('ai');
    const [debates, setDebates] = useState([]);
    const [currentDebate, setCurrentDebate] = useState(null);
    // Creation form state
    const [topic, setTopic] = useState('Social media platforms should implement mandatory age verification for minors');
    const [userStance, setUserStance] = useState('pro');
    const [opponentEmail, setOpponentEmail] = useState('harikamondepulanka@gmail.com');
    const [speechText, setSpeechText] = useState('');
    const [loading, setLoading] = useState(false);
    const [submittingRound, setSubmittingRound] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    useEffect(() => {
        loadDebates();
    }, []);
    async function loadDebates() {
        try {
            const list = await api.getDebates();
            setDebates(list || []);
            if (list && list.length > 0 && !currentDebate) {
                setCurrentDebate(list[0]);
            }
        }
        catch (err) {
            console.error('Error loading debates:', err);
        }
    }
    const handleCreateDebate = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);
        try {
            const created = await api.createDebate({
                topic,
                mode: activeTab,
                user_stance: userStance,
                opponent_email: activeTab === 'human' ? opponentEmail : undefined
            });
            setDebates((prev) => [created, ...prev]);
            setCurrentDebate(created);
            setSpeechText('');
            if (activeTab === 'human') {
                setSuccessMessage(`Debate challenge created with ${created.opponent_name || opponentEmail}! You are in the live arena.`);
            }
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleRoundSubmit = async (e) => {
        e.preventDefault();
        if (!currentDebate || !speechText)
            return;
        setError(null);
        setSubmittingRound(true);
        try {
            await api.submitDebateRound(currentDebate.id, { speech_text: speechText });
            const updated = await api.getDebate(currentDebate.id);
            setCurrentDebate(updated);
            setSpeechText('');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmittingRound(false);
        }
    };
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              AI Architecture #2: Multi-Agent System
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Swords className="w-6 h-6 text-amber-400"/>
            Competitive Debate Arena
          </h1>
          <p className="text-xs text-slate-400">
            Autonomous Opponent Agent generates adaptive counter-speeches while the Chief Judge Agent evaluates 6 competitive criteria.
          </p>
        </div>

        {/* Tab Switcher: AI Simulator vs Human-vs-Human */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 self-start md:self-auto">
          <button type="button" onClick={() => setActiveTab('ai')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'ai' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'}`}>
            <Swords className="w-3.5 h-3.5"/>
            <span>AI Multi-Agent Simulation</span>
          </button>
          <button type="button" onClick={() => setActiveTab('human')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'human' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'}`}>
            <Users className="w-3.5 h-3.5"/>
            <span>Human vs Human Debate</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create & Active Sessions List */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {activeTab === 'ai' ? 'Initialize AI Simulation' : 'Challenge Peer to Debate'}
            </h3>
            <form onSubmit={handleCreateDebate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Debate Proposition</label>
                <input type="text" required value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden"/>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Your Stance</label>
                  <select value={userStance} onChange={(e) => setUserStance(e.target.value)} className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100">
                    <option value="pro">Affirmative (PRO)</option>
                    <option value="con">Negative (CON)</option>
                  </select>
                </div>

                {activeTab === 'human' && (<div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Peer Email</label>
                    <input type="email" required placeholder="e.g. harikamondepulanka@gmail.com" value={opponentEmail} onChange={(e) => setOpponentEmail(e.target.value)} className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden"/>
                  </div>)}
              </div>

              {activeTab === 'human' && (<div className="pt-1">
                  <div className="text-[10px] text-slate-400 mb-1.5">Quick Select Peers:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                { name: 'Harika', email: 'harikamondepulanka@gmail.com' },
                { name: 'Coach Marcus', email: 'coach@mindarena.ai' },
                { name: 'Dr. Thorne', email: 'adjudicator@mindarena.ai' },
                { name: 'Elena (Varsity)', email: 'learner@mindarena.ai' }
            ].map((p) => (<button key={p.email} type="button" onClick={() => setOpponentEmail(p.email)} className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${opponentEmail.toLowerCase() === p.email.toLowerCase()
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'}`}>
                        {p.name}
                      </button>))}
                  </div>
                </div>)}

              {error && <div className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">{error}</div>}
              {successMessage && (<div className="text-[11px] text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  {successMessage}
                </div>)}

              <button type="submit" disabled={loading} className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Swords className="w-3.5 h-3.5"/>}
                <span>{activeTab === 'ai' ? 'Launch Debate Arena' : 'Send Debate Invitation'}</span>
              </button>
            </form>
          </div>

          {/* Past/Active Debates List */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Debate Match Sessions
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {debates.map((d) => (<button key={d.id} onClick={() => setCurrentDebate(d)} className={`w-full text-left p-2.5 rounded-lg text-xs border transition-colors ${currentDebate?.id === d.id
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'}`}>
                  <div className="font-semibold truncate">{d.topic}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>{d.mode === 'ai' ? '🤖 AI Opponent' : '👤 Peer Match'}</span>
                    <span className="capitalize">{d.status}</span>
                  </div>
                </button>))}
              {debates.length === 0 && (<div className="text-xs text-slate-500 py-3 text-center">No debates yet.</div>)}
            </div>
          </div>
        </div>

        {/* Right Column: Active Arena Flow & Judge Adjudication */}
        <div className="lg:col-span-2 space-y-4">
          {currentDebate ? (<div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              {/* Session Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400">
                    Round {currentDebate.rounds?.length || 1} of {currentDebate.max_rounds}
                  </span>
                  <h2 className="text-base font-bold text-white mt-0.5">{currentDebate.topic}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>You ({currentDebate.user_stance.toUpperCase()})</span>
                    <span className="text-slate-600">vs</span>
                    <span>{currentDebate.opponent_name} ({currentDebate.opponent_stance?.toUpperCase()})</span>
                  </div>
                </div>

                {currentDebate.status === 'completed' && (<div className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                    <CheckCircle className="w-3.5 h-3.5"/>
                    <span>Tournament Concluded</span>
                  </div>)}
              </div>

              {/* Rounds Transcript & AI Judge Feedback */}
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {currentDebate.rounds?.map((r, idx) => (<div key={idx} className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800/80 pb-1.5">
                      <span className="text-amber-400">ROUND {r.round_number} TRANSCRIPT</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* User Speech */}
                    <div className="text-xs">
                      <span className="font-semibold text-emerald-400 block mb-1">
                        Your Speech ({currentDebate.user_stance?.toUpperCase()}):
                      </span>
                      <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                        {r.user_speech || r.speech_text}
                      </p>
                    </div>

                    {/* Opponent Speech */}
                    {r.opponent_speech && (<div className="text-xs">
                        <span className="font-semibold text-indigo-400 block mb-1">
                          Opponent Agent Counter-Speech ({currentDebate.opponent_stance?.toUpperCase()}):
                        </span>
                        <p className="text-slate-300 leading-relaxed bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-900/30">
                          {r.opponent_speech}
                        </p>
                      </div>)}

                    {/* Judge Agent Feedback */}
                    {r.judge_feedback && (<div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-amber-400"/>
                            Chief Tournament Judge Adjudication
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            Score: {r.judge_feedback.overall_score}/100
                          </span>
                        </div>

                        {/* 6 Dimensions Breakdown */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[10px] text-center font-mono">
                          <div className="p-1 rounded bg-slate-900 border border-slate-800">
                            <div className="text-slate-500">Rel</div>
                            <div className="text-white font-bold">{r.judge_feedback.relevance}</div>
                          </div>
                          <div className="p-1 rounded bg-slate-900 border border-slate-800">
                            <div className="text-slate-500">Evid</div>
                            <div className="text-white font-bold">{r.judge_feedback.evidence}</div>
                          </div>
                          <div className="p-1 rounded bg-slate-900 border border-slate-800">
                            <div className="text-slate-500">Logic</div>
                            <div className="text-white font-bold">{r.judge_feedback.logic}</div>
                          </div>
                          <div className="p-1 rounded bg-slate-900 border border-slate-800">
                            <div className="text-slate-500">Rebut</div>
                            <div className="text-white font-bold">{r.judge_feedback.rebuttal}</div>
                          </div>
                          <div className="p-1 rounded bg-slate-900 border border-slate-800">
                            <div className="text-slate-500">Clar</div>
                            <div className="text-white font-bold">{r.judge_feedback.clarity}</div>
                          </div>
                          <div className="p-1 rounded bg-slate-900 border border-slate-800">
                            <div className="text-slate-500">Pers</div>
                            <div className="text-white font-bold">{r.judge_feedback.persuasiveness}</div>
                          </div>
                        </div>

                        <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5 pt-1">
                          {r.judge_feedback.feedback?.map((fb, fIdx) => (<li key={fIdx}>{fb}</li>))}
                        </ul>
                      </div>)}
                  </div>))}
              </div>

              {/* Speech Submission Input */}
              {currentDebate.status !== 'completed' ? (<form onSubmit={handleRoundSubmit} className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      Deliver Speech for Round {(currentDebate.rounds?.length || 0) + 1}
                    </label>
                    <VoiceInput onTranscript={(txt) => setSpeechText((prev) => prev + ' ' + txt)}/>
                  </div>
                  <textarea required rows={3} value={speechText} onChange={(e) => setSpeechText(e.target.value)} placeholder="Deliver your argument or counter-rebuttal to the floor..." className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden"/>
                  <button type="submit" disabled={submittingRound} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5">
                    {submittingRound ? (<>
                        <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                        <span>Evaluating with Multi-Agent Nodes...</span>
                      </>) : (<>
                        <Send className="w-3.5 h-3.5"/>
                        <span>Deliver Speech to Floor</span>
                      </>)}
                  </button>
                </form>) : (<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Award className="w-4 h-4 text-emerald-400"/>
                    Tournament Final Verdict Issued
                  </div>
                  <p className="text-slate-300">
                    Winner:{' '}
                    <strong className="text-emerald-400 uppercase">
                      {currentDebate.final_verdict?.winner || 'User'}
                    </strong>
                    . Key Factor: {currentDebate.final_verdict?.key_deciding_factor}
                  </p>
                </div>)}
            </div>) : (<div className="p-12 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
              Select or initialize a debate to enter the live arena.
            </div>)}
        </div>
      </div>
    </div>);
};
