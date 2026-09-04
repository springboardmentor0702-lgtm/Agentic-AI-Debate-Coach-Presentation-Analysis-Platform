"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  ['Simulation', '/simulation'],
  ['Argument Lab', '/analyze'],
  ['Vocal Metrics', '/presentation'],
  ['Analytics', '/dashboard'],
  ['Reports', '/reports'],
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span>LOGOS</span><b>.AI</b>
      </Link>
      <nav className="main-nav" aria-label="Primary navigation">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className={pathname === href ? 'active' : ''}>{label}</Link>
        ))}
      </nav>
      <Link href="/simulation" className="header-cta">Start practice <span>↗</span></Link>
    </header>
  );
}