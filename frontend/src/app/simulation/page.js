"use client";

import { useState, useEffect } from 'react';
import VoiceRecorder from "../../components/VoiceRecorder";

const authHeaders = (json = false) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('logos_ai_jwt') : null;
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const PRESET_TOPICS = [
  "Autonomous AI Systems should be held legally liable for unintended damages.",
  "Universal Basic Income is essential in an automated economy.",
  "Social media platforms should be regulated like public utilities.",
  "Custom Topic (Enter below)"
];

export default function SimulationPage() {
  const [topic, setTopic] = useState(PRESET_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [position, setPosition] = useState("Affirmative");
  const [format, setFormat] = useState("Parliamentary Debate");
  const [persona, setPersona] = useState("The Contrarian");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("Setup"); // Setup, Running, Completed
  const [sessionId, setSessionId] = useState(null);
  
  // Scheduling States
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduleSuccess, setScheduleSuccess] = useState("");

  const [transcript, setTranscript] = useState([]);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [sessionScores, setSessionScores] = useState({
    overall: 0,
    argument_quality: 0,
    evidence_use: 0,
    logical: 0,
    rebuttal: 0,
    communication: 0
  });

  const [presentationMetrics, setPresentationMetrics] = useState(null);

  const clampScore = (value) => Math.max(0, Math.min(100, Number(value) || 0));

  // Convert scores returned by different AI modules into a common 0-100 scale.
  // Some agents return 0-1 decimals while others return percentages.
  const normalizeScore = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n >= 0 && n <= 1 ? n * 100 : n;
  };

  const getScore = (obj, keys) => {
    for (const key of keys) {
      const value = normalizeScore(obj?.[key]);
      if (value !== null) return clampScore(value);
    }
    return null;
  };

  const calculateScores = (analysis, rebuttalStrength, fallacies = []) => {
    const a = analysis || {};

    // Support both the flat response and common nested agent responses.
    const nested = a.analysis || a.result || a.argument_analysis || {};
    const source = { ...nested, ...a };

    const reasoning = getScore(source, [
      "reasoning_quality",
      "reasoning_score",
      "strength_score"
    ]);
    const consistency = getScore(source, [
      "logical_consistency",
      "logical_consistency_score",
      "consistency_score"
    ]);
    const clarity = getScore(source, [
      "clarity_score",
      "clarity"
    ]);
    const relevance = getScore(source, [
      "relevance_score",
      "relevance"
    ]);

    const logicalValues = [reasoning, consistency, clarity, relevance]
      .filter(value => value !== null);

    // If the backend already provides a logical score, use it as a fallback.
    let logical = logicalValues.length
      ? logicalValues.reduce((sum, value) => sum + value, 0) / logicalValues.length
      : getScore(source, [
          "logical_score",
          "logic_score",
          "overall_argument_score",
          "persuasiveness_score"
        ]) ?? 0;

    // Penalize detected fallacies without allowing the score to go negative.
    const fallacyPenalty = Math.min(20, (fallacies?.length || 0) * 10);
    logical = clampScore(logical - fallacyPenalty);

    const rebuttal = clampScore(normalizeScore(rebuttalStrength) ?? 0);
    const overall = clampScore((logical * 0.6) + (rebuttal * 0.4));

    return {
      overall: Number(overall.toFixed(1)),
      logical: Number(logical.toFixed(1)),
      rebuttal: Number(rebuttal.toFixed(1))
    };
  };

  const handleStartDebate = async () => {
    setLoading(true);
    const finalTopic = topic === "Custom Topic (Enter below)" ? customTopic : topic;
    try {
      const res = await fetch("http://localhost:8000/api/v1/sessions/create", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          title: `${format} on ${finalTopic.substring(0, 30)}...`,
          topic: finalTopic,
          format: format,
          assigned_position: position,
          status: "Active"
        })
      });
      if (!res.ok) throw new Error('Unable to create the debate session.');
      const data = await res.json();
      setSessionId(data.id);

      setTranscript([
        {
          speaker: "System",
          text: `Debate Session Initialized. Format: ${format} | Position: ${position} | Opponent: ${persona}`,
          type: "system"
        },
        {
          speaker: "AI Opponent",
          text: `Greetings. I will argue the Negative perspective. Present your opening ${position} case for: "${finalTopic}".`,
          type: "opponent"
        }
      ]);
      setLastAnalysis(null);
      setSessionScores({ overall: 0, argument_quality: 0, evidence_use: 0, logical: 0, rebuttal: 0, communication: 0 });
      setPresentationMetrics(null);
      setSessionStatus("Running");
    } catch (err) {
      // Offline fallback
      setSessionId(999);
      setTranscript([
        {
          speaker: "System",
          text: `Debate Session Initialized (Offline Mode). Format: ${format} | Position: ${position} | Opponent: ${persona}`,
          type: "system"
        },
        {
          speaker: "AI Opponent",
          text: `Greetings. I will argue the Negative perspective. Present your opening ${position} case for: "${finalTopic}".`,
          type: "opponent"
        }
      ]);
      setLastAnalysis(null);
      setSessionScores({ overall: 0, argument_quality: 0, evidence_use: 0, logical: 0, rebuttal: 0, communication: 0 });
      setPresentationMetrics(null);
      setSessionStatus("Running");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulePractice = async (e) => {
    e.preventDefault();
    if (!scheduledDate || !scheduledTime) return;
    const finalTopic = topic === "Custom Topic (Enter below)" ? customTopic : topic;
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      await fetch("http://localhost:8000/api/v1/sessions/create", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          title: `[Practice] ${format} on ${finalTopic.substring(0, 30)}...`,
          topic: finalTopic,
          format: format,
          assigned_position: position,
          status: "Scheduled",
          scheduled_at: scheduledDateTime.toISOString()
        })
      });
      setScheduleSuccess(`Practice session scheduled for ${scheduledDate} at ${scheduledTime}!`);
      setTimeout(() => {
        setScheduleSuccess("");
        setScheduledDate("");
        setScheduledTime("");
      }, 3000);
    } catch (err) {
      setScheduleSuccess(`Offline Mode: Session scheduled locally for ${scheduledDate} at ${scheduledTime}!`);
      setTimeout(() => setScheduleSuccess(""), 3000);
    }
  };

  const handleVoiceConfirmed = async (spokenText, durationSec) => {
    setUserInput("");
    setTranscript(prev => [...prev, { speaker: "You (Voice)", text: spokenText, type: "user" }]);
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("logos_ai_jwt") : null;
      const analysisRes = await fetch("http://localhost:8000/api/v1/argument-analysis/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ session_id: sessionId, speech_text: spokenText })
      });
      if (!analysisRes.ok) throw new Error("Argument analysis failed");
      const analysis = await analysisRes.json();
      const simRes = await fetch("http://localhost:8000/api/v1/simulation/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ session_id: sessionId, user_argument: spokenText, opponent_persona: persona })
      });
      if (!simRes.ok) throw new Error("Simulation analysis failed");
      const data = await simRes.json();
      setTranscript(prev => [...prev, { speaker: `AI Opponent (${persona})`, text: data.opponent_rebuttal, type: "opponent", rebuttal_strength: data.rebuttal_strength_percent, fallacies: data.fallacies_detected_in_user }]);
      const dynamicScores = calculateScores(
        analysis,
        data.rebuttal_strength_percent,
        data.fallacies_detected_in_user
      );

      setSessionScores(dynamicScores);

      setLastAnalysis({
        rebuttal_strength: data.rebuttal_strength_percent,
        fallacies: data.fallacies_detected_in_user,
        coaching_tip: data.coaching_tip,
        argument_analysis: analysis,
        duration_sec: durationSec,
        scores: dynamicScores
      });
    } catch (err) {
      console.error(err);
      setTranscript(prev => [...prev, { speaker: "System", text: `Voice analysis unavailable: ${err.message}`, type: "system" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: authHeaders()
      });
      if (!response.ok) throw new Error('Unable to complete the debate session.');
      const result = await response.json();
      if (result.scores) {
        setSessionScores({
          overall: Number(result.scores.overall) || 0,
          argument_quality: Number(result.scores.argument_quality) || 0,
          evidence_use: Number(result.scores.evidence_use) || 0,
          logical: Number(result.scores.logical_consistency) || 0,
          rebuttal: Number(result.scores.rebuttal_effectiveness) || 0,
          communication: Number(result.scores.communication_skills) || 0
        });
      }
      setPresentationMetrics(result.presentation_metrics || null);
      setSessionStatus("Completed");
    } catch (err) {
      console.error(err);
      setTranscript(prev => [...prev, {
        speaker: "System",
        text: `Session completion failed: ${err.message}`,
        type: "system"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendArgument = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg = userInput;
    setUserInput("");
    setTranscript(prev => [...prev, { speaker: "You", text: userMsg, type: "user" }]);
    setLoading(true);

    try {
      // IMPORTANT: typed arguments must go through the same Argument Analysis
      // pipeline as voice arguments. This persists ArgumentAnalysis/FallacyLog/
      // Counterargument records so the final session score is not 0.
      const analysisRes = await fetch("http://localhost:8000/api/v1/argument-analysis/evaluate", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ session_id: sessionId, speech_text: userMsg })
      });
      if (!analysisRes.ok) {
        const detail = await analysisRes.text();
        throw new Error(`Argument analysis failed (${analysisRes.status}): ${detail}`);
      }
      const analysis = await analysisRes.json();

      // Then persist the simulation turn and generate the AI opponent response.
      const simRes = await fetch("http://localhost:8000/api/v1/simulation/turn", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          session_id: sessionId,
          user_argument: userMsg,
          opponent_persona: persona
        })
      });
      if (!simRes.ok) {
        const detail = await simRes.text();
        throw new Error(`Simulation failed (${simRes.status}): ${detail}`);
      }
      const data = await simRes.json();

      setTranscript(prev => [...prev, {
        speaker: `AI Opponent (${persona})`,
        text: data.opponent_rebuttal,
        type: "opponent",
        rebuttal_strength: data.rebuttal_strength_percent,
        fallacies: data.fallacies_detected_in_user
      }]);

      const dynamicScores = calculateScores(
        analysis,
        data.rebuttal_strength_percent,
        data.fallacies_detected_in_user
      );
      setSessionScores(dynamicScores);

      setLastAnalysis({
        rebuttal_strength: data.rebuttal_strength_percent,
        fallacies: data.fallacies_detected_in_user,
        coaching_tip: data.coaching_tip,
        argument_analysis: analysis,
        scores: dynamicScores
      });
    } catch (err) {
      console.error(err);
      setTranscript(prev => [...prev, {
        speaker: "System",
        text: `Turn processing failed: ${err.message}`,
        type: "system"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="watermark-container">
      <div className="watermark-text" style={{ bottom: '2rem', right: '2rem', left: 'auto', opacity: 0.05, zIndex: -1 }}>RHETORIC</div>
      <div className="section-container" style={{ paddingTop: '2rem', position: 'relative', zIndex: 1 }}>
        
        {/* Setup Configuration Panel */}
        {sessionStatus === "Setup" && (
          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div className="badge-red-pill">DEBATE WORKSPACE CONFIGURATION</div>
            <h1 className="font-display" style={{ fontSize: '2.8rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2rem' }}>
              INITIALIZE AI PRACTICE SESSION
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem' }}>
              {/* Left Side: Setup Parameters */}
              <div style={{ background: '#FFF', border: '1px solid var(--border-light)', padding: '2rem', borderRadius: 0 }}>
                <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', textTransform: 'uppercase' }}>Debate Parameters</h3>

                {/* Topic selection */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Select Debate Topic</label>
                  <select 
                    value={topic} 
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', outline: 'none', background: '#FFF', fontSize: '0.9rem' }}
                  >
                    {PRESET_TOPICS.map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Topic Input */}
                {topic === "Custom Topic (Enter below)" && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Enter Custom Topic Title</label>
                    <input 
                      type="text"
                      placeholder="e.g., Space exploration should be prioritized over deep ocean research."
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {/* Debate Format selection */}
                <div style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Debate Format</label>
                    <select 
                      value={format} 
                      onChange={(e) => setFormat(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', outline: 'none', background: '#FFF', fontSize: '0.9rem' }}
                    >
                      <option>1-on-1 Debate</option>
                      <option>Parliamentary Debate</option>
                      <option>Oxford Debate</option>
                      <option>Policy Debate</option>
                      <option>Public Forum Debate</option>
                    </select>
                  </div>

                  {/* Position Assignment selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Assigned Position</label>
                    <select 
                      value={position} 
                      onChange={(e) => setPosition(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', outline: 'none', background: '#FFF', fontSize: '0.9rem' }}
                    >
                      <option value="Affirmative">Affirmative (Pro)</option>
                      <option value="Negative">Negative (Con)</option>
                    </select>
                  </div>
                </div>

                {/* Persona selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Opponent Persona</label>
                  <select 
                    value={persona} 
                    onChange={(e) => setPersona(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', outline: 'none', background: '#FFF', fontSize: '0.9rem' }}
                  >
                    <option>The Contrarian</option>
                    <option>The Academic</option>
                    <option>The Strategist</option>
                  </select>
                </div>

                {/* Launch Button */}
                <button 
                  onClick={handleStartDebate}
                  className="btn btn-red"
                  style={{ width: '100%', padding: '0.9rem', fontSize: '0.9rem', letterSpacing: '0.5px' }}
                >
                  Start Live AI Debate Simulation
                </button>
              </div>

              {/* Right Side: Session Practice Scheduler */}
              <div style={{ background: '#111827', color: '#FFF', border: '1px solid var(--dark-border)', padding: '2rem', borderRadius: 0, display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
                <div>
                  <h3 className="font-display text-red" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase' }}>Debate Scheduler</h3>
                  <p style={{ fontSize: '0.88rem', color: '#9CA3AF', marginBottom: '2rem', lineHeight: '1.5' }}>
                    Schedule practice sessions ahead of time. This saves your formatted configuration to your future practice dashboard logs.
                  </p>

                  {scheduleSuccess && (
                    <div style={{ background: '#1E293B', border: '1px solid var(--accent-red)', padding: '0.75rem', fontSize: '0.8rem', color: '#FFF', marginBottom: '1.5rem' }}>
                      {scheduleSuccess}
                    </div>
                  )}

                  <form onSubmit={handleSchedulePractice}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Practice Date</label>
                      <input 
                        type="date"
                        required
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--dark-border)', outline: 'none', background: '#1F2937', color: '#FFF', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Practice Time</label>
                      <input 
                        type="time"
                        required
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--dark-border)', outline: 'none', background: '#1F2937', color: '#FFF', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="btn"
                      style={{ width: '100%', padding: '0.75rem', background: 'transparent', color: '#FFF', border: '1px solid var(--dark-border)', transition: 'all 0.2s' }}
                    >
                      Schedule Practice Session
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Running Simulation Screen */}
        {sessionStatus === "Running" && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <div className="badge-red-pill">FORMAT: {format.toUpperCase()} // POSITION: {position.toUpperCase()}</div>
                <h1 className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase' }}>
                  DEBATE TERMINAL
                </h1>
              </div>

              {/* Complete Debate & Record Score Button */}
              <button 
                onClick={handleCompleteSession}
                className="btn btn-red"
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
              >
                Save & Complete Practice Recording
              </button>
            </div>

            {/* Terminal Window Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem' }}>
              {/* Terminal Box */}
              <div className="terminal-window">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                  </div>
                  <div className="terminal-title">LOGOS.AI SIMULATION // TOPIC: {topic === "Custom Topic (Enter below)" ? customTopic : topic}</div>
                </div>

                <div className="terminal-body" style={{ minHeight: '420px', maxHeight: '520px', overflowY: 'auto' }}>
                  {transcript.map((t, idx) => (
                    <div key={idx} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="font-mono text-muted">[{new Date().toLocaleTimeString()}]</span>
                        <strong className={t.type === 'user' ? 'text-cyan' : t.type === 'opponent' ? 'text-red' : 'text-green'}>
                          {t.speaker}:
                        </strong>
                      </div>

                      <div style={{ paddingLeft: '1.5rem', color: t.type === 'system' ? '#888' : '#e0e0e0', lineHeight: '1.5' }}>
                        {t.text}
                      </div>

                      {t.fallacies && t.fallacies.length > 0 && (
                        <div style={{ margin: '0.5rem 0 0 1.5rem', background: '#25080c', border: '1px solid var(--accent-red)', padding: '0.5rem 0.75rem', fontSize: '0.78rem' }}>
                          <strong className="text-red">⚠️ Fallacy Detected: {t.fallacies[0].fallacy_type}</strong>
                          <div style={{ color: '#ccc' }}>{t.fallacies[0].explanation}</div>
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && <div className="text-muted font-mono animate-pulse">&gt; Agent computing rebuttal...</div>}
                </div>

                <VoiceRecorder onConfirmed={handleVoiceConfirmed} disabled={loading || !sessionId} />

                {/* Form Input */}
                <form onSubmit={handleSendArgument} style={{ display: 'flex', borderTop: '1px solid var(--dark-border)', background: '#0e0e12' }}>
                  <input
                    type="text"
                    placeholder="Type your debate speech / counterargument here..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="font-mono"
                    style={{
                      flex: 1,
                      padding: '1rem 1.5rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                  <button type="submit" className="btn btn-red" style={{ borderRadius: 0 }}>
                    TRANSMIT
                  </button>
                </form>
              </div>

              {/* Real-time Telemetry Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '1.5rem' }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>OPPONENT REBUTTAL PRESSURE</div>
                  <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-red)' }}>
                    {lastAnalysis ? `${lastAnalysis.rebuttal_strength}%` : '98.4%'}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Status: High Pressure Defense
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '1.5rem' }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>LOGIC AUDIT STATUS</div>
                  {lastAnalysis && lastAnalysis.fallacies && lastAnalysis.fallacies.length > 0 ? (
                    <div style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>
                      ❌ Fallacy Flagged: {lastAnalysis.fallacies[0].fallacy_type}
                    </div>
                  ) : (
                    <div style={{ color: '#10b981', fontWeight: 'bold' }}>
                      ✓ No Fallacies Flagged in Last Turn
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--dark-bg)', color: '#fff', border: '1px solid var(--dark-border)', padding: '1.5rem', flex: 1 }}>
                  <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>COACHING ASSISTANT</div>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#ccc' }}>
                    {lastAnalysis ? lastAnalysis.coaching_tip : "Pivot back to primary evidence. Emphasize regulatory precedent to counter the opponent's market-friction argument."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completed Session Report Screen */}
        {sessionStatus === "Completed" && (
          <div style={{ maxWidth: '650px', margin: '3rem auto', background: '#FFF', border: '1px solid var(--border-light)', padding: '3rem 2.5rem', textAlign: 'center' }}>
            <div className="badge-red-pill">DEBATE RECORDED SUCCESSFULLY</div>
            <h1 className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem' }}>
              PRACTICE PERFORMANCE METRICS
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Your session has been recorded. The rhetoric model has calculated your initial argument scores and committed the profile logs to your matrix records.
            </p>

            {/* Complete Milestone Performance Matrix */}
            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>DEBATE PERFORMANCE // WEIGHTED MODEL</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                ['OVERALL SCORE', sessionScores.overall, true],
                ['ARGUMENT QUALITY · 30%', sessionScores.argument_quality, false],
                ['EVIDENCE USE · 20%', sessionScores.evidence_use, false],
                ['LOGICAL CONSISTENCY · 20%', sessionScores.logical, false],
                ['REBUTTAL EFFECTIVENESS · 15%', sessionScores.rebuttal, false],
                ['COMMUNICATION · 15%', sessionScores.communication, false],
              ].map(([label, value, accent]) => (
                <div key={label} style={{ padding: '1.25rem', background: '#F9FAFB', border: '1px solid #E5E7EB', textAlign: 'left' }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.65rem', marginBottom: '0.45rem' }}>{label}</div>
                  <div className={accent ? 'font-display text-red' : 'font-display'} style={{ fontSize: accent ? '2rem' : '1.75rem', fontWeight: '900' }}>{Number(value || 0).toFixed(1)}%</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>PRESENTATION & SPEECH ANALYTICS</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
              {[
                ['SPEAKING PACE', presentationMetrics ? `${presentationMetrics.speech_pace_wpm} WPM` : 'Not recorded'],
                ['FILLER WORDS', presentationMetrics ? `${presentationMetrics.filler_words_count}` : 'Not recorded'],
                ['CONFIDENCE', presentationMetrics ? `${presentationMetrics.confidence_score}%` : 'Not recorded'],
                ['CLARITY', presentationMetrics ? `${presentationMetrics.clarity_score}%` : 'Not recorded'],
                ['ENGAGEMENT', presentationMetrics ? `${presentationMetrics.engagement_score}%` : 'Not recorded'],
                ['FILLER BREAKDOWN', presentationMetrics ? (presentationMetrics.filler_words_list || 'None') : 'Not recorded'],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '1.15rem', background: '#FFF', border: '1px solid #E5E7EB', textAlign: 'left' }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.65rem', marginBottom: '0.45rem' }}>{label}</div>
                  <div className="font-display" style={{ fontSize: label === 'FILLER BREAKDOWN' ? '0.95rem' : '1.5rem', fontWeight: '900', wordBreak: 'break-word' }}>{value}</div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setSessionStatus("Setup")}
              className="btn btn-dark"
              style={{ padding: '0.85rem 2.5rem' }}
            >
              Start New Practice Session
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
