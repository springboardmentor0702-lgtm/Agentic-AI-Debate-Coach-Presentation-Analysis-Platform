"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE, apiFetch, clearAuth, getStoredUser, getToken } from "../../lib/api";

const PRESET_TOPICS = [
  "Autonomous AI Systems should be held legally liable for unintended damages.",
  "Universal Basic Income is essential in an automated economy.",
  "Social media platforms should be regulated like public utilities.",
  "Custom Topic (Enter below)",
];

function TypewriterText({ text, speed = 15 }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      setDisplayedText((previous) => {
        const next = text.charAt(index);
        index += 1;
        if (index >= text.length) clearInterval(timer);
        return previous + next;
      });
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
  const socketRef = useRef(null);

  useEffect(() => {
    if (!getStoredUser() || !getToken()) window.location.href = "/login";
  }, []);

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
          text: `Present your opening ${position} case for: "${finalTopic}".`,
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
      <div className="watermark-text" style={{ bottom: "2rem", right: "2rem", left: "auto", opacity: 0.05, zIndex: -1 }}>RHETORIC</div>
      <div className="section-container" style={{ paddingTop: "2rem", position: "relative", zIndex: 1 }}>
        {error && <div role="alert" style={{ maxWidth: "850px", margin: "0 auto 1.5rem", padding: "0.85rem 1rem", border: "1px solid var(--accent-red)", background: "#fff1f2", color: "#991b1b" }}>{error}</div>}

        {sessionStatus === "Setup" && (
          <div style={{ maxWidth: "850px", margin: "0 auto" }}>
            <div className="badge-red-pill">DEBATE WORKSPACE CONFIGURATION</div>
            <h1 className="font-display" style={{ fontSize: "2.8rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "2rem" }}>INITIALIZE AI PRACTICE SESSION</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "3rem" }}>
              <div style={{ background: "#FFF", border: "1px solid var(--border-light)", padding: "2rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem", textTransform: "uppercase" }}>Debate Parameters</h3>
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>Select Debate Topic</label>
                  <select value={topic} onChange={(event) => setTopic(event.target.value)} style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border-light)", background: "#FFF", fontSize: "0.9rem" }}>
                    {PRESET_TOPICS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                {topic === "Custom Topic (Enter below)" && <div style={{ marginBottom: "1.25rem" }}><label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>Enter Custom Topic Title</label><input type="text" value={customTopic} onChange={(event) => setCustomTopic(event.target.value)} placeholder="e.g., Space exploration should be prioritized over deep ocean research." style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border-light)", boxSizing: "border-box" }} /></div>}
                <div style={{ marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div><label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>Debate Format</label><select value={format} onChange={(event) => setFormat(event.target.value)} style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border-light)", background: "#FFF" }}><option>1-on-1 Debate</option><option>Parliamentary Debate</option><option>Oxford Debate</option><option>Policy Debate</option><option>Public Forum Debate</option></select></div>
                  <div><label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>Assigned Position</label><select value={position} onChange={(event) => setPosition(event.target.value)} style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border-light)", background: "#FFF" }}><option value="Affirmative">Affirmative (Pro)</option><option value="Negative">Negative (Con)</option></select></div>
                </div>
                <div style={{ marginBottom: "1.5rem" }}><label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>Opponent Persona</label><select value={persona} onChange={(event) => setPersona(event.target.value)} style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border-light)", background: "#FFF" }}><option>The Contrarian</option><option>The Academic</option><option>The Strategist</option></select></div>
                <button onClick={handleStartDebate} disabled={loading} className="btn btn-red" style={{ width: "100%", padding: "0.9rem" }}>{loading ? "INITIALIZING..." : "START LIVE AI DEBATE SIMULATION"}</button>
              </div>
              <div style={{ background: "#111827", color: "#FFF", border: "1px solid var(--dark-border)", padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div><h3 className="font-display text-red" style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1rem", textTransform: "uppercase" }}>Debate Scheduler</h3><p style={{ fontSize: "0.88rem", color: "#9CA3AF", marginBottom: "2rem", lineHeight: "1.5" }}>Save a configured practice session to your dashboard for later review.</p>{scheduleSuccess && <div style={{ background: "#1E293B", border: "1px solid var(--accent-red)", padding: "0.75rem", fontSize: "0.8rem", marginBottom: "1.5rem" }}>{scheduleSuccess}</div>}<form onSubmit={handleSchedulePractice}><label style={{ display: "block", fontSize: "0.78rem", color: "#9CA3AF", marginBottom: "0.4rem", textTransform: "uppercase" }}>Practice Date</label><input type="date" required value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} style={{ width: "100%", padding: "0.75rem", marginBottom: "1rem", border: "1px solid var(--dark-border)", background: "#1F2937", color: "#FFF", boxSizing: "border-box" }} /><label style={{ display: "block", fontSize: "0.78rem", color: "#9CA3AF", marginBottom: "0.4rem", textTransform: "uppercase" }}>Practice Time</label><input type="time" required value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} style={{ width: "100%", padding: "0.75rem", marginBottom: "1.5rem", border: "1px solid var(--dark-border)", background: "#1F2937", color: "#FFF", boxSizing: "border-box" }} /><button type="submit" className="btn" style={{ width: "100%", padding: "0.75rem", background: "transparent", color: "#FFF", border: "1px solid var(--dark-border)" }}>SCHEDULE PRACTICE SESSION</button></form></div>
              </div>
            </div>
          </div>
        )}

        {sessionStatus === "Running" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}><div><div className="badge-red-pill">FORMAT: {format.toUpperCase()} // POSITION: {position.toUpperCase()}</div><h1 className="font-display" style={{ fontSize: "2.5rem", fontWeight: "900", textTransform: "uppercase" }}>DEBATE TERMINAL</h1><div className="font-mono text-muted" style={{ fontSize: "0.75rem" }}>SESSION #{sessionId} // REALTIME CHANNEL: {wsStatus.toUpperCase()}</div></div><button onClick={handleCompleteSession} disabled={loading} className="btn btn-red" style={{ padding: "0.6rem 1.5rem", fontSize: "0.85rem" }}>{loading ? "SAVING..." : "SAVE & COMPLETE PRACTICE RECORDING"}</button></div>
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "2rem" }}>
              <div className="terminal-window">
                <div className="terminal-header"><div className="terminal-dots"><span className="dot dot-red"></span><span className="dot dot-yellow"></span><span className="dot dot-green"></span></div><div className="terminal-title">LOGOS.AI SIMULATION // TOPIC: {finalTopic}</div></div>
                <div className="terminal-body" style={{ minHeight: "420px", maxHeight: "520px", overflowY: "auto" }}>{transcript.map((item, index) => <div key={`${index}-${item.speaker}`} style={{ marginBottom: "1.25rem" }}><div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}><span className="font-mono text-muted">[{new Date().toLocaleTimeString()}]</span><strong className={item.type === "user" ? "text-cyan" : item.type === "opponent" ? "text-red" : "text-green"}>{item.speaker}:</strong></div><div style={{ paddingLeft: "1.5rem", color: item.type === "system" ? "#888" : "#e0e0e0", lineHeight: "1.5" }}>{item.type === "opponent" && index === transcript.length - 1 ? <TypewriterText text={item.text} /> : item.text}</div>{item.fallacies?.length > 0 && <div style={{ margin: "0.5rem 0 0 1.5rem", background: "#25080c", border: "1px solid var(--accent-red)", padding: "0.5rem 0.75rem", fontSize: "0.78rem" }}><strong className="text-red">Fallacy detected: {item.fallacies[0].fallacy_type}</strong><div style={{ color: "#ccc" }}>{item.fallacies[0].explanation}</div></div>}</div>)}{loading && <div className="text-muted font-mono animate-pulse">&gt; Agent computing rebuttal...</div>}</div>
                <form onSubmit={handleSendArgument} style={{ display: "flex", borderTop: "1px solid var(--dark-border)", background: "#0e0e12" }}><input type="text" placeholder="Type your debate speech / counterargument here..." value={userInput} onChange={(event) => setUserInput(event.target.value)} disabled={loading} className="font-mono" style={{ flex: 1, padding: "1rem 1.5rem", background: "transparent", border: "none", color: "#fff", outline: "none", fontSize: "0.9rem" }} /><button type="submit" disabled={loading} className="btn btn-red" style={{ borderRadius: 0 }}>TRANSMIT</button></form>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-light)", padding: "1.5rem" }}><div className="font-mono text-muted" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>OPPONENT REBUTTAL PRESSURE</div><div className="font-display" style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--accent-red)" }}>{lastAnalysis ? `${lastAnalysis.rebuttal_strength}%` : "—"}</div><div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{lastAnalysis ? "Measured from the latest AI turn" : "Awaiting the first analyzed turn"}</div></div>
                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-light)", padding: "1.5rem" }}><div className="font-mono text-muted" style={{ fontSize: "0.75rem", marginBottom: "0.75rem" }}>LOGIC AUDIT STATUS</div>{lastAnalysis?.fallacies?.length > 0 ? <div style={{ color: "var(--accent-red)", fontWeight: "bold" }}>Fallacy flagged: {lastAnalysis.fallacies[0].fallacy_type}</div> : <div style={{ color: "#10b981", fontWeight: "bold" }}>{lastAnalysis ? "No fallacies flagged in the latest turn" : "Awaiting analysis"}</div>}</div>
                <div style={{ background: "var(--dark-bg)", color: "#fff", border: "1px solid var(--dark-border)", padding: "1.5rem", flex: 1 }}><div className="font-mono text-red" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>COACHING ASSISTANT</div><p style={{ fontSize: "0.9rem", lineHeight: "1.5", color: "#ccc" }}>{lastAnalysis?.coaching_tip || "Your turn-by-turn coaching guidance will appear after the first argument is analyzed."}</p></div>
              </div>
            </div>
          </div>
        )}

        {sessionStatus === "Completed" && (
          <div style={{ maxWidth: "650px", margin: "3rem auto", background: "#FFF", border: "1px solid var(--border-light)", padding: "3rem 2.5rem", textAlign: "center" }}><div className="badge-red-pill">DEBATE RECORDED SUCCESSFULLY</div><h1 className="font-display" style={{ fontSize: "2.5rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "1rem" }}>PRACTICE PERFORMANCE RECORDED</h1><p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem", lineHeight: "1.6" }}>Session #{sessionId} and its analyzed turns are now available in your dashboard and reports. The latest recorded rebuttal pressure was {lastAnalysis ? `${lastAnalysis.rebuttal_strength}%` : "not available"}.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "2rem" }}><div style={{ padding: "1.25rem", background: "#F9FAFB", border: "1px solid #E5E7EB" }}><div className="font-mono text-muted" style={{ fontSize: "0.7rem", marginBottom: "0.5rem" }}>RECORDED TURNS</div><div className="font-display text-red" style={{ fontSize: "2rem", fontWeight: "900" }}>{transcript.filter((item) => item.type === "user").length}</div></div><div style={{ padding: "1.25rem", background: "#F9FAFB", border: "1px solid #E5E7EB" }}><div className="font-mono text-muted" style={{ fontSize: "0.7rem", marginBottom: "0.5rem" }}>SESSION STATUS</div><div className="font-display" style={{ fontSize: "1.2rem", fontWeight: "900" }}>COMPLETED</div></div></div><button onClick={restart} className="btn btn-dark" style={{ padding: "0.85rem 2.5rem" }}>START NEW PRACTICE SESSION</button></div>
        )}
      </div>
    </div>
  );
}
