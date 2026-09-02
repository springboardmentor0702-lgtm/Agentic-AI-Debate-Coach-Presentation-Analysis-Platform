"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '../components/AuthModal';

export default function Home() {
  const router = useRouter();
  const [activePersona, setActivePersona] = useState('THE CONTRARIAN');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('logos_ai_jwt');
    if (!token) {
      // First time visitor / unauthenticated user: Show Auth Modal
      setIsAuthModalOpen(true);
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(true);
      setIsAuthModalOpen(false);
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
    if (pendingRoute) {
      router.push(pendingRoute);
      setPendingRoute(null);
    }
  };

  // Intercept any protected feature click when logged out
  const handleFeatureClick = (e, targetRoute = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const token = localStorage.getItem('logos_ai_jwt');
    if (!token) {
      setPendingRoute(targetRoute);
      setIsAuthModalOpen(true);
      return false;
    }
    if (targetRoute) {
      router.push(targetRoute);
    }
    return true;
  };

  return (
    <>
      {/* Login & Sign Up Modal with Glassmorphism Backdrop */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Main Homepage Container: Full features remain visible */}
      <div 
        className="watermark-container"
        style={{
          filter: isAuthModalOpen ? 'blur(6px)' : 'none',
          transition: 'filter 0.3s ease-in-out',
          userSelect: isAuthModalOpen ? 'none' : 'auto'
        }}
      >
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
              <button 
                onClick={(e) => handleFeatureClick(e, '/simulation')}
                className="btn btn-dark"
                style={{ cursor: 'pointer' }}
              >
                START SIMULATION
              </button>
              <button 
                onClick={(e) => handleFeatureClick(e, '/dashboard')}
                className="btn btn-login"
                style={{ cursor: 'pointer' }}
              >
                VIEW ANALYTICS
              </button>
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
                borderRadius: '6px',
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
                borderRadius: '6px',
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

                <div style={{ marginTop: '1rem' }}>
                  <button 
                    onClick={(e) => handleFeatureClick(e, '/simulation')}
                    className="btn btn-red"
                    style={{ padding: '0.75rem 1.75rem', fontSize: '0.85rem' }}
                  >
                    DEPLOY SIMULATION AGENT &rarr;
                  </button>
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
                  <div style={{ marginTop: '2rem' }}>
                    <button 
                      onClick={(e) => handleFeatureClick(e, '/simulation')}
                      className="btn btn-red"
                      style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
                    >
                      Enter Live Debate Terminal
                    </button>
                  </div>
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
            <div 
              className="module-card" 
              onClick={(e) => handleFeatureClick(e, '/simulation')}
              style={{ cursor: 'pointer' }}
              title="Click to access Argument Mining"
            >
              <div className="module-num">01/08</div>
              <h3 className="module-title">ARGUMENT MINING</h3>
              <p className="module-desc">Automatic extraction of claims and evidence from live speech or text streams.</p>
              <div className="module-line"></div>
            </div>

            <div 
              className="module-card" 
              onClick={(e) => handleFeatureClick(e, '/simulation')}
              style={{ cursor: 'pointer' }}
              title="Click to access Logic Audit"
            >
              <div className="module-num">02/08</div>
              <h3 className="module-title">LOGIC AUDIT</h3>
              <p className="module-desc">Detects ad hominem, straw man, and 24+ other logical fallacies instantly.</p>
              <div className="module-line"></div>
            </div>

            <div 
              className="module-card" 
              onClick={(e) => handleFeatureClick(e, '/simulation')}
              style={{ cursor: 'pointer' }}
              title="Click to access Rebuttal Generator"
            >
              <div className="module-num">03/08</div>
              <h3 className="module-title">REBUTTAL GEN</h3>
              <p className="module-desc">Generates evidence-backed counterpoints using diverse agentic personas.</p>
              <div className="module-line"></div>
            </div>

            <div 
              className="module-card" 
              onClick={(e) => handleFeatureClick(e, '/presentation')}
              style={{ cursor: 'pointer' }}
              title="Click to access Vocal Metrics"
            >
              <div className="module-num">04/08</div>
              <h3 className="module-title">VOCAL METRICS</h3>
              <p className="module-desc">Analyzes cadence, filler words, and confidence levels through prosody analysis.</p>
              <div className="module-line"></div>
            </div>

            <div 
              className="module-card" 
              onClick={(e) => handleFeatureClick(e, '/simulation')}
              style={{ cursor: 'pointer' }}
              title="Click to access Simulation Engine"
            >
              <div className="module-num">05/08</div>
              <h3 className="module-title">SIMULATION ENGINE</h3>
              <p className="module-desc">Engage with LLM-driven opponents across five debate formats.</p>
              <div className="module-line"></div>
            </div>

            <div 
              className="module-card" 
              onClick={(e) => handleFeatureClick(e, '/dashboard')}
              style={{ cursor: 'pointer' }}
              title="Click to access Scoring Model"
            >
              <div className="module-num">06/08</div>
              <h3 className="module-title">SCORING MODEL</h3>
              <p className="module-desc">Weighted assessment of argument quality, logic, and delivery.</p>
              <div className="module-line"></div>
            </div>

            <div 
              className="module-card" 
              onClick={(e) => handleFeatureClick(e, '/dashboard')}
              style={{ cursor: 'pointer' }}
              title="Click to access Coaching Engine"
            >
              <div className="module-num">07/08</div>
              <h3 className="module-title">COACHING ENGINE</h3>
              <p className="module-desc">Personalized feedback, improvement plans, and skill gap analysis.</p>
              <div className="module-line"></div>
            </div>

            <div 
              className="module-card" 
              onClick={(e) => handleFeatureClick(e, '/reports')}
              style={{ cursor: 'pointer' }}
              title="Click to access Analytics Reports"
            >
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
            <div className="persona-card" onClick={(e) => handleFeatureClick(e, '/simulation')} style={{ cursor: 'pointer' }}>
              <h3 className="persona-card-title">LEARNER</h3>
              <p className="persona-card-desc">Master critical thinking via real-time feedback.</p>
            </div>

            <div className="persona-card" onClick={(e) => handleFeatureClick(e, '/dashboard')} style={{ cursor: 'pointer' }}>
              <h3 className="persona-card-title">COACH</h3>
              <p className="persona-card-desc">Mentor students with structured analytics.</p>
            </div>

            <div className="persona-card" onClick={(e) => handleFeatureClick(e, '/dashboard')} style={{ cursor: 'pointer' }}>
              <h3 className="persona-card-title">EDUCATOR</h3>
              <p className="persona-card-desc">Monitor student progress and gaps.</p>
            </div>

            <button 
              onClick={(e) => handleFeatureClick(e, '/simulation')}
              className="btn btn-dark" 
              style={{ height: '100%', fontSize: '1.1rem', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
            >
              GET STARTED
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
