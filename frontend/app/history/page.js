'use client';

import { useState, useEffect } from 'react';
import { History as HistoryIcon, Loader2 } from 'lucide-react';
import { getSessions } from '../../lib/api';
import styles from './page.module.css';
import Link from 'next/link';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        setError(err.message || 'Failed to load session history.');
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div className={styles.iconWrapper}>
          <HistoryIcon size={32} color="var(--accent-primary)" />
        </div>
        <div>
          <h1>Session History</h1>
          <p>Review your past debates and track your progress over time.</p>
        </div>
      </header>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spin} />
            <p>Loading history...</p>
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : sessions.length === 0 ? (
          <div className={`glass-panel ${styles.emptyState}`}>
            <p>You haven't participated in any debates yet.</p>
            <Link href="/debate" className="btn btn-primary">Start a Debate</Link>
          </div>
        ) : (
          <div className={styles.sessionList}>
            {sessions.map(session => (
              <div key={session.id} className={`glass-panel ${styles.sessionCard}`}>
                <div className={styles.sessionHeader}>
                  <h3>{session.topic}</h3>
                  <span className={`badge ${session.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {session.status}
                  </span>
                </div>
                <div className={styles.sessionMeta}>
                  <span><strong>Opponent Stance:</strong> {session.opponent_stance}</span>
                  <span><strong>Difficulty:</strong> <span className={styles.capitalize}>{session.difficulty}</span></span>
                  <span><strong>Date:</strong> {new Date(session.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
