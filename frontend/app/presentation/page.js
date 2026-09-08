'use client';

import { useState } from 'react';
import { Mic, Activity, Zap, CheckCircle2, RefreshCw } from 'lucide-react';
import styles from './page.module.css';

export default function PresentationPage() {
  const [speechText, setSpeechText] = useState('');
  const [duration, setDuration] = useState(60); // seconds
  const [metrics, setMetrics] = useState(null);

  const calculateMetrics = (e) => {
    e.preventDefault();
    if (!speechText.trim()) return;

    const words = speechText.trim().split(/\s+/);
    const wordCount = words.length;
    const minutes = duration / 60;
    const wpm = Math.round(wordCount / minutes);

    // Detect filler words
    const fillerWordsList = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'so', 'right'];
    const textLower = speechText.toLowerCase();
    let fillerCount = 0;
    const foundFillers = {};

    fillerWordsList.forEach(fw => {
      const regex = new RegExp(`\\b${fw}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        fillerCount += matches.length;
        foundFillers[fw] = matches.length;
      }
    });

    // Score calculations
    const idealWpmMin = 130;
    const idealWpmMax = 160;
    let paceRating = 'Optimal';
    if (wpm < idealWpmMin) paceRating = 'Too Slow';
    if (wpm > idealWpmMax) paceRating = 'Too Fast';

    const fillerDensity = Math.round((fillerCount / wordCount) * 100) || 0;
    const confidenceScore = Math.max(20, Math.min(98, 95 - (fillerDensity * 4)));
    const clarityScore = Math.max(30, Math.min(95, 90 - (wpm < 100 ? 15 : wpm > 180 ? 25 : 0) - (fillerDensity * 2)));

    setMetrics({
      wordCount,
      duration,
      wpm,
      paceRating,
      fillerCount,
      fillerDensity,
      foundFillers,
      confidenceScore,
      clarityScore
    });
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div className={styles.iconWrapper}>
          <Mic size={32} color="var(--accent-primary)" />
        </div>
        <div>
          <h1>Presentation & Vocal Analytics</h1>
          <p>Analyze speech pace (WPM), filler word density, confidence, and prosody.</p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Input Card */}
        <section className={`glass-panel ${styles.inputCard}`}>
          <form onSubmit={calculateMetrics}>
            <div className={styles.formGroup}>
              <label htmlFor="transcript">Speech Transcript / Presentation Text</label>
              <textarea
                id="transcript"
                className={`input textarea ${styles.textarea}`}
                placeholder="Paste your speech or presentation transcript here to evaluate vocal pace and filler words..."
                value={speechText}
                onChange={e => setSpeechText(e.target.value)}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="duration">Estimated Speaking Time (Seconds)</label>
                <input
                  type="number"
                  id="duration"
                  className="input"
                  min="10"
                  max="3600"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                <Activity size={18} /> Analyze Prosody
              </button>
            </div>
          </form>
        </section>

        {/* Analytics Display */}
        {metrics && (
          <section className={`animate-fade-in ${styles.resultsSection}`}>
            <div className={styles.metricsGrid}>
              <div className={`glass-panel ${styles.metricCard}`}>
                <div className={styles.metricHeader}>
                  <Zap size={20} color="var(--accent-primary)" />
                  <span>Speech Pace</span>
                </div>
                <div className={styles.metricVal}>{metrics.wpm} <span className={styles.unit}>WPM</span></div>
                <span className={`badge ${metrics.paceRating === 'Optimal' ? 'badge-success' : 'badge-warning'}`}>
                  {metrics.paceRating}
                </span>
              </div>

              <div className={`glass-panel ${styles.metricCard}`}>
                <div className={styles.metricHeader}>
                  <RefreshCw size={20} color="var(--warning-color)" />
                  <span>Filler Words</span>
                </div>
                <div className={styles.metricVal}>{metrics.fillerCount} <span className={styles.unit}>words</span></div>
                <span className="badge badge-warning">{metrics.fillerDensity}% Density</span>
              </div>

              <div className={`glass-panel ${styles.metricCard}`}>
                <div className={styles.metricHeader}>
                  <CheckCircle2 size={20} color="var(--success-color)" />
                  <span>Confidence Score</span>
                </div>
                <div className={styles.metricVal}>{metrics.confidenceScore}<span className={styles.unit}>/100</span></div>
                <span className="badge badge-success">High Poise</span>
              </div>
            </div>

            {/* Filler Words Breakdown */}
            <div className={`glass-panel ${styles.breakdownCard}`}>
              <h3>Filler Words Breakdown</h3>
              {Object.keys(metrics.foundFillers).length === 0 ? (
                <p className={styles.cleanText}>🎉 No filler words detected! Excellent speech control.</p>
              ) : (
                <div className={styles.tagGrid}>
                  {Object.entries(metrics.foundFillers).map(([word, count]) => (
                    <div key={word} className={styles.fillerTag}>
                      <span className={styles.word}>"{word}"</span>
                      <span className={styles.count}>{count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
