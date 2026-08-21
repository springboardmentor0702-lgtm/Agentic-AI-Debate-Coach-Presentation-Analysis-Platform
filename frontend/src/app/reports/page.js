"use client";

import { useState } from 'react';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCSV = () => {
    window.open("http://localhost:8000/api/v1/reports/export/csv/1", "_blank");
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
          <button onClick={() => alert("Certificate CERT-LOGOS-1-2026 issued & downloaded!")} className="btn btn-red" style={{ width: '100%' }}>
            GENERATE CERTIFICATE
          </button>
        </div>
      </div>
    </div>
  );
}
