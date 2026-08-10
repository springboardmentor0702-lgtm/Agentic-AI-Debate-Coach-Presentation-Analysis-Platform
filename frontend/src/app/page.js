"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [activePersona, setActivePersona] = useState('THE CONTRARIAN');

  return (
    <div className="watermark-container">
      {/* Hero Section */}
      <section className="hero-section">
        {/* Background Watermark Text */}
        <div className="watermark-text" style={{ bottom: '0px', left: '-2rem', zIndex: -1 }}>RHETORIC</div>

        <div>
          <div className="badge-red-pill">
            <span className="badge-dot"></span> AGENTIC REASONING ENGINE V 4.0
          </div>
          
          <h1 className="hero-title">
            WIN THE<br />
            <span className="red">ARGUMENT.</span>
          </h1>

          <p className="hero-subtitle">
            The world's first agentic AI platform for high-stakes rhetoric. Detect fallacies in real-time. Simulate world-class opponents. Master the podium.
          </p>

          <div className="hero-cta-group">
            <Link href="/simulation" className="btn btn-dark">
              START SIMULATION
            </Link>
            <Link href="/dashboard" className="btn btn-login">
              VIEW ANALYTICS
            </Link>
          </div>
        </div>

        {/* Hero Interactive Terminal Mockup */}
        <div style={{ position: 'relative' }}>
          {/* Floating Rebuttal Strength Badge */}
          <div 
            className="font-mono"
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '-1rem',
              background: 'var(--accent-red)',
              color: '#fff',
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              zIndex: 10
            }}
          >
            REBUTTAL_STRENGTH: 98.4%
          </div>

          {/* Floating Fallacy Badge */}
          <div 
            className="font-mono"
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '-1rem',
              background: '#000',
              color: '#fff',
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              border: '1px solid var(--accent-red)',
              zIndex: 10
            }}
          >
            FALLACY: STRAW_MAN_DETECTED
          </div>

          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="terminal-title">SIMULATION_INTERFACE.EXE</div>
            </div>
            
            <div className="terminal-body">
              <div className="terminal-line">
                <span className="line-num">01</span>
                <span className="text-muted">Initiating Agentic Engine v4.0...</span>
              </div>
              <div className="terminal-line">
                <span className="line-num">02</span>
                <span>User Input: <span className="text-cyan">"We must immediately restrict AI deployments."</span></span>
              </div>
              <div className="terminal-line">
                <span className="line-num">03</span>
                <span className="text-red">[AUDIT] Fallacy Detected: False Dilemma in premise #1</span>
              </div>
              <div className="terminal-line">
                <span className="line-num">04</span>
                <span className="text-green">Opponent Rebuttal: "Asserting a binary choice ignores risk-mitigated regulatory sandboxes."</span>
              </div>
              <div className="terminal-line">
                <span className="line-num">05</span>
                <span>Claim Evidence Score: <span className="text-green">89.2 / 100</span></span>
              </div>
              <div className="terminal-line">
                <span className="line-num">06</span>
                <span className="text-muted">Vocal Pace: 142 WPM (Optimal Range)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Debate Simulation Showcase (Dark Section) */}
      <section style={{ background: 'var(--dark-bg)', color: '#fff', padding: '6rem 3rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '3.2rem', fontWeight: '900', lineHeight: 1.05, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              DEBATE SIMULATION<br />
              <span style={{ color: 'var(--accent-red)' }}>OPPONENT</span>
            </h2>

            <p style={{ color: '#a0a0b0', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
              Train against AI agents configured for Parliamentary, Oxford, or Policy debate formats. Real-time rebuttal pressure.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div 
                onClick={() => setActivePersona('THE CONTRARIAN')}
                style={{ cursor: 'pointer', opacity: activePersona === 'THE CONTRARIAN' ? 1 : 0.4 }}
              >
                <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>ACTIVE PERSONA</div>
                <div className="font-display" style={{ fontSize: '1.6rem', fontWeight: '800' }}>THE CONTRARIAN</div>
              </div>

              <div 
                onClick={() => setActivePersona('THE ACADEMIC')}
                style={{ cursor: 'pointer', opacity: activePersona === 'THE ACADEMIC' ? 1 : 0.4 }}
              >
                <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>AVAILABLE PERSONA</div>
                <div className="font-display" style={{ fontSize: '1.6rem', fontWeight: '800' }}>THE ACADEMIC</div>
              </div>
            </div>
          </div>

          <div>
            <div className="terminal-window" style={{ background: '#0e0e12' }}>
              <div className="terminal-header" style={{ background: '#14141c' }}>
                <div className="terminal-dots">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <div className="terminal-title">ANI Debates - {activePersona}</div>
              </div>
              <div className="terminal-body" style={{ minHeight: '320px' }}>
                <p className="text-cyan" style={{ marginBottom: '1rem' }}>
                  &gt; Mode: Multi-turn Cross-Examination [{activePersona}]
                </p>
                <p style={{ marginBottom: '1rem' }}>
                  <span className="text-red">AI Opponent:</span> "Your proposal assumes fiscal neutrality, but fails to account for implementation overhead. How do you justify the capital allocation?"
                </p>
                <p className="text-muted">
                  [Awaiting User Rebuttal Input...]
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Analysis Suite Grid Section */}
      <section className="section-container" id="engines">
        <div className="section-header">
          <h2 className="section-title">THE ANALYSIS SUITE</h2>
          <div className="font-mono text-muted">[8 CORE MODULES]</div>
        </div>

        <div className="modules-grid">
          <div className="module-card">
            <div className="module-num">01/08</div>
            <h3 className="module-title">ARGUMENT MINING</h3>
            <p className="module-desc">Automatic extraction of claims and evidence from live speech or text streams.</p>
            <div className="module-line"></div>
          </div>

          <div className="module-card">
            <div className="module-num">02/08</div>
            <h3 className="module-title">LOGIC AUDIT</h3>
            <p className="module-desc">Detects ad hominem, straw man, and 24+ other logical fallacies instantly.</p>
            <div className="module-line"></div>
          </div>

          <div className="module-card">
            <div className="module-num">03/08</div>
            <h3 className="module-title">REBUTTAL GEN</h3>
            <p className="module-desc">Generates evidence-backed counterpoints using diverse agentic personas.</p>
            <div className="module-line"></div>
          </div>

          <div className="module-card">
            <div className="module-num">04/08</div>
            <h3 className="module-title">VOCAL METRICS</h3>
            <p className="module-desc">Analyzes cadence, filler words, and confidence levels through prosody analysis.</p>
            <div className="module-line"></div>
          </div>

          <div className="module-card">
            <div className="module-num">05/08</div>
            <h3 className="module-title">SIMULATION ENGINE</h3>
            <p className="module-desc">Engage with LLM-driven opponents across five debate formats.</p>
            <div className="module-line"></div>
          </div>

          <div className="module-card">
            <div className="module-num">06/08</div>
            <h3 className="module-title">SCORING MODEL</h3>
            <p className="module-desc">Weighted assessment of argument quality, logic, and delivery.</p>
            <div className="module-line"></div>
          </div>

          <div className="module-card">
            <div className="module-num">07/08</div>
            <h3 className="module-title">COACHING ENGINE</h3>
            <p className="module-desc">Personalized feedback, improvement plans, and skill gap analysis.</p>
            <div className="module-line"></div>
          </div>

          <div className="module-card">
            <div className="module-num">08/08</div>
            <h3 className="module-title">ANALYTICS SUITE</h3>
            <p className="module-desc">Learner, coach, educator, and admin dashboards with progress tracking.</p>
            <div className="module-line"></div>
          </div>
        </div>
      </section>

      {/* Weighted Performance Scoring Bar */}
      <section className="scoring-bar">
        <div className="score-item">
          <div className="score-val">30%</div>
          <div className="score-lbl">ARGUMENT QUALITY</div>
        </div>
        <div className="score-item">
          <div className="score-val">20%</div>
          <div className="score-lbl">EVIDENCE USE</div>
        </div>
        <div className="score-item">
          <div className="score-val">20%</div>
          <div className="score-lbl">CONSISTENCY</div>
        </div>
        <div className="score-item">
          <div className="score-val">15%</div>
          <div className="score-lbl">REBUTTAL EFFECTIVENESS</div>
        </div>
        <div className="score-item">
          <div className="score-val">15%</div>
          <div className="score-lbl">COMMUNICATION</div>
        </div>
      </section>

      {/* Onboarding & Personas Section */}
      <section className="section-container" style={{ textAlign: 'center', padding: '6rem 3rem' }}>
        <h2 className="font-display" style={{ fontSize: '3.5rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '3rem' }}>
          READY FOR THE PODIUM?
        </h2>

        <div className="persona-grid" style={{ textAlign: 'left' }}>
          <div className="persona-card">
            <h3 className="persona-card-title">LEARNER</h3>
            <p className="persona-card-desc">Master critical thinking via real-time feedback.</p>
          </div>

          <div className="persona-card">
            <h3 className="persona-card-title">COACH</h3>
            <p className="persona-card-desc">Mentor students with structured analytics.</p>
          </div>

          <div className="persona-card">
            <h3 className="persona-card-title">EDUCATOR</h3>
            <p className="persona-card-desc">Monitor student progress and gaps.</p>
          </div>

          <Link href="/simulation" className="btn btn-dark" style={{ height: '100%', fontSize: '1.1rem', justifyContent: 'center' }}>
            GET STARTED
          </Link>
        </div>
      </section>
    </div>
  );
}
