import Link from 'next/link';
import styles from './page.module.css';
import { Sparkles, MessageSquare, ShieldAlert, Mic } from 'lucide-react';

export default function Home() {
  return (
    <div className={`animate-fade-in ${styles.dashboard}`}>
      <header className={styles.hero}>
        <div className={styles.heroGlow}></div>
        <div className={styles.heroBadge}>✦ AI-Powered Debate Coach</div>
        <h1>Speak. Debate.<br />Dominate.</h1>
        <p>
          SpeakAZ is your personal AI debate coach. Practice live debates against an intelligent opponent,
          detect logical fallacies in real-time, and get personalized coaching to master the art of persuasion.
        </p>
      </header>

      <div className={styles.grid}>
        <Link href="/debate" className={`glass-panel ${styles.card}`}>
          <div className={styles.cardIcon} style={{ color: 'var(--accent-primary)' }}>
            <MessageSquare size={32} />
          </div>
          <h3>Debate Arena</h3>
          <p>Enter a multi-turn live debate against our AI opponent. Choose your difficulty, stance, and format.</p>
          <span className={styles.cardAction}>Enter Arena &rarr;</span>
        </Link>

        <Link href="/analysis" className={`glass-panel ${styles.card}`}>
          <div className={styles.cardIcon} style={{ color: 'var(--accent-secondary)' }}>
            <ShieldAlert size={32} />
          </div>
          <h3>Argument Analysis</h3>
          <p>Paste any speech or argument to instantly detect logical fallacies and score its structural strength.</p>
          <span className={styles.cardAction}>Analyze Text &rarr;</span>
        </Link>

        <Link href="/presentation" className={`glass-panel ${styles.card}`}>
          <div className={styles.cardIcon} style={{ color: 'var(--success-color)' }}>
            <Mic size={32} />
          </div>
          <h3>Speech Analytics</h3>
          <p>Measure your speech pace (WPM), filler word density, confidence scoring, and prosody analytics.</p>
          <span className={styles.cardAction}>Analyze Speech &rarr;</span>
        </Link>
      </div>
    </div>
  );
}
