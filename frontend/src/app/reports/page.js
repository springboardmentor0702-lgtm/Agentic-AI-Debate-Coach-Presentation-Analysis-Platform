"use client";

import { useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false);

  const download = async (path, filename) => {
    setDownloading(true);
    try {
      const response = await apiFetch(path);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = () => {
    const sessionId = localStorage.getItem('logos_ai_session_id');
    if (sessionId) download(`/reports/export/pdf/${sessionId}`, `logos_ai_session_${sessionId}.pdf`);
  };

  const handleDownloadExcel = () => {
    const sessionId = localStorage.getItem('logos_ai_session_id');
    if (sessionId) download(`/reports/export/excel/${sessionId}`, `logos_ai_session_${sessionId}.csv`);
  };

  const handleDownloadCoachingPDF = () => {
    const userId = localStorage.getItem('logos_ai_user_id');
    if (userId) download(`/reports/export/coaching/pdf/${userId}`, `logos_ai_coaching_${userId}.pdf`);
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
          <button onClick={handleDownloadPDF} className="btn btn-red" style={{ width: '100%' }}>
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
          <button onClick={handleDownloadExcel} className="btn btn-dark" style={{ width: '100%' }}>
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
          <button onClick={handleDownloadCoachingPDF} className="btn btn-dark" style={{ width: '100%' }}>
            EXPORT COACHING PLAN (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
