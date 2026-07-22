"use client";

import { useState } from 'react';

export default function DashboardPage() {
  const [activeRole, setActiveRole] = useState('Learner');

  return (
    <div className="section-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <div className="badge-red-pill">ANALYTICS & INSIGHTS SUITE</div>
          <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: '900', textTransform: 'uppercase' }}>
            PERFORMANCE DASHBOARD
          </h1>
        </div>

        {/* Role Switcher */}
        <div style={{ display: 'flex', border: '1px solid var(--border-light)' }}>
          {['Learner', 'Coach', 'Educator', 'Admin'].map((r) => (
            <button
              key={r}
              onClick={() => setActiveRole(r)}
              className="btn"
              style={{
                borderRadius: 0,
                background: activeRole === r ? 'var(--text-primary)' : 'transparent',
                color: activeRole === r ? '#fff' : 'var(--text-primary)',
                borderRight: '1px solid var(--border-light)'
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Role View 1: Learner */}
      {activeRole === 'Learner' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>TOTAL DEBATES COMPLETED</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900' }}>14</div>
            </div>

            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>AVERAGE SCORE</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-red)' }}>88.5</div>
            </div>

            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>TOP FALLACY SHIELDED</div>
              <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.5rem' }}>Straw Man</div>
            </div>

            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>COACHING LEVEL</div>
              <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.5rem', color: '#10b981' }}>Level 4</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <div style={{ border: '1px solid var(--border-light)', padding: '2rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>
                RECENT DEBATE SESSIONS
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0' }}>DATE</th>
                    <th>TOPIC</th>
                    <th>FORMAT</th>
                    <th>POSITION</th>
                    <th>SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem 0' }} className="font-mono">2026-07-20</td>
                    <td>AI Legal Liability in Autonomous Tech</td>
                    <td>Parliamentary</td>
                    <td>Affirmative</td>
                    <td className="font-mono text-green" style={{ fontWeight: 'bold' }}>91.2</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem 0' }} className="font-mono">2026-07-18</td>
                    <td>Universal Basic Income & Labor Dynamics</td>
                    <td>Oxford</td>
                    <td>Negative</td>
                    <td className="font-mono text-green" style={{ fontWeight: 'bold' }}>87.5</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: 'var(--bg-secondary)' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>
                RECOMMENDED DRILLS
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <li style={{ padding: '0.75rem', background: '#fff', border: '1px solid var(--border-light)' }}>
                  🎯 <strong>Socratic Cross-fire:</strong> Train against "The Academic" persona.
                </li>
                <li style={{ padding: '0.75rem', background: '#fff', border: '1px solid var(--border-light)' }}>
                  ⚡ <strong>Speed Pacing Drill:</strong> Aim for 140 WPM speech pace.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Role View 2: Coach */}
      {activeRole === 'Coach' && (
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1.5rem' }}>
            DEBATE COACH MONITORING PANEL
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Track assigned student progress, evaluate recent debate arguments, and assign custom practice pathways.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
              <div className="font-mono text-muted">ASSIGNED STUDENTS</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900' }}>28</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
              <div className="font-mono text-muted">PENDING EVALUATIONS</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-red)' }}>4</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
              <div className="font-mono text-muted">CLASS SKILL GAP</div>
              <div className="font-display" style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '0.5rem' }}>Ad Hominem Shielding</div>
            </div>
          </div>
        </div>
      )}

      {/* Role View 3: Educator */}
      {activeRole === 'Educator' && (
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1.5rem' }}>
            EDUCATOR CLASS ANALYTICS
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted">ENROLLED STUDENTS</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900' }}>72</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted">AVERAGE CLASS SCORE</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>84.2%</div>
            </div>
          </div>
        </div>
      )}

      {/* Role View 4: Admin */}
      {activeRole === 'Admin' && (
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: 'var(--dark-bg)', color: '#fff' }}>
          <h2 className="font-display text-red" style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1.5rem' }}>
            PLATFORM & AI MODEL MONITORING
          </h2>
          <div className="font-mono" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
            <div>
              <div className="text-muted">TOTAL USERS</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>1,420</div>
            </div>
            <div>
              <div className="text-muted">AI AGENTS</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>8 ACTIVE</div>
            </div>
            <div>
              <div className="text-muted">LATENCY</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>142 ms</div>
            </div>
            <div>
              <div className="text-muted">UPTIME</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>99.98%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
