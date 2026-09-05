"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [activePersona, setActivePersona] = useState('THE CONTRARIAN');

  return (
    <div className="watermark-container" style={{ position: 'relative' }}>
      {/* Soft Ambient Aurora Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '10%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, rgba(99, 102, 241, 0.12) 50%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '5%',
        width: '380px',
        height: '380px',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Hero Section */}
      <section className="hero-section" style={{ position: 'relative', zIndex: 1 }}>
        <div>
          <div className="badge-red-pill">
            <span className="badge-dot"></span> AGENTIC REASONING ENGINE v4.0
          </div>
          
          <h1 className="hero-title">
            Win the<br />
            <span className="red">Argument.</span>
          </h1>

          <p className="hero-subtitle">
            The world's first agentic AI platform for high-stakes rhetoric. Detect fallacies in real-time. Simulate world-class opponents. Master the podium.
          </p>

          <div className="hero-cta-group">
            <Link href="/simulation" className="btn btn-red" style={{ padding: '0.85rem 2rem', fontSize: '0.92rem' }}>
              Start Simulation
            </Link>
            <Link href="/dashboard" className="btn btn-login" style={{ padding: '0.85rem 2rem', fontSize: '0.92rem' }}>
              View Analytics
            </Link>
          </div>
        </div>

        {/* Hero Interactive Terminal Mockup with iOS Glass Elements */}
        <div style={{ position: 'relative' }}>
          {/* Floating Rebuttal Strength Glass Badge */}
          <div 
            style={{
              position: 'absolute',
              bottom: '-1rem',
              left: '-1rem',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              borderRadius: '16px',
              padding: '0.65rem 1.1rem',
              boxShadow: '0 12px 28px -6px rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              zIndex: 10
            }}
          >
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>REBUTTAL STRENGTH</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>98.4% · High Impact</div>
            </div>
          </div>

          {/* Floating Fallacy Glass Badge */}
          <div 
            style={{
              position: 'absolute',
              top: '-1rem',
              right: '-1rem',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(254, 205, 211, 0.9)',
              borderRadius: '16px',
              padding: '0.65rem 1.1rem',
              boxShadow: '0 12px 28px -6px rgba(244, 63, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              zIndex: 10
            }}
          >
            <span style={{ fontSize: '1rem' }}>⚖️</span>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#e11d48' }}>FALLACY DETECTED</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>Straw Man Detected</div>
            </div>
          </div>

          {/* Glass Terminal Container */}
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="terminal-title">SIMULATION_INTERFACE_ERE</div>
            </div>
            
            <div className="terminal-body">
              <div className="terminal-line">
                <span className="line-num">&gt;&gt;</span>
                <span className="text-muted">Initiating Agentic Engine v4.0...</span>
              </div>
              <div className="terminal-line">
                <span className="line-num">&gt;&gt;</span>
                <span className="text-muted">Loading rhetorical frameworks...</span>
              </div>
              <div className="terminal-line">
                <span className="line-num">&gt;&gt;</span>
                <span className="text-purple">Opponent Model: The Contrarian</span>
              </div>
              <div style={{ height: '0.5rem' }} />
              <div className="terminal-line">
                <span className="text-cyan font-bold">User Input:</span>
                <span>"We must immediately restrict AI deployments."</span>
              </div>
              <div className="terminal-line">
                <span className="text-red font-bold">[AUDIT]</span>
                <span className="text-red">Fallacy Detected: False Dilemma in premise #1</span>
              </div>
              <div style={{ height: '0.5rem' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', marginTop: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Rebuttal Strength:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>98.4%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Confidence Score:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>89.2 / 100</div>
                </div>
              </div>

              {/* Animated Soundwave Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px', marginTop: '1.25rem', justifyContent: 'center' }}>
                {[12, 18, 8, 22, 14, 24, 10, 16, 20, 12, 19, 15, 8, 21, 13, 24, 11, 17].map((h, i) => (
                  <span 
                    key={i} 
                    style={{ 
                      width: '3px', 
                      height: `${h}px`, 
                      background: 'linear-gradient(to top, #4f46e5, #ec4899)', 
                      borderRadius: '9999px',
                      opacity: 0.8
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Analysis Suite Grid Section */}
      <section className="section-container" id="engines">
        <div className="section-header">
          <div>
            <div className="badge-red-pill">AGENTIC CAPABILITIES</div>
            <h2 className="section-title">The Analysis Suite</h2>
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.85rem' }}>[8 CORE MODULES]</div>
        </div>

        <div className="modules-grid">
          {[
            { num: '01/08', title: 'Argument Mining', desc: 'Automatic extraction of claims and evidence from live speech or text streams.', icon: '🔍' },
            { num: '02/08', title: 'Logic Audit', desc: 'Detects ad hominem, straw man, and 24+ other logical fallacies in real-time.', icon: '⚖️' },
            { num: '03/08', title: 'Rebuttal Gen', desc: 'Generates evidence-backed counterpoints using diverse agentic opponent personas.', icon: '⚡' },
            { num: '04/08', title: 'Vocal Metrics', desc: 'Analyzes cadence, filler words, clarity, and confidence with real-time mic streaming.', icon: '🎙️' },
            { num: '05/08', title: 'Simulation Engine', desc: 'Engage with LLM-driven opponents across five international debate formats.', icon: '🤖' },
            { num: '06/08', title: 'Scoring Model', desc: 'Weighted assessment of argument quality, logic, rebuttal, and communication.', icon: '📊' },
            { num: '07/08', title: 'Coaching Engine', desc: 'Personalized feedback, skill gap analysis, and tailored rhetorical drills.', icon: '🎯' },
            { num: '08/08', title: 'Analytics Suite', desc: 'Learner, coach, educator, and admin dashboards with full progress telemetry.', icon: '📈' },
          ].map((mod) => (
            <div key={mod.num} className="module-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="module-num">{mod.num}</span>
                <span style={{ fontSize: '1.25rem' }}>{mod.icon}</span>
              </div>
              <h3 className="module-title">{mod.title}</h3>
              <p className="module-desc">{mod.desc}</p>
              <div className="module-line"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Weighted Performance Scoring Bar */}
      <section className="section-container" style={{ paddingTop: 0 }}>
        <div className="scoring-bar">
          <div className="score-item">
            <div className="score-val">30%</div>
            <div className="score-lbl">Argument Quality</div>
          </div>
          <div className="score-item">
            <div className="score-val">20%</div>
            <div className="score-lbl">Evidence Use</div>
          </div>
          <div className="score-item">
            <div className="score-val">20%</div>
            <div className="score-lbl">Logical Consistency</div>
          </div>
          <div className="score-item">
            <div className="score-val">15%</div>
            <div className="score-lbl">Rebuttal Depth</div>
          </div>
          <div className="score-item">
            <div className="score-val">15%</div>
            <div className="score-lbl">Delivery & Prosody</div>
          </div>
        </div>
      </section>

      {/* Onboarding & Personas Section */}
      <section className="section-container" style={{ textAlign: 'center', padding: '4rem 3rem 6rem' }}>
        <h2 className="font-display" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: '900', marginBottom: '2.5rem' }}>
          Ready for the Podium?
        </h2>

        <div className="persona-grid" style={{ textAlign: 'left' }}>
          <div className="persona-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎓</div>
            <h3 className="persona-card-title">Learner</h3>
            <p className="persona-card-desc">Master critical thinking, conquer logical fallacies, and gain real-time vocal feedback.</p>
          </div>

          <div className="persona-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
            <h3 className="persona-card-title">Debate Coach</h3>
            <p className="persona-card-desc">Mentor students with structured analytics, drill rubrics, and automated logic audits.</p>
          </div>

          <div className="persona-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏛️</div>
            <h3 className="persona-card-title">Educator</h3>
            <p className="persona-card-desc">Monitor classroom progress, assign standardized debate topics, and track mastery.</p>
          </div>

          <Link href="/simulation" className="btn btn-red" style={{ height: '100%', fontSize: '1.05rem', justifyContent: 'center', borderRadius: '20px' }}>
            Get Started Now →
          </Link>
        </div>
      </section>
    </div>
  );
}
