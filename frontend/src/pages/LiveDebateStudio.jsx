import React, { useState } from 'react';
import { api } from '../services/api';
import AudioRecorder from '../components/AudioRecorder';
import ScoreRadar from '../components/ScoreRadar';
import { 
  Mic, Send, Sparkles, Award, ShieldAlert, Lightbulb, 
  CheckCircle2, RefreshCw, Download, FileText, ChevronRight, User, Bot,
  BookOpen, ThumbsUp, HelpCircle, X, Search, Zap
} from 'lucide-react';

export default function LiveDebateStudio() {
  const [inSession, setInSession] = useState(false);
  const [session, setSession] = useState(null);
  
  // Configuration
  const [topic, setTopic] = useState("Resolved: Schools should completely ban smartphones during class hours.");
  const [debateFormat, setDebateFormat] = useState("Oxford Debate");
  const [userPosition, setUserPosition] = useState("Affirmative");
  const [persona, setPersona] = useState("Dr. Eleanor Vance (Empirical Scholar)");

  // Live session state
  const [turns, setTurns] = useState([]);
  const [currentArgument, setCurrentArgument] = useState("");
  const [coachingHint, setCoachingHint] = useState("Open with a crisp thesis statement, establish your normative criteria, and provide at least one empirical warrant.");
  const [quickTips, setQuickTips] = useState(["State your primary claim in the first 15 seconds.", "Cite verified statistics to anchor credibility."]);
  const [detectedFallacies, setDetectedFallacies] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);

  // Glossary dictionary modal state
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [glossaryTerms, setGlossaryTerms] = useState([]);
  const [glossarySearch, setGlossarySearch] = useState("");

  // Scorecard modal state
  const [scorecard, setScorecard] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);

  const sampleTopics = [
    { label: "📱 Ban Phones in School", text: "Resolved: Schools should completely ban smartphones during class hours." },
    { label: "🍔 Fast Food Warning Labels", text: "Resolved: Fast food restaurants should be required to display graphic health warnings." },
    { label: "🤖 AI Creating Jobs", text: "Resolved: Artificial Intelligence will create more opportunities for young workers than it eliminates." },
    { label: "📚 Abolish Homework", text: "Resolved: Homework does more harm than good and should be abolished for K-12 students." },
    { label: "💰 Universal Basic Income", text: "Resolved: Governments should provide a guaranteed monthly Universal Basic Income to all adult citizens." },
    { label: "🏛️ AI in Municipal Courts", text: "Resolved: Autonomous AI decision systems should hold binding legal authority in municipal governance." }
  ];

  const handleOpenGlossary = async () => {
    setShowGlossaryModal(true);
    if (glossaryTerms.length === 0) {
      try {
        const terms = await api.getGlossary();
        setGlossaryTerms(terms);
      } catch (err) {
        console.error("Glossary fetch error:", err);
      }
    }
  };

  const handleStartDebate = async () => {
    try {
      const newSession = await api.createDebate({
        title: topic.slice(0, 50) + "...",
        topic,
        format: debateFormat,
        user_position: userPosition,
        opponent_type: "AI",
        ai_persona: persona,
        duration_minutes: 15
      });
      setSession(newSession);
      setTurns([]);
      setAiFeedback(null);
      setInSession(true);
    } catch (err) {
      alert("Failed to create debate: " + err.message);
    }
  };

  const handleSendTurn = async () => {
    if (!currentArgument.trim() || isProcessing) return;

    const userText = currentArgument.trim();
    setCurrentArgument("");
    setIsProcessing(true);

    try {
      const res = await api.executeSimulationTurn(session.id, userText);
      setTurns(prev => [...prev, res.user_turn, res.ai_turn]);
      setCoachingHint(res.live_coaching_hint);
      setQuickTips(res.quick_tips || []);
      setDetectedFallacies(res.detected_fallacies || []);
      if (res.ai_feedback) {
        setAiFeedback(res.ai_feedback);
      }
    } catch (err) {
      alert("Simulation turn failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConcludeAndScore = async () => {
    setIsProcessing(true);
    try {
      const score = await api.evaluateDebate({ session_id: session.id });
      setScorecard(score);
      setShowScoreModal(true);
      setInSession(false);
    } catch (err) {
      alert("Scoring failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportScore = async (fmt) => {
    try {
      const res = await api.exportReport("debate", session?.id, fmt);
      window.open(api.getDownloadUrl(res.filename), "_blank");
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Studio Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Live AI Debate Arena
              </span>
              <span className="text-xs text-slate-400 font-mono">Multi-Turn Simulation Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Interactive Debate Sparring Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Test your arguments turn-by-turn against specialized AI opponent personas with real-time coaching cues.
            </p>
          </div>

          {inSession && (
            <button
              onClick={handleConcludeAndScore}
              disabled={isProcessing || turns.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Award className="w-4 h-4" />
              <span>Conclude & Score Round</span>
            </button>
          )}
        </div>
      </div>

      {/* SETUP VIEW (Before Match Starts) */}
      {!inSession && (
        <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span>Configure Debate Session</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Debate Motion / Resolution</label>
              <textarea
                rows={2}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Popular Topics:</span>
                  {sampleTopics.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTopic(t.text)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-blue-600/30 hover:border-blue-500/40 text-slate-300 hover:text-white border border-slate-700/60 transition"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleOpenGlossary}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1 transition"
                >
                  <BookOpen className="w-3 h-3 text-amber-400" />
                  <span>📖 Word Helper</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Debate Format</label>
                <select
                  value={debateFormat}
                  onChange={e => setDebateFormat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Oxford Debate">Oxford Debate</option>
                  <option value="Parliamentary Debate">Parliamentary Debate</option>
                  <option value="One-on-One Debate">One-on-One Debate</option>
                  <option value="Policy Debate">Policy Debate</option>
                  <option value="Public Forum Debate">Public Forum Debate</option>
                  <option value="AI Debate Simulation">AI Debate Simulation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Assigned Stance</label>
                <select
                  value={userPosition}
                  onChange={e => setUserPosition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Affirmative">Affirmative (Pro-Motion)</option>
                  <option value="Negative">Negative (Oppose-Motion)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">AI Opponent Persona</label>
                <select
                  value={persona}
                  onChange={e => setPersona(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Dr. Eleanor Vance (Empirical Scholar)">Dr. Eleanor Vance (Empirical Scholar)</option>
                  <option value="Marcus Reed (Aggressive Cross-Examiner)">Marcus Reed (Aggressive Cross-Examiner)</option>
                  <option value="Prof. Sophia Lin (Socratic Inquirer)">Prof. Sophia Lin (Socratic Inquirer)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 text-xs text-slate-300 leading-relaxed">
              <strong className="text-blue-300 block mb-1">Debate Rules & Adjudication Standards:</strong>
              Turns alternate between you and your AI opponent. Speeches are analyzed for the 5 official criteria:
              Clarity, Relevance, Evidence, Logic, and Persuasiveness. At the end of the round, you receive an accredited weighted scorecard.
            </div>

            <button
              onClick={handleStartDebate}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition"
            >
              <Mic className="w-5 h-5" />
              <span>Enter Debate Chamber & Begin Match</span>
            </button>
          </div>
        </div>
      )}

      {/* LIVE DEBATE VIEW (When Match is Active) */}
      {inSession && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Debate Transcript Stream */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 font-semibold">Motion: </span>
                <span className="text-white font-bold">{topic}</span>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">{debateFormat}</span>
                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">{userPosition}</span>
              </div>
            </div>

            {/* Turn History List */}
            <div className="space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              {turns.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  The floor is open. Speak or type your opening argument below to begin round 1.
                </div>
              ) : (
                turns.map((turn, i) => {
                  const isUser = turn.speaker.includes("User");
                  return (
                    <div 
                      key={turn.id || i}
                      className={`flex gap-3 text-xs ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${
                        isUser 
                          ? "bg-blue-600 text-white rounded-tr-none" 
                          : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none"
                      }`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between gap-4 ${
                          isUser ? "text-blue-200" : "text-purple-300"
                        }`}>
                          <span>{turn.speaker}</span>
                          <span className="font-mono opacity-80">Turn #{turn.turn_number}</span>
                        </div>
                        <div className="leading-relaxed whitespace-pre-line text-sm">
                          {turn.content}
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {isProcessing && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-300 animate-pulse">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>AI Opponent ({persona}) is analyzing warrants and formulating rebuttal...</span>
                </div>
              )}
            </div>

            {/* User Speech & Input Station */}
            <div className="space-y-3">
              <AudioRecorder 
                value={currentArgument}
                onChange={(val) => setCurrentArgument(val)}
                onTranscriptReady={(text) => setCurrentArgument(text)}
                placeholder="Speak into microphone or type your counter-speech here..." 
              />

              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400">
                  Tip: Attack opponent's core warrants before introducing your new impact.
                </div>
                <button
                  type="button"
                  onClick={handleSendTurn}
                  disabled={!currentArgument.trim() || isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50"
                >
                  <span>Deliver Speech</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Live Coaching Cues & Fallacy Panel */}
          <div className="lg:col-span-4 space-y-5">

            {/* Quick Word Helper / Dictionary Launcher */}
            <button
              type="button"
              onClick={handleOpenGlossary}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-200 border border-amber-400/30 font-bold text-xs flex items-center justify-between shadow-lg transition group"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                <span>📖 Plain-English Debate Dictionary</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 font-mono">
                Easy Definitions
              </span>
            </button>

            {/* AI Coach Live Feedback Card (Praise, Constructive Tip, Difficult Words, Suggested Reply) */}
            {aiFeedback && (
              <div className="bg-gradient-to-b from-blue-950/70 via-indigo-950/40 to-slate-900 border border-blue-500/40 rounded-2xl p-5 shadow-2xl space-y-3.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-blue-300">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>AI Coach Live Feedback</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Turn #{turns.length}
                  </span>
                </div>

                {/* Praise */}
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-xs text-slate-200">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>What You Did Well:</span>
                  </div>
                  <p className="leading-relaxed text-slate-200">{aiFeedback.praise}</p>
                </div>

                {/* Constructive Tip */}
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40 text-xs text-slate-200">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>How to Win the Next Point:</span>
                  </div>
                  <p className="leading-relaxed text-slate-200">{aiFeedback.constructive_tip}</p>
                </div>

                {/* Difficult Words Made Simple */}
                {aiFeedback.difficult_words && aiFeedback.difficult_words.length > 0 && (
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs text-slate-200 space-y-2">
                    <div className="font-bold text-purple-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>Difficult Words Made Simple:</span>
                    </div>
                    <div className="space-y-2">
                      {aiFeedback.difficult_words.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-950/90 border border-purple-900/40 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-200">{item.term}</span>
                            <span className="text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/20">
                              {item.simple_name}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{item.plain_english}</p>
                          {item.example && (
                            <div className="text-[10px] text-slate-400 italic bg-slate-900/70 p-1.5 rounded border border-slate-800">
                              💡 Example: {item.example}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Next Reply */}
                {aiFeedback.suggested_reply && (
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Suggested Next Reply:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentArgument(aiFeedback.suggested_reply)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 shadow transition"
                        title="Insert into your speech input box"
                      >
                        <span>⚡ Insert in Speech</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-300 italic bg-slate-950/70 p-2 rounded border border-indigo-950 leading-relaxed">
                      "{aiFeedback.suggested_reply}"
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Real-Time Live Coaching Hint */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Strategic Judge's Cue</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-slate-200 leading-relaxed">
                {coachingHint}
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Quick Strategy Cues:</div>
                {quickTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fallacy Warnings */}
            {detectedFallacies.length > 0 && (
              <div className="bg-slate-900/90 border border-rose-900/50 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Fallacy Alert Triggered!</span>
                </div>
                {detectedFallacies.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs text-slate-200 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300">{f.fallacy_type}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-900/50 text-rose-200">
                        {f.severity} Severity
                      </span>
                    </div>
                    {f.simple_name && (
                      <div className="text-[11px] text-amber-300 font-semibold">
                        Simple Name: {f.simple_name}
                      </div>
                    )}
                    {f.simple_meaning && (
                      <div className="p-2 rounded bg-amber-950/30 border border-amber-900/30 text-[11px] text-amber-200 leading-relaxed">
                        💡 <strong>Plain English:</strong> {f.simple_meaning}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded">
                      "{f.quote}"
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      Remedy: {f.correction_suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Opponent Persona Dossier */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs space-y-2">
              <div className="font-bold text-white">Adversary Profile:</div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-semibold text-purple-300">{persona}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Style: High evidentiary demand, attacks causal inferential leaps.
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* COMPREHENSIVE SCORECARD MODAL */}
      {showScoreModal && scorecard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Official Adjudication Ballot</span>
                <h2 className="text-2xl font-black text-white">Debate Round Scorecard</h2>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-blue-400">{scorecard.overall_score}%</div>
                <div className="text-xs font-bold text-emerald-400">Grade: {scorecard.grade}</div>
              </div>
            </div>

            {/* Radar representation */}
            <div className="py-2 flex justify-center">
              <ScoreRadar 
                scores={{
                  argument_quality: scorecard.argument_quality,
                  evidence_usage: scorecard.evidence_usage,
                  logical_consistency: scorecard.logical_consistency,
                  rebuttal_effectiveness: scorecard.rebuttal_effectiveness,
                  communication_skills: scorecard.communication_skills
                }} 
                size={260} 
              />
            </div>

            {/* 5-Criteria Weighted Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Argument Quality (30%)</span>
                <strong className="text-white text-sm font-mono">{scorecard.argument_quality}%</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Evidence Usage (20%)</span>
                <strong className="text-white text-sm font-mono">{scorecard.evidence_usage}%</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Logical Consistency (20%)</span>
                <strong className="text-white text-sm font-mono">{scorecard.logical_consistency}%</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Rebuttal Effectiveness (15%)</span>
                <strong className="text-white text-sm font-mono">{scorecard.rebuttal_effectiveness}%</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Communication Skills (15%)</span>
                <strong className="text-white text-sm font-mono">{scorecard.communication_skills}%</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/50">
                <span className="text-blue-300 block text-[10px]">Weighted Composite</span>
                <strong className="text-blue-400 text-sm font-mono">{scorecard.overall_score}%</strong>
              </div>
            </div>

            {/* Feedback & Weaknesses */}
            <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="font-semibold text-white">Chief Adjudicator's Critique:</div>
              <p className="text-slate-300 leading-relaxed">{scorecard.feedback_summary}</p>
            </div>

            {/* Action buttons: Export PDF, CSV, Close */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportScore("pdf")}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Dossier</span>
                </button>
                <button
                  onClick={() => handleExportScore("csv")}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>CSV</span>
                </button>
              </div>

              <button
                onClick={() => setShowScoreModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Close Scorecard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PLAIN-ENGLISH DEBATE DICTIONARY MODAL */}
      {showGlossaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">Plain-English Debate Dictionary</h2>
                  <p className="text-[11px] text-slate-400">Difficult debate & logic terms explained in simple, everyday English.</p>
                </div>
              </div>
              <button
                onClick={() => setShowGlossaryModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                placeholder="Search words (e.g. Warrant, Rebuttal, Straw Man, Cadence, Externalities)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {glossaryTerms.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Loading debate definitions...
                </div>
              ) : (
                glossaryTerms
                  .filter(t => 
                    !glossarySearch || 
                    t.term?.toLowerCase().includes(glossarySearch.toLowerCase()) || 
                    t.simple_name?.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                    t.plain_english?.toLowerCase().includes(glossarySearch.toLowerCase())
                  )
                  .map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{item.term}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          {item.simple_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{item.plain_english}</p>
                      {item.example && (
                        <div className="text-xs text-slate-400 bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/80">
                          <strong className="text-amber-300">Everyday Example: </strong>
                          <span>{item.example}</span>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowGlossaryModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Close Dictionary
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
