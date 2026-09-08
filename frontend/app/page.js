import Link from 'next/link';
import styles from './page.module.css';
import { Sparkles, MessageSquare, ShieldAlert, Mic } from 'lucide-react';

export default function Home() {
  return (
    <div className={`animate-fade-in ${styles.dashboard}`}>
      <header className={styles.hero}>
        <div className={styles.heroGlow}></div>
        <h1>Elevate Your Argument.</h1>
        <p>
          LOGOS.AI is your personal AI debate coach. Analyze your rhetoric, simulate live debates, and get personalized coaching to master the art of persuasion.
        </p>
      </header>

      <div className={styles.grid}>
        <Link href="/debate" className={`glass-panel ${styles.card}`}>
          <div className={styles.cardIcon} style={{ color: 'var(--accent-primary)' }}>
            <MessageSquare size={32} />
          </div>
          <h3>Debate Arena</h3>
          <p>Enter a multi-turn debate simulation against our advanced AI opponent. Select your difficulty and stance.</p>
          <span className={styles.cardAction}>Start Debating &rarr;</span>
        </Link>

        <Link href="/analysis" className={`glass-panel ${styles.card}`}>
          <div className={styles.cardIcon} style={{ color: 'var(--accent-secondary)' }}>
            <ShieldAlert size={32} />
          </div>
          <h3>Argument Analysis</h3>
          <p>Paste a speech or argument to instantly detect logical fallacies and evaluate its structural strength.</p>
          <span className={styles.cardAction}>Analyze Text &rarr;</span>
        </Link>

        <Link href="/presentation" className={`glass-panel ${styles.card}`}>
          <div className={styles.cardIcon} style={{ color: 'var(--success-color)' }}>
            <Mic size={32} />
          </div>
          <h3>Presentation Analytics</h3>
          <p>Evaluate speech pace (WPM), filler word density, confidence scoring, and prosody analytics.</p>
          <span className={styles.cardAction}>Analyze Speech &rarr;</span>
        </Link>
      </div>
    </div>
  );
}
