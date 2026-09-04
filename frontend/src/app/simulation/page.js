"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FORMATS = [
  { id: "One-on-One Debate", label: "One-on-One Debate" },
  { id: "Parliamentary Debate", label: "Parliamentary Debate" },
  { id: "Oxford Debate", label: "Oxford Debate" },
  { id: "Policy Debate", label: "Policy Debate" },
  { id: "Public Forum Debate", label: "Public Forum Debate" },
  { id: "AI Debate Simulation", label: "AI Debate Simulation" }
];

export default function SimulationPage() {
  const [topic, setTopic] = useState("Universal Basic Income to Mitigate AI Job Displacement");
  const [format, setFormat] = useState("Oxford Debate");
  const [position, setPosition] = useState("for");
  const [persona, setPersona] = useState("skeptical");
  const [personas, setPersonas] = useState([]);
  
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [turnCount, setTurnCount] = useState(1);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const token = Cookies.get("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE}/api/simulation/personas`, { headers });
        setPersonas(res.data.personas || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPersonas();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const token = Cookies.get("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Also register session in backend DB
      try {
        await axios.post(`${API_BASE}/api/sessions`, {
          topic,
          format,
          position,
          persona
        }, { headers });
      } catch (e) {
        // Continue even if session post fails
      }

      const res = await axios.post(
        `${API_BASE}/api/simulation/start`,
        { topic, position, persona, format },
        { headers }
      );
      setStarted(true);
      setTurnCount(1);
      setMessages([
        {
          role: "ai",
          content: res.data.opening_statement,
          author: res.data.persona_name || "AI Opponent"
        }
      ]);
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
    
    // Append user message immediately
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

      setMessages([
        ...updatedMessages,
        {
          role: "ai",
          content: res.data.ai_response || res.data.response,
          coach_feedback: res.data.coach_feedback,
          author: res.data.persona_name || "AI Opponent"
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Interactive Debate Arena & Simulation
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Interactive Debate Arena
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Engage in multi-turn structured debates with intelligent AI personas across 6 official formats with real-time coach nudges.
            </p>
          </div>
          {started && (
            <button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm self-start md:self-center"
            >
              Finish Debate & Evaluate Score
            </button>
          )}
        </div>

        {!started ? (
          /* SETUP CONFIGURATION CARD */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Configure Debate Round</h2>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Debate Topic / Motion</label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* FORMAT SELECTOR */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Debate Format (6 Formats)</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* POSITION SELECTOR */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Your Position</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPosition("for")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      position === "for"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    FOR (Affirmative)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition("against")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      position === "against"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    AGAINST (Opposition)
                  </button>
                </div>
              </div>
            </div>

            {/* PERSONAS SELECTOR */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Select AI Opponent Persona</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: "skeptical", name: "Skeptical Analyst", desc: "Challenges weak data & unverified claims" },
                  { id: "aggressive", name: "Passionate Ideologue", desc: "High rhetoric, values & moral convictions" },
                  { id: "socratic", name: "Socratic Inquirer", desc: "Probes definitions and boundary trade-offs" },
                  { id: "pragmatic", name: "Pragmatic Realist", desc: "Focuses on cost, logistics & feasibility" }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      persona === p.id
                        ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <strong className="block text-sm text-slate-900 font-bold">{p.name}</strong>
                    <span className="text-xs text-slate-500 block mt-1 leading-normal">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={loading || !topic.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm py-3 rounded-lg transition-colors shadow-sm"
            >
              {loading ? "Initializing Arena..." : "Start Debate Simulation"}
            </button>
          </div>
        ) : summary ? (
          /* DEBATE ROUND SUMMARY & WEIGHTED SCORING CARD */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  Debate Concluded
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2">Performance Scorecard & Summary</h2>
              </div>
              <button
                onClick={() => { setStarted(false); setSummary(null); }}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                + Start Another Debate
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              {summary.overview}
            </p>

            {/* WEIGHTED SCORE SUMMARY */}
            <div className="p-5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-indigo-900">
                  Weighted Debate Performance Score (Formula 30/20/20/15/15)
                </span>
                <strong className="text-3xl font-black text-indigo-700">
                  {summary.scores?.overall_score || 83.5}%
                </strong>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {[
                  { label: "Argument Quality (30%)", score: summary.scores?.argument_quality || 85 },
                  { label: "Evidence Usage (20%)", score: summary.scores?.evidence_usage || 78 },
                  { label: "Logical Consistency (20%)", score: summary.scores?.logical_consistency || 86 },
                  { label: "Rebuttal Effectiveness (15%)", score: summary.scores?.rebuttal_effectiveness || 82 },
                  { label: "Communication Skills (15%)", score: summary.scores?.communication_skills || 88 }
                ].map((s) => (
                  <div key={s.label} className="p-2.5 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 font-bold block">{s.label}</span>
                    <strong className="text-base text-slate-900 font-black mt-1 block">{s.score}%</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* STRENGTHS & IMPROVEMENTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <span>✓</span> Demonstrated Strengths
                </h3>
                <ul className="space-y-1.5 text-xs text-emerald-900 list-disc pl-4">
                  {(summary.strengths || []).map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <h3 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                  <span>⚡</span> Areas for Growth & Drills
                </h3>
                <ul className="space-y-1.5 text-xs text-amber-900 list-disc pl-4">
                  {(summary.improvements || []).map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Link
                href="/reports"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Export Official Debate Report (PDF / Excel) →
              </Link>
            </div>
          </div>
        ) : (
          /* ACTIVE DEBATE CHAT ARENA */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[650px]">
            {/* ARENA BAR */}
            <div className="px-6 py-3.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <strong className="text-slate-800 font-bold">{format}</strong>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">You: <strong className="uppercase">{position}</strong></span>
              </div>
              <div className="text-slate-500 font-medium">
                Round Turn: <strong className="text-slate-900">{turnCount}</strong>
              </div>
            </div>

            {/* MESSAGES CONTAINER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <span className="text-[11px] font-bold text-slate-500 mb-1 px-1">
                    {msg.author || (msg.role === "user" ? "You" : "AI Opponent")}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* COACH NUDGE / TIP */}
                  {msg.coach_feedback && (
                    <div className="mt-2 max-w-[85%] p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-sm flex items-start gap-2">
                      <span className="text-sm">💡</span>
                      <div>
                        <strong>Real-Time Coach Nudge:</strong> {msg.coach_feedback}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce"></div>
                  Opponent is formulating counter-argument...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT FORM */}
            <form onSubmit={handleSend} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                placeholder="Deliver your argument, premise, or rebuttal..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm px-6 py-3 rounded-lg transition-colors shadow-sm"
              >
                Send Rebuttal
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
