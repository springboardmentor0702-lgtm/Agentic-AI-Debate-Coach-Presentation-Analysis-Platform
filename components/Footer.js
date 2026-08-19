import { Github, Twitter, Linkedin, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-light)', padding: '4rem 3rem 2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem', paddingBottom: '3rem', borderBottom: '1px solid var(--border-light)' }}>
        
        {/* Brand Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--accent-red)' }}>LOGOS</span>.AI
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: '280px' }}>
            The world's first agentic AI platform for high-stakes rhetoric. Detect fallacies in real-time. Simulate world-class opponents. Master the podium.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <a href="#" style={{ color: 'var(--text-muted)', transition: 'color var(--transition-fast)' }}><Twitter size={20} /></a>
            <a href="#" style={{ color: 'var(--text-muted)', transition: 'color var(--transition-fast)' }}><Github size={20} /></a>
            <a href="#" style={{ color: 'var(--text-muted)', transition: 'color var(--transition-fast)' }}><Linkedin size={20} /></a>
          </div>
        </div>

        {/* Links Column 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Platform</h4>
          <Link href="/simulation" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color var(--transition-fast)' }}>Debate Simulation</Link>
          <Link href="/presentation" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color var(--transition-fast)' }}>Vocal Metrics Analysis</Link>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color var(--transition-fast)' }}>Coach Dashboard</Link>
          <Link href="/reports" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color var(--transition-fast)' }}>Learner Reports</Link>
        </div>

        {/* Links Column 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Resources</h4>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color var(--transition-fast)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={14} /> API Documentation
          </a>
          <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color var(--transition-fast)' }}>Fallacy Database</a>
          <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color var(--transition-fast)' }}>System Status</a>
        </div>

        {/* Newsletter Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Join the Beta</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Get early access to new AI personas and logic audit rules.</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              style={{ background: 'var(--dark-bg)', border: '1px solid var(--dark-border)', padding: '0.6rem 1rem', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
            />
            <button className="btn btn-red" style={{ padding: '0.6rem 1rem', minWidth: 'fit-content' }}>Subscribe</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          © 2026 RHETORICAL INTELLIGENCE SYSTEMS. ALL RIGHTS RESERVED.
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '8px', height: '8px', background: 'var(--accent-green)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px var(--accent-green)' }}></span>
          SYSTEM_STATUS: 100% OPERATIONAL
        </div>
      </div>
    </footer>
  );
}
