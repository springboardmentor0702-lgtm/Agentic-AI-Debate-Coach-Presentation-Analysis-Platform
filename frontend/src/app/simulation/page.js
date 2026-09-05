"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FORMATS = [
  { id: "Oxford Debate", label: "Oxford Debate", desc: "Strict affirmative vs opposition proposition" },
  { id: "Parliamentary Debate", label: "Parliamentary Debate", desc: "Government vs loyal opposition with points of information" },
  { id: "Policy Debate", label: "Policy Debate", desc: "Empirical evidence & structural policy harms" },
  { id: "Public Forum Debate", label: "Public Forum Debate", desc: "Accessible crossfire on urgent current issues" },
  { id: "One-on-One Debate", label: "One-on-One Match", desc: "Rapid direct rebuttal duel" },
  { id: "AI Debate Simulation", label: "Autonomous AI Arena", desc: "Open dynamic dialectic rounds" }
];

const PRESET_TOPICS = [
  "Universal Basic Income to Mitigate AI Job Displacement",
  "Mandatory International Governance and Audits for Frontier AI",
  "Rapid Nuclear Energy Expansion for Global Net-Zero Goals",
  "Decentralized Social Media Platforms to Safeguard Free Expression"
];

const PERSONAS = [
  {
    id: "skeptical",
    name: "Dr. Ethan Vance",
    role: "Skeptical Analyst",
    badge: "Master / Empirical",
    desc: "Ruthlessly dissects unverified data points, correlational errors, and ungrounded claims.",
    avatar: "🔬",
    color: "from-blue-600 to-indigo-700"
  },
  {
    id: "aggressive",
    name: "Seraphina Stone",
    role: "Passionate Ideologue",
    badge: "Elite / High Rhetoric",
    desc: "Employs passionate moral appeals, rights-based principles, and high-impact emotional resonance.",
    avatar: "🔥",
    color: "from-rose-600 to-amber-600"
  },
  {
    id: "socratic",
    name: "Prof. Lysander Locke",
    role: "Socratic Inquirer",
    badge: "Master / Dialectical",
    desc: "Disarms opponent premises through pointed probing questions and boundary trade-off dilemmas.",
    avatar: "🏛️",
    color: "from-purple-600 to-violet-700"
  },
  {
    id: "pragmatic",
    name: "Marcus Sterling",
    role: "Pragmatic Realist",
    badge: "Executive / Feasibility",
    desc: "Scrutinizes budget feasibility, operational hurdles, and unintended economic second-order effects.",
    avatar: "💼",
    color: "from-emerald-600 to-teal-700"
  }
];

export default function SimulationPage() {
  const [topic, setTopic] = useState(PRESET_TOPICS[0]);
  const [format, setFormat] = useState("Oxford Debate");
  const [position, setPosition] = useState("for");
  const [persona, setPersona] = useState("skeptical");
  
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [turnCount, setTurnCount] = useState(1);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speakText = (text) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS error:", e);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const token = Cookies.get("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      try {
        await axios.post(`${API_BASE}/api/sessions`, {
          topic,
          format,
          position,
          persona
        }, { headers });
      } catch (e) {}

      const res = await axios.post(
        `${API_BASE}/api/simulation/start`,
        { topic, position, persona, format },
        { headers }
      );
      
      const opening = res.data.opening_statement;
      const opponentName = PERSONAS.find(p => p.id === persona)?.name || res.data.persona_name || "AI Opponent";

      setStarted(true);
      setTurnCount(1);
      setMessages([
        {
          role: "ai",
          content: opening,
          author: opponentName
        }
      ]);

      speakText(opening);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    
    const updatedMessages = [...messages, { role: "user", content: userText, author: "You" }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const token = Cookies.get("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const nextTurn = turnCount + 1;
      setTurnCount(nextTurn);

      const res = await axios.post(
        `${API_BASE}/api/simulation/turn`,
        {
          topic,
          user_argument: userText,
          persona,
          turn_number: nextTurn
        },
        { headers }
      );

      const aiReply = res.data.ai_response || res.data.response;
      const opponentName = PERSONAS.find(p => p.id === persona)?.name || res.data.persona_name || "AI Opponent";

      setMessages([
        ...updatedMessages,
        {
          role: "ai",
          content: aiReply,
          coach_feedback: res.data.coach_feedback,
          author: opponentName
        }
      ]);

      speakText(aiReply);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_BASE}/api/simulation/summary`,
        { messages },
        { headers }
      );
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeOpponent = PERSONAS.find(p => p.id === persona) || PERSONAS[0];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
              Interactive Arena
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              6 Formats • 4 Opponents
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
            AI Debate Arena & Simulation Chamber
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Duel against specialized AI personas with real-time argument mining, strategic coach nudges, and speech synthesis.
          </p>
        </div>

        {started && !summary && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                voiceEnabled
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500"
              }`}
            >
              <span>{voiceEnabled ? "🔊 Voice On" : "🔇 Voice Muted"}</span>
            </button>
            <button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              Finish & Evaluate Score →
            </button>
          </div>
        )}
      </div>

      {!started ? (
        /* CONFIGURATION STAGE */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>⚙️</span> Debate Motion & Chamber Settings
            </h2>

            {/* TOPIC SELECTION */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Debate Motion / Topic
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[11px] text-slate-400 self-center">Presets:</span>
                {PRESET_TOPICS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTopic(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors border border-slate-200 dark:border-slate-700 truncate max-w-xs"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* FORMAT & POSITION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Debate Format
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} ({f.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Your Advocated Stance
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPosition("for")}
                    className={`py-3 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                      position === "for"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    AFFIRMATIVE (FOR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition("against")}
                    className={`py-3 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                      position === "against"
                        ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    OPPOSITION (AGAINST)
                  </button>
                </div>
              </div>
            </div>

            {/* PERSONA CARDS */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Choose AI Opponent Persona
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PERSONAS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                      persona === p.id
                        ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{p.avatar}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {p.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2">
                      {p.name}
                    </h3>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">
                      {p.role}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* LAUNCH BUTTON */}
            <button
              onClick={handleStart}
              disabled={loading || !topic.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Preparing Arena & Opponent Persona...</span>
                </>
              ) : (
                <>
                  <span>⚔️</span>
                  <span>Enter Debate Arena & Commence Round 1</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : summary ? (
        /* DEBATE ROUND SUMMARY & SCORECARD */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                Debate Concluded
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                Official Debate Performance Scorecard
              </h2>
            </div>
            <button
              onClick={() => { setStarted(false); setSummary(null); }}
              className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border border-indigo-200/50"
            >
              + Start Another Debate Round
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {summary.overview}
          </div>

          {/* WEIGHTED SCORE TILES */}
          <div className="p-6 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <span className="text-xs font-bold uppercase text-indigo-900 dark:text-indigo-200">
                  Weighted Debate Performance Score
                </span>
                <p className="text-[11px] text-slate-500">Based on 30% Arg + 20% Evid + 20% Logic + 15% Rebut + 15% Comm</p>
              </div>
              <strong className="text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {summary.scores?.overall_score || 83.5}%
              </strong>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              {[
                { label: "Argument Quality", weight: "30%", score: summary.scores?.argument_quality || 85 },
                { label: "Evidence Usage", weight: "20%", score: summary.scores?.evidence_usage || 78 },
                { label: "Logical Consistency", weight: "20%", score: summary.scores?.logical_consistency || 86 },
                { label: "Rebuttal Power", weight: "15%", score: summary.scores?.rebuttal_effectiveness || 82 },
                { label: "Communication", weight: "15%", score: summary.scores?.communication_skills || 88 }
              ].map((s) => (
                <div key={s.label} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">{s.label} ({s.weight})</span>
                  <strong className="text-lg text-slate-900 dark:text-slate-100 font-black mt-1 block">{s.score}%</strong>
                </div>
              ))}
            </div>
          </div>

          {/* STRENGTHS & GROWTH AREAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl space-y-2">
              <h3 className="font-bold text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <span>✓</span> Key Strengths Demonstrated
              </h3>
              <ul className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-300 list-disc pl-4">
                {(summary.strengths || []).map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl space-y-2">
              <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <span>⚡</span> Strategic Growth Areas
              </h3>
              <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-300 list-disc pl-4">
                {(summary.improvements || []).map((imp, idx) => (
                  <li key={idx}>{imp}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/reports"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              Export Debate Audit Report (PDF / Excel) →
            </Link>
          </div>
        </div>
      ) : (
        /* LIVE DEBATE STAGE & CHAT CHAMBER */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[700px]">
          
          {/* STAGE HEADER PODIUM */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                {activeOpponent.avatar}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>{activeOpponent.name}</span>
                  <span className="text-[10px] font-semibold text-slate-400">({activeOpponent.role})</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-md">
                  Topic: {topic}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold">
                Round Turn #{turnCount}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                position === 'for'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}>
                You: {position}
              </span>
            </div>
          </div>

          {/* MESSAGES FEED */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-500">
                    {msg.author || (msg.role === "user" ? "You" : activeOpponent.name)}
                  </span>
                  {msg.role === "ai" && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Replay Voice"
                    >
                      🔊
                    </button>
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>

                {/* COACH NUDGE HUD */}
                {msg.coach_feedback && (
                  <div className="mt-2.5 max-w-[85%] p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 shadow-sm flex items-start gap-2.5">
                    <span className="text-base">💡</span>
                    <div>
                      <strong className="block text-[11px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300">
                        Live Coach Recommendation
                      </strong>
                      <p className="mt-0.5 leading-relaxed">{msg.coach_feedback}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl w-max">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-ping" />
                <span>{activeOpponent.name} is synthesizing rebuttal & evaluating counter-evidence...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT ARENA */}
          <form onSubmit={handleSend} className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex gap-3">
            <input
              type="text"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900"
              placeholder="State your proposition premise, cite empirical evidence, or rebut the opponent..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-sm shadow-indigo-600/20"
            >
              Deliver Rebuttal
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
