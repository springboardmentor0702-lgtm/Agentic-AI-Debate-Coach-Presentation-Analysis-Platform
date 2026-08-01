"use client";

import { useState } from 'react';

export default function SimulationPage() {
  const [topic, setTopic] = useState("Autonomous AI Systems should be held legally liable for unintended damages.");
  const [format, setFormat] = useState("Parliamentary Debate");
  const [persona, setPersona] = useState("The Contrarian");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [transcript, setTranscript] = useState([
    {
      speaker: "System",
      text: "Debate Session Initialized. Format: Parliamentary | Opponent: The Contrarian | Position: Affirmative",
      type: "system"
    },
    {
      speaker: "AI Opponent",
      text: "Affirmative speaker, you have the floor. Present your opening proposition.",
      type: "opponent"
    }
  ]);

  const [lastAnalysis, setLastAnalysis] = useState(null);

  const handleSendArgument = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg = userInput;
    setUserInput("");

    setTranscript(prev => [...prev, { speaker: "You", text: userMsg, type: "user" }]);
    setLoading(true);

    try {
      // Call FastAPI simulation & argument evaluation backend
      const simRes = await fetch("http://localhost:8000/api/v1/simulation/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          user_argument: userMsg,
          opponent_persona: persona
        })
      });

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
      // Fallback local response if backend API is offline during client rendering
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
      <div className="watermark-text" style={{ bottom: '2rem', right: '2rem', left: 'auto', opacity: 0.05 }}>RHETORIC</div>
      <div className="section-container" style={{ paddingTop: '2rem', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="badge-red-pill">LIVE SIMULATION ENGINE</div>
          <h1 className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase' }}>
            DEBATE TERMINAL
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            value={format} 
            onChange={(e) => setFormat(e.target.value)}
            className="font-mono"
            style={{ padding: '0.6rem 1rem', background: '#fff', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
          >
            <option>Parliamentary Debate</option>
            <option>Oxford Debate</option>
            <option>Policy Debate</option>
            <option>Public Forum Debate</option>
            <option>1-on-1 Debate</option>
          </select>

          <select 
            value={persona} 
            onChange={(e) => setPersona(e.target.value)}
            className="font-mono"
            style={{ padding: '0.6rem 1rem', background: '#fff', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
          >
            <option>The Contrarian</option>
            <option>The Academic</option>
            <option>The Strategist</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Terminal vs Real-time Analytics Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem' }}>
        {/* Terminal Box */}
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <div className="terminal-title">LOGOS.AI SIMULATION // TOPIC: {topic}</div>
          </div>

          <div className="terminal-body" style={{ minHeight: '420px' }}>
            {transcript.map((t, idx) => (
              <div key={idx} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="font-mono text-muted">[{new Date().toLocaleTimeString()}]</span>
                  <strong className={t.type === 'user' ? 'text-cyan' : t.type === 'opponent' ? 'text-red' : 'text-green'}>
                    {t.speaker}:
                  </strong>
                </div>

                <div style={{ paddingLeft: '1.5rem', color: t.type === 'system' ? '#888' : '#e0e0e0' }}>
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
          {/* Rebuttal Strength Box */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '1.5rem' }}>
            <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>OPPONENT REBUTTAL PRESSURE</div>
            <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-red)' }}>
              {lastAnalysis ? `${lastAnalysis.rebuttal_strength}%` : '98.4%'}
            </div>
            <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Status: High Pressure Defense
            </div>
          </div>

          {/* Fallacy Shield Status */}
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

          {/* Coaching Tip */}
          <div style={{ background: 'var(--dark-bg)', color: '#fff', border: '1px solid var(--dark-border)', padding: '1.5rem', flex: 1 }}>
            <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>COACHING ASSISTANT</div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#ccc' }}>
              {lastAnalysis ? lastAnalysis.coaching_tip : "Pivot back to primary evidence. Emphasize regulatory precedent to counter the opponent's market-friction argument."}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
