"use client";

import Link from 'next/link';
import { useState } from 'react';

const modules = [
  ['01 / 08', 'Argument mining', 'Extract claims, evidence, and reasoning from your text in seconds.'],
  ['02 / 08', 'Logic audit', 'Spot ad hominem, straw man, false dilemma, and more before your opponent does.'],
  ['03 / 08', 'Rebuttal engine', 'Generate evidence-led counterpoints with a configurable AI opponent.'],
  ['04 / 08', 'Vocal metrics', 'Track pace, filler words, clarity, confidence, and audience engagement.'],
  ['05 / 08', 'Simulation lab', 'Practice one-on-one, Oxford, parliamentary, policy, or public forum debate.'],
  ['06 / 08', 'Scoring model', 'A weighted view of argument quality, evidence, logic, rebuttal, and delivery.'],
  ['07 / 08', 'Coaching paths', 'Turn every session into a focused improvement plan.'],
  ['08 / 08', 'Analytics suite', 'See progress over time across debate and presentation performance.'],
];

export default function Home() {
  const [persona, setPersona] = useState('The Contrarian');
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Agentic reasoning engine · v4.0</div>
          <h1 className="display">Win the <em>argument.</em></h1>
          <p className="hero-copy">An AI debate coach for sharper thinking, stronger rebuttals, and presentations that hold the room. Practice under pressure, then understand exactly where to improve.</p>
          <div className="hero-actions">
            <Link href="/simulation" className="btn btn-red">Start simulation <span>↗</span></Link>
            <Link href="/dashboard" className="btn btn-ghost">View analytics</Link>
          </div>
          <div className="hero-meta">
            <div><span className="label muted">Core modules</span><strong>08</strong></div>
            <div><span className="label muted">Scoring dimensions</span><strong>05</strong></div>
            <div><span className="label muted">Debate formats</span><strong>06</strong></div>
          </div>
        </div>
        <div className="terminal">
          <div className="terminal-head"><span className="dots"><i/><i/><i/></span><span>SIMULATION_INTERFACE.EXE</span><span>LIVE</span></div>
          <div className="terminal-body">
            <div className="terminal-line"><span className="line-number">01</span><span>Initiating agentic engine v4.0...</span></div>
            <div className="terminal-line"><span className="line-number">02</span><span>User input: <span className="cyan">“AI deployments need immediate limits.”</span></span></div>
            <div className="terminal-line"><span className="line-number">03</span><span className="red">[AUDIT] False dilemma in premise #1</span></div>
            <div className="terminal-line"><span className="line-number">04</span><span className="green">Counterpoint: Risk-mitigated sandboxes provide a third path.</span></div>
            <div className="terminal-line"><span className="line-number">05</span><span>Claim evidence score: <span className="green">89.2 / 100</span></span></div>
            <div className="terminal-line"><span className="line-number">06</span><span>Vocal pace: 142 WPM · <span className="green">optimal</span></span></div>
            <div className="terminal-line"><span className="line-number">&gt;</span><span className="red">Awaiting rebuttal<span className="terminal-caret"/></span></div>
          </div>
        </div>
      </section>

      <section className="dark-band">
        <div className="dark-band-inner">
          <div>
            <div className="eyebrow">Simulation engine</div>
            <h2 className="display">Train against the <span className="red">pressure.</span></h2>
            <p>Choose a topic, position, format, and opponent persona. LOGOS adapts its cross-examination as you argue — then shows you the move you missed.</p>
            <div style={{display:'flex', gap:10, marginTop:28, flexWrap:'wrap'}}>
              {['The Contrarian','The Academic','The Strategist'].map(item => <button key={item} className={persona === item ? 'btn btn-red' : 'btn'} onClick={() => setPersona(item)}>{item}</button>)}
            </div>
          </div>
          <div className="terminal">
            <div className="terminal-head"><span className="dots"><i/><i/><i/></span><span>AI_DEBATE / {persona.toUpperCase()}</span><span>TURN 04</span></div>
            <div className="terminal-body" style={{minHeight:240}}>
              <div className="terminal-line"><span className="cyan">&gt; MODE:</span><span>Multi-turn cross-examination</span></div>
              <div style={{margin:'28px 0', lineHeight:1.8}}><span className="red">AI opponent:</span> “Your proposal assumes fiscal neutrality, but doesn’t account for implementation overhead. How do you justify the capital allocation?”</div>
              <div className="muted">[ awaiting user rebuttal input ] <span className="terminal-caret"/></div>
            </div>
          </div>
        </div>
      </section>

      <section className="module-section" id="engines">
        <div className="section-heading"><div><div className="eyebrow">The intelligence layer</div><h2 className="display">The analysis suite</h2></div><span className="label muted">[ 08 core modules ]</span></div>
        <div className="module-grid">{modules.map(([number, title, description]) => <div className="module-card" key={number}><div className="module-no">{number}</div><h3>{title}</h3><p>{description}</p></div>)}</div>
      </section>

      <section className="weight-strip">
        {[['30%','Argument quality'],['20%','Evidence use'],['20%','Logical consistency'],['15%','Rebuttal effectiveness'],['15%','Communication']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </section>
    </>
  );
}