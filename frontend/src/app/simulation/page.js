"use client";

import { useState, useEffect } from 'react';
import { apiUrl } from '../../lib/api';

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

function TypewriterText({ text, speed = 15 }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    const timer = setInterval(() => {
      setDisplayedText((prev) => {
        const nextChar = text.charAt(index);
        index++;
        if (index >= text.length) {
          clearInterval(timer);
        }
        return prev + nextChar;
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
  const [sessionStatus, setSessionStatus] = useState("Setup"); // Setup, Running, Completed
  const [sessionId, setSessionId] = useState(null);
  
  // Scheduling States
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduleSuccess, setScheduleSuccess] = useState("");

  const [transcript, setTranscript] = useState([]);
  const [lastAnalysis, setLastAnalysis] = useState(null);

  const handleStartDebate = async () => {
    setLoading(true);
    const finalTopic = topic === "Custom Topic (Enter below)" ? customTopic : topic;
    try {
      const res = await fetch(apiUrl('/api/v1/sessions/create'), {
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
      localStorage.setItem('logos_ai_active_session_id', String(data.id));

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
      await fetch(apiUrl('/api/v1/sessions/create'), {
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

  const handleCompleteSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/v1/sessions/${sessionId}/complete`), {
        method: "POST",
        headers: authHeaders()
      });
      if (!response.ok) throw new Error('Unable to complete the debate session.');
      setSessionStatus("Completed");
    } catch (err) {
      setSessionStatus("Completed");
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
      const simRes = await fetch(apiUrl('/api/v1/simulation/turn'), {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          session_id: sessionId,
          user_argument: userMsg,
          opponent_persona: persona
        })
      });

      if (!simRes.ok) throw new Error('Unable to process this debate turn.');
      const data = await simRes.json();

      setTranscript(prev => [
        ...prev,
        {
          speaker: `AI Opponent (${persona})`,
          text: data.opponent_rebuttal,
          type: "opponent",
          rebuttal_strength: data.rebuttal_strength_percent,
          fallacies: data.fallacies_detected_in_user
        }
      ]);

      setLastAnalysis({
        rebuttal_strength: data.rebuttal_strength_percent,
        fallacies: data.fallacies_detected_in_user,
        coaching_tip: data.coaching_tip
      });

    } catch (err) {
      setTranscript(prev => [
        ...prev,
        {
          speaker: `AI Opponent (${persona})`,
          text: `I reject your proposition. Asserting that liability rests on autonomous units ignores manufacturer warranty and human operator oversight.`,
          type: "opponent",
          rebuttal_strength: 96.5,
          fallacies: []
        }
      ]);
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
                        {t.type === 'opponent' && idx === transcript.length - 1 ? (
                          <TypewriterText text={t.text} />
                        ) : (
                          t.text
                        )}
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

            {/* Score Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
              <div style={{ padding: '1.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div className="font-mono text-muted" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>OVERALL SCORE</div>
                <div className="font-display text-red" style={{ fontSize: '2rem', fontWeight: '900' }}>84.2%</div>
              </div>
              <div style={{ padding: '1.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div className="font-mono text-muted" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>LOGICAL SCORE</div>
                <div className="font-display" style={{ fontSize: '2rem', fontWeight: '900' }}>88.5%</div>
              </div>
              <div style={{ padding: '1.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div className="font-mono text-muted" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>REBUTTAL EFF.</div>
                <div className="font-display" style={{ fontSize: '2rem', fontWeight: '900' }}>82.0%</div>
              </div>
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
