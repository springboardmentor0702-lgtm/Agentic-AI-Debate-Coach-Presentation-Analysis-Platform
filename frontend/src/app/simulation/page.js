"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { API_BASE, apiFetch, clearAuth, getStoredUser, getToken } from "../../lib/api";

const PRESET_TOPICS = [
  "Autonomous AI Systems should be held legally liable for unintended damages.",
  "Universal Basic Income is essential in an automated economy.",
  "Social media platforms should be regulated like public utilities.",
  "Custom Topic (Enter below)",
];

function TypewriterText({ text, speed = 15 }) {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      const i = indexRef.current;
      if (i >= text.length) {
        clearInterval(timer);
        return;
      }
      setDisplayedText(text.slice(0, i + 1));
      indexRef.current = i + 1;
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <span>{displayedText}</span>;
}

export default function SimulationPage() {
  const [topic, setTopic] = useState(PRESET_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [position, setPosition] = useState("Affirmative");
  const [format, setFormat] = useState("Parliamentary Debate");
  const [persona, setPersona] = useState("The Contrarian");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("Setup");
  const [sessionId, setSessionId] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [scheduleSuccess, setScheduleSuccess] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!getStoredUser() || !getToken()) window.location.href = "/login";
  }, []);

  // Live session timer
  useEffect(() => {
    if (sessionStatus === "Running") {
      setSessionTimer(0);
      timerRef.current = setInterval(() => {
        setSessionTimer((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "Running" || !sessionId) return undefined;
    const socketUrl = `${API_BASE.replace(/^http/, "ws")}/simulation/ws/${sessionId}?token=${encodeURIComponent(getToken() || "")}`;
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    setWsStatus("connecting");

    socket.onopen = () => setWsStatus("connected");
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== "turn") {
          if (data.error) setError(data.error);
          return;
        }
        setTranscript((previous) => [
          ...previous,
          {
            speaker: `AI Opponent (${data.opponent_persona})`,
            text: data.opponent_rebuttal,
            type: "opponent",
            rebuttal_strength: data.rebuttal_strength_percent,
            fallacies: data.fallacies_detected_in_user,
          },
        ]);
        setLastAnalysis({
          rebuttal_strength: data.rebuttal_strength_percent,
          fallacies: data.fallacies_detected_in_user,
          coaching_tip: data.coaching_tip,
        });
        setLoading(false);
      } catch {
        setError("The realtime response could not be read.");
        setLoading(false);
      }
    };
    socket.onerror = () => setWsStatus("unavailable");
    socket.onclose = () => {
      socketRef.current = null;
      setWsStatus("disconnected");
    };
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [sessionId, sessionStatus]);

  const finalTopic = topic === "Custom Topic (Enter below)" ? customTopic.trim() : topic;

  const handleStartDebate = async () => {
    if (!finalTopic) {
      setError("Enter a debate topic before starting the session.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/sessions/create", {
        method: "POST",
        body: JSON.stringify({
          title: `${format} on ${finalTopic.substring(0, 30)}...`,
          topic: finalTopic,
          format,
          assigned_position: position,
          status: "Active",
        }),
      });
      setSessionId(data.id);
      setTranscript([
        {
          speaker: "System",
          text: `Debate session initialized. Format: ${format} | Position: ${position} | Opponent: ${persona}`,
          type: "system",
        },
        {
          speaker: "AI Opponent",
          text: `Welcome to the podium. Present your opening ${position} argument for: "${finalTopic}".`,
          type: "opponent",
        },
      ]);
      setLastAnalysis(null);
      setSessionStatus("Running");
    } catch (err) {
      setError(err.message || "Unable to create the debate session.");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulePractice = async (event) => {
    event.preventDefault();
    if (!finalTopic) {
      setScheduleSuccess("");
      setError("Enter a debate topic before scheduling a session.");
      return;
    }
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      await apiFetch("/sessions/create", {
        method: "POST",
        body: JSON.stringify({
          title: `[Practice] ${format} on ${finalTopic.substring(0, 30)}...`,
          topic: finalTopic,
          format,
          assigned_position: position,
          status: "Scheduled",
          scheduled_at: scheduledDateTime.toISOString(),
        }),
      });
      setScheduleSuccess(`Practice session scheduled for ${scheduledDate} at ${scheduledTime}.`);
      setScheduledDate("");
      setScheduledTime("");
    } catch (err) {
      setScheduleSuccess("");
      setError(err.message || "Unable to schedule the practice session.");
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/sessions/${sessionId}/complete`, { method: "POST" });
      if (socketRef.current) socketRef.current.close();
      setSessionStatus("Completed");
    } catch (err) {
      setError(err.message || "Unable to complete the debate session.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendArgument = async (event) => {
    event.preventDefault();
    const argument = userInput.trim();
    if (!argument || !sessionId || loading) return;
    setUserInput("");
    setError("");
    setTranscript((previous) => [...previous, { speaker: "You", text: argument, type: "user" }]);
    setLoading(true);

    const message = JSON.stringify({ user_argument: argument, opponent_persona: persona });
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
      return;
    }

    try {
      const data = await apiFetch("/simulation/turn", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, user_argument: argument, opponent_persona: persona }),
      });
      setTranscript((previous) => [
        ...previous,
        {
          speaker: `AI Opponent (${data.opponent_persona})`,
          text: data.opponent_rebuttal,
          type: "opponent",
          rebuttal_strength: data.rebuttal_strength_percent,
          fallacies: data.fallacies_detected_in_user,
        },
      ]);
      setLastAnalysis({
        rebuttal_strength: data.rebuttal_strength_percent,
        fallacies: data.fallacies_detected_in_user,
        coaching_tip: data.coaching_tip,
      });
    } catch (err) {
      setError(err.message || "Unable to process this debate turn.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  const restart = () => {
    setSessionStatus("Setup");
    setSessionId(null);
    setTranscript([]);
    setLastAnalysis(null);
    setError("");
    setWsStatus("disconnected");
  };

  return (
    <div className="watermark-container">
      <div className="section-container" style={{ paddingTop: "2.5rem", position: "relative", zIndex: 1 }}>
        {error && (
          <div role="alert" style={{ maxWidth: "900px", margin: "0 auto 1.5rem", padding: "0.9rem 1.25rem", border: "1px solid #fecaca", background: "rgba(254, 242, 242, 0.9)", backdropFilter: "blur(12px)", color: "#991b1b", borderRadius: "16px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* SETUP SCREEN */}
        {sessionStatus === "Setup" && (
          <div style={{ maxWidth: "980px", margin: "0 auto" }}>
            <div className="badge-red-pill">
              <span className="badge-dot"></span> DEBATE WORKSPACE CONFIGURATION
            </div>
            <h1 className="font-display" style={{ fontSize: "clamp(2.2rem, 5vw, 3.2rem)", fontWeight: "900", marginBottom: "0.5rem" }}>
              Initialize AI Practice Session
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              Configure your proposition, debate framework, and opponent persona for real-time live cross-examination.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "2rem" }}>
              {/* Parameters Glass Card */}
              <div className="glass-card" style={{ padding: "2.25rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>
                  Debate Parameters
                </h3>
                
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>
                    Select Debate Topic
                  </label>
                  <select value={topic} onChange={(event) => setTopic(event.target.value)} style={{ width: "100%" }}>
                    {PRESET_TOPICS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>

                {topic === "Custom Topic (Enter below)" && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>
                      Enter Custom Topic Title
                    </label>
                    <input type="text" value={customTopic} onChange={(event) => setCustomTopic(event.target.value)} placeholder="e.g., Space exploration should be prioritized over deep ocean research." style={{ width: "100%", boxSizing: "border-box" }} />
                  </div>
                )}

                <div style={{ marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>Debate Format</label>
                    <select value={format} onChange={(event) => setFormat(event.target.value)} style={{ width: "100%" }}>
                      <option>Parliamentary Debate</option>
                      <option>1-on-1 Debate</option>
                      <option>Oxford Debate</option>
                      <option>Policy Debate</option>
                      <option>Public Forum Debate</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>Assigned Position</label>
                    <select value={position} onChange={(event) => setPosition(event.target.value)} style={{ width: "100%" }}>
                      <option value="Affirmative">Affirmative (Pro)</option>
                      <option value="Negative">Negative (Con)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: "1.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>Opponent Persona</label>
                  <select value={persona} onChange={(event) => setPersona(event.target.value)} style={{ width: "100%" }}>
                    <option>The Contrarian</option>
                    <option>The Academic</option>
                    <option>The Strategist</option>
                  </select>
                </div>

                <button onClick={handleStartDebate} disabled={loading} className="btn btn-red" style={{ width: "100%", padding: "0.95rem", fontSize: "0.92rem" }}>
                  {loading ? "INITIALIZING…" : "⚡ START LIVE SIMULATION"}
                </button>
              </div>

              {/* Scheduler Glass Card */}
              <div className="glass-card-dark" style={{ padding: "2.25rem", color: "#FFF", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div className="font-mono text-red" style={{ fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                    DEBATE SCHEDULER
                  </div>
                  <h3 className="font-display" style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.75rem" }}>
                    Schedule Practice Round
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1.75rem", lineHeight: "1.6" }}>
                    Save a configured practice session to your dashboard to conduct later.
                  </p>

                  {scheduleSuccess && (
                    <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: "12px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#6ee7b7", marginBottom: "1.5rem" }}>
                      ✓ {scheduleSuccess}
                    </div>
                  )}

                  <form onSubmit={handleSchedulePractice}>
                    <label style={{ display: "block", fontSize: "0.76rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 700 }}>
                      PRACTICE DATE
                    </label>
                    <input type="date" required value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} style={{ width: "100%", padding: "0.75rem", marginBottom: "1rem", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#FFF", boxSizing: "border-box" }} />

                    <label style={{ display: "block", fontSize: "0.76rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 700 }}>
                      PRACTICE TIME
                    </label>
                    <input type="time" required value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} style={{ width: "100%", padding: "0.75rem", marginBottom: "1.75rem", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#FFF", boxSizing: "border-box" }} />

                    <button type="submit" className="btn btn-login" style={{ width: "100%", padding: "0.85rem", color: "#fff", borderColor: "rgba(255, 255, 255, 0.3)" }}>
                      SCHEDULE SESSION
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RUNNING SIMULATION WORKSPACE */}
        {sessionStatus === "Running" && (
          <div>
            {/* Top Bar Header matching mockup #02 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <div className="badge-red-pill" style={{ margin: 0 }}>
                    {format.toUpperCase()} · {position.toUpperCase()}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                    WS: {wsStatus.toUpperCase()}
                  </span>
                </div>
                <h1 className="font-display" style={{ fontSize: "2rem", fontWeight: "900", margin: "0.3rem 0 0" }}>
                  Debate Simulation
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  Live debate session in progress · Topic: <strong>{finalTopic}</strong>
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ 
                  background: "rgba(255, 255, 255, 0.8)", 
                  backdropFilter: "blur(12px)", 
                  padding: "0.5rem 1.2rem", 
                  borderRadius: "9999px",
                  border: "1px solid rgba(226, 232, 240, 0.9)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f43f5e", animation: "pulse 1s infinite" }} />
                  <span className="font-mono" style={{ fontSize: "1.1rem", fontWeight: 900 }}>{formatTime(sessionTimer)}</span>
                </div>

                <button onClick={handleCompleteSession} disabled={loading} className="btn btn-red" style={{ padding: "0.65rem 1.4rem", fontSize: "0.82rem" }}>
                  {loading ? "SAVING…" : "⏹️ End Session & Save"}
                </button>
              </div>
            </div>

            {/* Live Dual Stage Cards matching reference image #02 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              {/* Speaker Card: You */}
              <div className="glass-card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #38bdf8, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.8rem" }}>
                      👤
                    </div>
                    <div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>AFFIRMATIVE (YOU)</div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 800 }}>Debater</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.72rem", background: "#ecfdf5", color: "#10b981", padding: "0.15rem 0.5rem", borderRadius: "9999px", fontWeight: 800 }}>
                    Active
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "18px", marginTop: "1rem", justifyContent: "center" }}>
                  {[8, 14, 20, 12, 16, 8, 18, 12, 16, 22, 10, 14, 6, 12].map((h, i) => (
                    <span key={i} style={{ width: "3px", height: `${h}px`, background: "#38bdf8", borderRadius: "9999px", opacity: 0.85 }} />
                  ))}
                </div>
              </div>

              {/* Speaker Card: Opponent */}
              <div className="glass-card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #f43f5e, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.8rem" }}>
                      🤖
                    </div>
                    <div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>OPPONENT</div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 800 }}>{persona}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.72rem", background: "#fef2f2", color: "#f43f5e", padding: "0.15rem 0.5rem", borderRadius: "9999px", fontWeight: 800 }}>
                    {loading ? "Responding…" : "Listening"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "18px", marginTop: "1rem", justifyContent: "center" }}>
                  {[12, 6, 14, 22, 16, 10, 18, 20, 14, 8, 16, 12, 18, 10].map((h, i) => (
                    <span key={i} style={{ width: "3px", height: `${h}px`, background: "#f43f5e", borderRadius: "9999px", opacity: loading ? 1 : 0.4 }} />
                  ))}
                </div>
              </div>

              {/* Audience Reactions Card */}
              <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>
                  AUDIENCE FEEDBACK · LIVE REACTIONS
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", fontSize: "1.25rem" }}>
                    <span>👏</span>
                    <span>🔥</span>
                    <span>💡</span>
                    <span>🎯</span>
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--ios-indigo)" }}>
                    1.4k live viewers
                  </span>
                </div>
              </div>
            </div>

            {/* Main Debate Grid: Terminal + Real-time Telemetry Panel */}
            <div style={{ display: "grid", gridTemplateColumns: "1.75fr 1fr", gap: "1.5rem", alignItems: "start" }}>
              {/* Terminal Obsidian Glass Window */}
              <div className="terminal-window">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                  </div>
                  <div className="terminal-title">LOGOS.AI RHETORICAL ENGINE // {persona.toUpperCase()}</div>
                </div>

                <div className="terminal-body" style={{ minHeight: "420px", maxHeight: "520px", overflowY: "auto" }}>
                  {transcript.map((item, index) => (
                    <div key={`${index}-${item.speaker}`} style={{ marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", alignItems: "center" }}>
                        <span className="font-mono text-muted" style={{ fontSize: "0.72rem" }}>[{new Date().toLocaleTimeString()}]</span>
                        <strong className={item.type === "user" ? "text-cyan" : item.type === "opponent" ? "text-red" : "text-green"}>
                          {item.speaker}:
                        </strong>
                      </div>
                      <div style={{ paddingLeft: "1.25rem", color: item.type === "system" ? "#94a3b8" : "#f1f5f9", lineHeight: "1.6" }}>
                        {item.type === "opponent" && index === transcript.length - 1 ? <TypewriterText text={item.text} /> : item.text}
                      </div>
                      {item.fallacies?.length > 0 && (
                        <div style={{ margin: "0.6rem 0 0 1.25rem", background: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.4)", borderRadius: "10px", padding: "0.65rem 0.85rem", fontSize: "0.82rem" }}>
                          <strong className="text-red">⚠️ Fallacy detected: {item.fallacies[0].fallacy_type}</strong>
                          <div style={{ color: "#cbd5e1", marginTop: "0.2rem" }}>{item.fallacies[0].explanation}</div>
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="text-muted font-mono animate-pulse" style={{ paddingLeft: "1.25rem" }}>
                      &gt; Agent calculating rebuttal arguments and fallacy checks...
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendArgument} style={{ display: "flex", borderTop: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(11, 15, 25, 0.95)", padding: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Type your debate speech / rebuttal here..."
                    value={userInput}
                    onChange={(event) => setUserInput(event.target.value)}
                    disabled={loading}
                    className="font-mono"
                    style={{ flex: 1, padding: "0.85rem 1.25rem", background: "transparent", border: "none", color: "#fff", outline: "none", fontSize: "0.9rem" }}
                  />
                  <button type="submit" disabled={loading} className="btn btn-red" style={{ padding: "0.65rem 1.5rem" }}>
                    TRANSMIT
                  </button>
                </form>
              </div>

              {/* Real-time Telemetry Glass Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Rebuttal Strength Gauge */}
                <div className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
                  <div className="font-mono text-muted" style={{ fontSize: "0.72rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                    REBUTTAL STRENGTH
                  </div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, background: "linear-gradient(135deg, #4f46e5, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {lastAnalysis ? `${lastAnalysis.rebuttal_strength}%` : "88.4%"}
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#10b981", background: "#ecfdf5", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>
                    {lastAnalysis ? "Live Evaluated" : "Optimal"}
                  </span>
                </div>

                {/* Logic Audit Status */}
                <div className="glass-card" style={{ padding: "1.5rem" }}>
                  <div className="font-mono text-muted" style={{ fontSize: "0.72rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                    LIVE FALLACY DETECTION
                  </div>
                  {lastAnalysis?.fallacies?.length > 0 ? (
                    <div style={{ color: "#f43f5e", fontWeight: 800, fontSize: "0.95rem" }}>
                      ⚠️ {lastAnalysis.fallacies[0].fallacy_type}
                    </div>
                  ) : (
                    <div style={{ color: "#10b981", fontWeight: 800, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span>✓</span> {lastAnalysis ? "Clean logical premise" : "No Fallacies Detected"}
                    </div>
                  )}
                </div>

                {/* Coaching Guidance */}
                <div className="glass-card-dark" style={{ padding: "1.5rem", color: "#fff" }}>
                  <div className="font-mono text-red" style={{ fontSize: "0.72rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                    AI COACHING ASSISTANT
                  </div>
                  <p style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "#cbd5e1" }}>
                    {lastAnalysis?.coaching_tip || "Deliver clear assertions with warrants. Focus on dismantling the opponent's core assumptions."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETED SCREEN */}
        {sessionStatus === "Completed" && (
          <div className="glass-card" style={{ maxWidth: "680px", margin: "3rem auto", padding: "3.5rem 2.5rem", textAlign: "center" }}>
            <div className="badge-red-pill">
              <span className="badge-dot"></span> DEBATE RECORDED SUCCESSFULLY
            </div>
            <h1 className="font-display" style={{ fontSize: "2.4rem", fontWeight: "900", marginBottom: "0.75rem" }}>
              Practice Performance Recorded
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.92rem", lineHeight: "1.6" }}>
              Session #{sessionId} and its analyzed turns have been saved to your analytics dashboard.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.9)", border: "1px solid rgba(226, 232, 240, 0.9)", borderRadius: "16px" }}>
                <div className="font-mono text-muted" style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>RECORDED TURNS</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--ios-indigo)" }}>
                  {transcript.filter((item) => item.type === "user").length}
                </div>
              </div>
              <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.9)", border: "1px solid rgba(226, 232, 240, 0.9)", borderRadius: "16px" }}>
                <div className="font-mono text-muted" style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>SESSION STATUS</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#10b981", marginTop: "0.3rem" }}>COMPLETED</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button onClick={restart} className="btn btn-red" style={{ padding: "0.85rem 2rem" }}>
                Start New Practice Session
              </button>
              <Link href="/dashboard" className="btn btn-login" style={{ padding: "0.85rem 2rem" }}>
                View in Analytics →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
