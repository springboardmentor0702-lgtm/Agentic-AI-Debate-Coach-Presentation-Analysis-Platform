import './globals.css';
import styles from './layout.module.css';
import Link from 'next/link';
import { Home, MessageSquare, ShieldAlert, History, Mic } from 'lucide-react';

export const metadata = {
  title: 'SpeakAZ | AI Debate Coach',
  description: 'AI-powered debate coaching and presentation analysis — practice, improve, dominate.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className={styles.appContainer}>
          {/* Sidebar Navigation */}
          <aside className={styles.sidebar}>
            <div className={styles.logo}>
              <span className={styles.logoMark}>S</span>
              <h2>SpeakAZ</h2>
            </div>

            <nav className={styles.nav}>
              <Link href="/" className={styles.navLink}>
                <Home size={20} />
                <span>Dashboard</span>
              </Link>
              <Link href="/debate" className={styles.navLink}>
                <MessageSquare size={20} />
                <span>Debate Arena</span>
              </Link>
              <Link href="/analysis" className={styles.navLink}>
                <ShieldAlert size={20} />
                <span>Argument Analysis</span>
              </Link>
              <Link href="/presentation" className={styles.navLink}>
                <Mic size={20} />
                <span>Speech Analytics</span>
              </Link>
              <Link href="/history" className={styles.navLink}>
                <History size={20} />
                <span>History</span>
              </Link>
            </nav>

            <div className={styles.sidebarFooter}>
              <p>SpeakAZ v1.0.0</p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className={styles.mainContent}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
