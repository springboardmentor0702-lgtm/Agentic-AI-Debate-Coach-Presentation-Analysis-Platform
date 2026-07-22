"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <Link href="/" className="brand-logo">
        LOGOS.AI
      </Link>

      <div className="nav-links">
        <Link href="/#engines" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
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
        <Link href="/reports" className={`nav-link ${pathname === '/reports' ? 'active' : ''}`}>
          REPORTS
        </Link>
        <Link href="/auth" className={`nav-link ${pathname === '/auth' ? 'active' : ''}`}>
          AUTH_RBAC
        </Link>
      </div>

      <div className="nav-actions">
        <Link href="/auth" className="btn btn-login">
          SYSTEM_LOGIN
        </Link>
        <Link href="/simulation" className="btn btn-red">
          DEPLOY_AGENT
        </Link>
      </div>
    </nav>
  );
}
