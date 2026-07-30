"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 3rem', background: '#fff', borderBottom: '1px solid #e5e5eb' }}>
      <Link href="/" className="brand-logo" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', fontWeight: 900, color: '#000' }}>
        LOGOS.AI
      </Link>

      {/* Nav Links with Deploy Agent placed next to Reports */}
      <div className="nav-links" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <Link href="/#engines" className="nav-link">
          ENGINES
        </Link>
        <Link href="/simulation" className={`nav-link ${pathname === '/simulation' ? 'active' : ''}`}>
          SIMULATION
        </Link>
        <Link href="/presentation" className={`nav-link ${pathname === '/presentation' ? 'active' : ''}`}>
          VOCAL_METRICS
        </Link>
        <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
          ANALYTICS
        </Link>
        <Link href="/debates" className={`nav-link ${pathname.startsWith('/debates') ? 'active' : ''}`}>
          DEBATES
        </Link>
        <Link href="/reports" className={`nav-link ${pathname === '/reports' ? 'active' : ''}`}>
          REPORTS
        </Link>
        
        {/* Deploy Agent placed in nav list next to Reports */}
        <Link href="/simulation" className="btn btn-red" style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', borderRadius: '4px' }}>
          DEPLOY_AGENT
        </Link>
      </div>

      {/* Actions: Separate Login & Sign Up buttons */}
      <div className="nav-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link href="/login" className="btn btn-login" style={{ padding: '0.55rem 1.25rem', border: '1px solid #e5e5eb', borderRadius: '4px', background: 'transparent', color: '#000', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700 }}>
          Login
        </Link>
        <Link href="/signup" className="btn btn-dark" style={{ padding: '0.55rem 1.25rem', borderRadius: '4px', background: '#18181b', color: '#fff', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700 }}>
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
