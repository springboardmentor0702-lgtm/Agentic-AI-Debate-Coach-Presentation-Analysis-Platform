"use client";

import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('logos_ai_jwt');
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1]));
    setUserId(payload.user_id);
    const activeId = Number(localStorage.getItem('logos_ai_active_session_id'));
    if (activeId > 0) setSessionId(activeId);
    fetch(apiUrl('/api/v1/sessions/user/me'), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : [])
      .then((sessions) => { if (!activeId && sessions[0]?.id) setSessionId(sessions[0].id); })
      .catch(() => {});
  }, []);

  const handleDownloadPDF = () => {
    if (sessionId) window.open(apiUrl(`/api/v1/reports/export/pdf/${sessionId}`), '_blank');
  };

  const handleDownloadExcel = () => {
    if (sessionId) window.open(apiUrl(`/api/v1/reports/export/excel/${sessionId}`), '_blank');
  };

  const handleDownloadCoachingPDF = () => {
    if (userId) window.open(apiUrl(`/api/v1/reports/export/coaching/pdf/${userId}`), '_blank');
  };

  return (
    <div className="section-container">
      <div className="badge-red-pill">EXPORT & COMPLIANCE ENGINE</div>
      <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem' }}>
        REPORTS & CERTIFICATES
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '700px' }}>
        Download verified performance scorecards, argument logic audit logs, and official debate improvement certificates in CSV / PDF / Excel formats.
      </p>
      {!sessionId && <p style={{ color: 'var(--accent-red)', marginTop: '-2rem', marginBottom: '2rem' }}>Run a debate or presentation analysis before exporting a session report.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        
        {/* Report Card 1: Debate & Presentation PDF */}
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
          <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>DEBATE & SPEECH ANALYSIS REPORT</div>
          <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem' }}>
            ASSESSMENT PDF REPORT
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Comprehensive analysis of your debate arguments, prosody metrics (WPM, filler word density), and rhetorical scores.
          </p>
          <button onClick={handleDownloadPDF} disabled={!sessionId || downloading} className="btn btn-red" style={{ width: '100%' }}>
            DOWNLOAD ASSESSMENT PDF
          </button>
        </div>

        {/* Report Card 2: Excel / CSV Metric Scores */}
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
          <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>5-WEIGHTED PERFORMANCE MATRIX</div>
          <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem' }}>
            EXCEL & CSV METRIC EXPORT
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Excel-compatible grid mapping your exact performance metrics (Argument Quality, Evidence, Logic, Rebuttal, Comms).
          </p>
          <button onClick={handleDownloadExcel} disabled={!sessionId || downloading} className="btn btn-dark" style={{ width: '100%' }}>
            EXPORT EXCEL / CSV DATA
          </button>
        </div>

        {/* Report Card 3: Coaching & Learning Progress */}
        <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
          <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>COACHING & LEARNING PROGRESS</div>
          <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1rem' }}>
            COACHING & PLANS (PDF)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Personalized learning path, skill milestones, and custom recommendations compiled dynamically from your history.
          </p>
          <button onClick={handleDownloadCoachingPDF} disabled={!userId || downloading} className="btn btn-dark" style={{ width: '100%' }}>
            EXPORT COACHING PLAN (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
