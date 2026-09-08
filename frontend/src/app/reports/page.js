"use client";

import { useEffect, useState } from 'react';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('logos_ai_jwt');
    if (!token) return;
    setToken(token);
    fetch('http://localhost:8000/api/v1/sessions/mine', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        setSessions(data);
        const latestSession = data[0];
        if (latestSession) {
          setSessionId(latestSession.id);
          return fetch(`http://localhost:8000/api/v1/reports/export/summary/${latestSession.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
        return null;
      })
      .then((res) => res && res.ok ? res.json() : null)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const handleDownloadCSV = () => {
    handleDownload('csv');
  };

  const handleDownload = async (format) => {
    if (!sessionId) return;
    setDownloading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/reports/export/${format}/${sessionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Report download failed.');
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `logos-ai-session-${sessionId}.${format === 'certificate' ? 'html' : format}`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleSessionChange = (event) => {
    const nextSessionId = Number(event.target.value);
    setSessionId(nextSessionId);
    fetch(`http://localhost:8000/api/v1/reports/export/summary/${nextSessionId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.ok ? res.json() : null)
      .then(setSummary)
      .catch(() => setSummary(null));
  };

  return (
    <div className="section-container">
      <div className="badge-red-pill">EXPORT & COMPLIANCE ENGINE</div>
      <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem' }}>
        REPORTS & CERTIFICATES
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '700px' }}>
        Download verified performance scorecards, argument logic audit logs, and official debate improvement certificates in CSV / PDF formats.
      </p>

      {sessions.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <label className="font-mono" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem' }}>REPORT SESSION</label>
          <select value={sessionId || ''} onChange={handleSessionChange} style={{ width: '100%', maxWidth: '620px', padding: '0.75rem', border: '1px solid var(--border-light)', background: '#fff' }}>
            {sessions.map((session) => <option key={session.id} value={session.id}>{session.title} - {session.format}</option>)}
          </select>
        </div>
      )}

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1.25rem', background: '#111827', color: '#fff' }}><div className="font-mono" style={{ fontSize: '0.7rem', color: '#CBD5E1' }}>WEIGHTED SCORE</div><strong className="font-display" style={{ display: 'block', fontSize: '2rem', color: '#FCA5A5' }}>{summary.weighted_performance_score}/100</strong></div>
          <div style={{ padding: '1.25rem', background: '#fff', border: '1px solid var(--border-light)' }}><div className="font-mono text-muted" style={{ fontSize: '0.7rem' }}>SPEECH PACE</div><strong className="font-display" style={{ display: 'block', fontSize: '2rem' }}>{summary.speech_pace}</strong></div>
          <div style={{ padding: '1.25rem', background: '#fff', border: '1px solid var(--border-light)' }}><div className="font-mono text-muted" style={{ fontSize: '0.7rem' }}>FILLER WORDS</div><strong className="font-display" style={{ display: 'block', fontSize: '2rem', color: 'var(--accent-red)' }}>{summary.filler_words_count}</strong></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        {/* Report Card 1 */}
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
          <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>SESSION PERFORMANCE SCORECARD</div>
          <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem' }}>
            5-WEIGHTED METRIC EXPORT
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Includes 30% Arg Quality, 20% Evidence, 20% Consistency, 15% Rebuttal, 15% Communication breakdowns.
          </p>
          <button onClick={handleDownloadCSV} className="btn btn-dark" style={{ width: '100%' }}>
            EXPORT CSV DATA
          </button>
          <button onClick={() => handleDownload('xlsx')} className="btn btn-login" style={{ width: '100%', marginTop: '0.6rem' }} disabled={downloading}>
            EXPORT EXCEL
          </button>
        </div>

        {/* Report Card 2 */}
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
          <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>LOGIC AUDIT LOG</div>
          <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem' }}>
            FALLACY & REBUTTAL AUDIT
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Exhaustive turn-by-turn analysis of fallacies detected, corrections applied, and counterargument options.
          </p>
          <button onClick={handleDownloadCSV} className="btn btn-dark" style={{ width: '100%' }}>
            EXPORT AUDIT REPORT
          </button>
          <button onClick={() => handleDownload('pdf')} className="btn btn-login" style={{ width: '100%', marginTop: '0.6rem' }} disabled={downloading}>
            EXPORT PDF REPORT
          </button>
        </div>

        {/* Report Card 3 */}
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
          <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>VERIFIED CERTIFICATE</div>
          <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem' }}>
            RHETORICAL MASTERY CERTIFICATE
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Official certificate confirming completion of Level 4 Parliamentary Debate & Prosody Training.
          </p>
          <button onClick={() => handleDownload('certificate')} className="btn btn-red" style={{ width: '100%' }} disabled={!sessionId || downloading}>
            GENERATE CERTIFICATE
          </button>
        </div>
      </div>
    </div>
  );
}
