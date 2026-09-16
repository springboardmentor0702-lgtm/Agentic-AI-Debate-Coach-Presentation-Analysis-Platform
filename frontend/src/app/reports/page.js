"use client";

import { useState } from 'react';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(null);

  const triggerDownload = (url, filename) => {
    setDownloading(filename);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(null), 1500);
  };

  const reports = [
    {
      id: "debate",
      tag: "MODULE 13.1 • DEBATE REPORT",
      title: "DEBATE ANALYSIS REPORT",
      desc: "Complete transcripts, argument clarity scores, evidence strength, logical fallacy audit flags, and opponent rebuttal dynamics.",
      pdfUrl: "/api/v1/reports/export/pdf/1",
      excelUrl: "/api/v1/reports/export/excel/1?type=debate",
      pdfName: "logos-ai-debate-report.pdf",
      excelName: "logos-ai-debate-report.csv"
    },
    {
      id: "presentation",
      tag: "MODULE 13.2 • SPEECH PROSODY",
      title: "PRESENTATION ANALYSIS REPORT",
      desc: "Vocal pace (WPM), pause rate, filler word density breakdowns, clarity ratings, confidence indexes, and delivery coaching.",
      pdfUrl: "/api/v1/reports/export/presentation/pdf/1",
      excelUrl: "/api/v1/reports/export/excel/1?type=presentation",
      pdfName: "logos-ai-presentation-report.pdf",
      excelName: "logos-ai-presentation-report.csv"
    },
    {
      id: "performance",
      tag: "MODULE 13.3 • 5-WEIGHTED MODEL",
      title: "PERFORMANCE SCORECARD",
      desc: "Full breakdown of the weighted scoring model: Argument (30%), Evidence (20%), Logic (20%), Rebuttal (15%), and Communication (15%).",
      pdfUrl: "/api/v1/reports/export/pdf/1",
      excelUrl: "/api/v1/reports/export/excel/1?type=performance",
      pdfName: "logos-ai-performance-scores.pdf",
      excelName: "logos-ai-performance-scores.csv"
    },
    {
      id: "coaching",
      tag: "MODULE 13.4 • COACHING INSIGHTS",
      title: "COACHING & ACTION PLAN",
      desc: "Customized strengths and weaknesses inventory, active drill prescriptions, tactical recommendations, and instructor feedback logs.",
      pdfUrl: "/api/v1/reports/export/coaching/pdf/1",
      excelUrl: "/api/v1/reports/export/excel/1?type=coaching",
      pdfName: "logos-ai-coaching-plan.pdf",
      excelName: "logos-ai-coaching-plan.csv"
    },
    {
      id: "progress",
      tag: "MODULE 13.5 • SKILL MILESTONES",
      title: "LEARNING PROGRESS REPORT",
      desc: "Longitudinal progression across all 8 rhetorical skill dimensions, completed session history, and competency mastery trajectories.",
      pdfUrl: "/api/v1/reports/export/pdf/1",
      excelUrl: "/api/v1/reports/export/excel/1?type=progress",
      pdfName: "logos-ai-learning-progress.pdf",
      excelName: "logos-ai-learning-progress.csv"
    }
  ];

  return (
    <div className="section-container">
      <div className="badge-red-pill">EXPORT & COMPLIANCE ENGINE</div>
      <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem' }}>
        REPORTS & DATA EXPORT
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '750px' }}>
        Export verified performance scorecards, audio prosody logs, argument reasoning audits, and personalized coaching learning plans in official PDF and Excel (CSV) formats.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        {reports.map((rep) => (
          <div key={rep.id} style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>{rep.tag}</div>
              <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '1rem' }}>
                {rep.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                {rep.desc}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={() => triggerDownload(rep.pdfUrl, rep.pdfName)}
                className="btn btn-red"
                style={{ width: '100%', fontSize: '0.75rem', padding: '0.6rem 0.5rem', textAlign: 'center' }}
                disabled={downloading === rep.pdfName}
              >
                {downloading === rep.pdfName ? "DOWNLOADING..." : "DOWNLOAD PDF"}
              </button>
              <button
                onClick={() => triggerDownload(rep.excelUrl, rep.excelName)}
                className="btn btn-dark"
                style={{ width: '100%', fontSize: '0.75rem', padding: '0.6rem 0.5rem', textAlign: 'center' }}
                disabled={downloading === rep.excelName}
              >
                {downloading === rep.excelName ? "EXPORTING..." : "EXPORT EXCEL"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

