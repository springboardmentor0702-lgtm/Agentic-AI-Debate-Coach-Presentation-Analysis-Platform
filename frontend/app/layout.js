import './globals.css';
import styles from './layout.module.css';
import Link from 'next/link';
import { Home, MessageSquare, ShieldAlert, History } from 'lucide-react';

export const metadata = {
  title: 'LOGOS.AI | Debate Coach',
  description: 'AI-powered debate coach and presentation analysis platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className={styles.appContainer}>
          {/* Sidebar Navigation */}
          <aside className={styles.sidebar}>
            <div className={styles.logo}>
              <span className={styles.logoMark}>∆</span>
              <h2>LOGOS.AI</h2>
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
              <Link href="/history" className={styles.navLink}>
                <History size={20} />
                <span>History</span>
              </Link>
            </nav>
            
            <div className={styles.sidebarFooter}>
              <p>v4.0.0 Alpha</p>
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
