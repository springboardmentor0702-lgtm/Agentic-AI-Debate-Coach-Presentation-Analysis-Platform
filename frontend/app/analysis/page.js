'use client';

import { useState } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { fullAnalysis } from '../../lib/api';
import styles from './page.module.css';

export default function AnalysisPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fullAnalysis(text);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze argument.');
    } finally {
      setLoading(false);
    }
  };

  const arg = result?.argument_analysis;
  const fallacies = result?.fallacy_detection;

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div className={styles.iconWrapper}>
          <ShieldAlert size={32} color="var(--accent-secondary)" />
        </div>
        <div>
          <h1>Argument Analysis</h1>
          <p>Instantly detect logical fallacies and evaluate structural strength.</p>
        </div>
      </header>

      <div className={styles.content}>
        {/* Input Section */}
        <section className={`glass-panel ${styles.inputSection}`}>
          <form onSubmit={handleAnalyze}>
            <label htmlFor="argument">Your Argument or Speech:</label>
            <textarea 
              id="argument"
              className={`input textarea ${styles.textarea}`}
              placeholder="Paste the text you want to analyze here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={loading || !text.trim()}>
                {loading ? <><Loader2 size={18} className={styles.spin} /> Analyzing...</> : 'Analyze Text'}
              </button>
            </div>
          </form>
          {error && <div className={styles.error}>{error}</div>}
        </section>

        {/* Results Section */}
        {result && (
          <section className={`animate-fade-in ${styles.resultsSection}`}>
            
            {/* Argument Strength Scorecard */}
            <div className={`glass-panel ${styles.scorecard}`}>
              <h3>Argument Strength: <span className={styles.capitalize}>{arg.strength_label}</span></h3>
              <div className={styles.metricsGrid}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{arg.strength_score}/100</span>
                  <span className={styles.metricLabel}>Overall</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{arg.clarity_score}/100</span>
                  <span className={styles.metricLabel}>Clarity</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{arg.relevance_score}/100</span>
                  <span className={styles.metricLabel}>Relevance</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{arg.logical_consistency_score}/100</span>
                  <span className={styles.metricLabel}>Logic</span>
                </div>
              </div>
              
              <div className={styles.analysisDetails}>
                <div className={styles.detailBlock}>
                  <h4>Identified Claim</h4>
                  <p>{arg.claim}</p>
                </div>
                <div className={styles.detailBlock}>
                  <h4>AI Notes</h4>
                  <p>{arg.notes}</p>
                </div>
              </div>
            </div>

            {/* Fallacies Detected */}
            <div className={styles.fallaciesWrapper}>
              <h3>Logical Fallacies</h3>
              
              {fallacies.fallacies_found.length === 0 ? (
                <div className={`glass-panel ${styles.noFallacies}`}>
                  <CheckCircle size={32} color="var(--success-color)" />
                  <p>No clear logical fallacies detected! Solid reasoning.</p>
                </div>
              ) : (
                <div className={styles.fallacyList}>
                  {fallacies.fallacies_found.map((f, i) => (
                    <div key={i} className={`glass-panel ${styles.fallacyCard}`}>
                      <div className={styles.fallacyHeader}>
                        <AlertTriangle size={20} color="var(--danger-color)" />
                        <h4>{f.type}</h4>
                        <span className={`badge ${f.confidence > 80 ? 'badge-danger' : 'badge-warning'}`}>
                          {f.confidence}% Confidence
                        </span>
                      </div>
                      <blockquote className={styles.excerpt}>"{f.excerpt}"</blockquote>
                      <p className={styles.explanation}>{f.explanation}</p>
                      <div className={styles.suggestion}>
                        <strong>Suggestion:</strong> {f.correction_suggestion}
                      </div>
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
