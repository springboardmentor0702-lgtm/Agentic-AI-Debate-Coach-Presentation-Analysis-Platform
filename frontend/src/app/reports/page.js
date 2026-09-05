"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthModal from '../../components/AuthModal';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(null); // 'pdf', 'excel', 'coaching', 'roster_pdf', 'roster_excel'
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userRole, setUserRole] = useState('Learner');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('latest');
  const [statusMsg, setStatusMsg] = useState(null);

  const getToken = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('logos_ai_jwt') : null;
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role || 'Learner');
      setUserEmail(payload.sub || '');
      setUserName(payload.sub ? payload.sub.split('@')[0] : 'User');
      
      fetchUserSessions(token);
    } catch (e) {
      console.error("Token decoding error:", e);
    }
  }, []);

  const fetchUserSessions = async (token) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/sessions/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data);
          setSelectedSessionId(String(data[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to load user sessions:", err);
    }
  };

  const triggerBlobDownload = async (url, defaultFilename, downloadType) => {
    const token = getToken();
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }

    setDownloading(downloadType);
    setStatusMsg(null);

    try {
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = defaultFilename;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setStatusMsg({ type: 'success', text: `Successfully generated and downloaded: ${filename}` });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err) {
      console.error("Download failed:", err);
      setStatusMsg({ type: 'error', text: `Export failed: ${err.message}. Please check connection to API backend.` });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAssessmentPDF = () => {
    const sid = selectedSessionId || 'latest';
    triggerBlobDownload(
      `http://localhost:8000/api/v1/reports/export/pdf/${sid}`,
      `LogosAI_Assessment_Report.pdf`,
      'pdf'
    );
  };

  const handleDownloadExcel = () => {
    const sid = selectedSessionId || 'latest';
    triggerBlobDownload(
      `http://localhost:8000/api/v1/reports/export/excel/${sid}`,
      `LogosAI_Metric_Scorecard.csv`,
      'excel'
    );
  };

  const handleDownloadCoachingPDF = () => {
    triggerBlobDownload(
      `http://localhost:8000/api/v1/reports/export/coaching/pdf/me`,
      `LogosAI_Coaching_Plan.pdf`,
      'coaching'
    );
  };

  const handleDownloadRosterPDF = () => {
    triggerBlobDownload(
      `http://localhost:8000/api/v1/reports/export/coach/roster/pdf`,
      `LogosAI_Classroom_Roster_Audit.pdf`,
      'roster_pdf'
    );
  };

  const handleDownloadRosterExcel = () => {
    triggerBlobDownload(
      `http://localhost:8000/api/v1/reports/export/coach/roster/excel`,
      `LogosAI_Classroom_Roster.csv`,
      'roster_excel'
    );
  };

  const roleStr = (userRole || 'Learner').trim().toLowerCase();
  const isCoachOrEducator = roleStr.includes('coach') || roleStr.includes('educator') || roleStr.includes('teacher') || roleStr.includes('admin');

  return (
    <>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onAuthSuccess={() => {
          setIsAuthModalOpen(false);
          const t = getToken();
          if (t) fetchUserSessions(t);
        }}
      />

      <div className="section-container" style={{ paddingTop: '2.5rem', fontFamily: "'Inter', sans-serif" }}>
        
        {/* Header navigation bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'inline-block', background: '#FEE2E2', color: '#D90429', fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            EXPORT & COMPLIANCE ENGINE // ROLE: {userRole.toUpperCase()}
          </div>
          <Link href="/dashboard" style={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            ← BACK TO DASHBOARD
          </Link>
        </div>

        <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: '1.1', marginBottom: '0.5rem' }}>
          Reports & Performance Certificates
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '800px', fontSize: '0.95rem', lineHeight: '1.5' }}>
          Export certified performance scorecards, speech prosody audits, dynamic coaching plans, and official cohort audit reports in standard PDF and CSV formats with 100% authentic database integrity.
        </p>

        {/* Status Notification Toast */}
        {statusMsg && (
          <div style={{
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: statusMsg.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            color: statusMsg.type === 'error' ? '#DC2626' : '#059669',
            border: `1px solid ${statusMsg.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>✕</button>
          </div>
        )}

        {/* Interactive Session Selector Box */}
        <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '1.5rem 2rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
              TARGET PRACTICE SESSION FOR EXPORT
            </label>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
              Choose a specific debate or speech recording from your database history to generate report:
            </p>
          </div>
          <div style={{ minWidth: '320px', flex: 1 }}>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #111827', background: '#F9FAFB', fontSize: '0.88rem', fontWeight: 600, color: '#111827', outline: 'none' }}
            >
              <option value="latest">Latest Completed Practice Session (Recommended)</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} • {s.topic ? (s.topic.length > 50 ? s.topic.slice(0, 50) + '...' : s.topic) : s.title} ({s.format}) - {s.score}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Primary Report Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2.5rem' }}>
          
          {/* Report Card 1: Debate & Presentation PDF */}
          <div style={{ border: '1px solid #E5E7EB', padding: '2.2rem', background: '#fff', borderRadius: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="font-mono text-red" style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>DEBATE & SPEECH ANALYSIS REPORT</div>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
                ASSESSMENT PDF REPORT
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Official PDF certificate featuring your 5-weighted performance scores, acoustic speech cadence (WPM, filler word density), and simulation fallacy audit logs.
              </p>
            </div>
            <button 
              onClick={handleDownloadAssessmentPDF} 
              disabled={downloading === 'pdf'}
              className="btn btn-red" 
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', fontWeight: 700 }}
            >
              {downloading === 'pdf' ? 'GENERATING PDF REPORT...' : 'DOWNLOAD ASSESSMENT (PDF)'}
            </button>
          </div>

          {/* Report Card 2: Excel / CSV Metric Scores */}
          <div style={{ border: '1px solid #E5E7EB', padding: '2.2rem', background: '#fff', borderRadius: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="font-mono text-red" style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>5-WEIGHTED PERFORMANCE MATRIX</div>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
                EXCEL & CSV METRIC EXPORT
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Excel-ready dataset mapping your Argument Quality, Evidence, Logical Consistency, Rebuttal Effectiveness, and Speech Metrics.
              </p>
            </div>
            <button 
              onClick={handleDownloadExcel} 
              disabled={downloading === 'excel'}
              className="btn btn-dark" 
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', fontWeight: 700 }}
            >
              {downloading === 'excel' ? 'EXPORTING CSV DATA...' : 'EXPORT EXCEL / CSV DATA'}
            </button>
          </div>

          {/* Report Card 3: Coaching & Learning Progress */}
          <div style={{ border: '1px solid #E5E7EB', padding: '2.2rem', background: '#fff', borderRadius: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="font-mono text-red" style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>COACHING & LEARNING PROGRESS</div>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
                COACHING & PLANS (PDF)
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Comprehensive coaching plan PDF detailing your rhetorical skill gap analysis, personalized practice drills, dynamic learning milestones, and coach directives.
              </p>
            </div>
            <button 
              onClick={handleDownloadCoachingPDF} 
              disabled={downloading === 'coaching'}
              className="btn btn-dark" 
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', fontWeight: 700 }}
            >
              {downloading === 'coaching' ? 'GENERATING COACHING PLAN...' : 'EXPORT COACHING PLAN (PDF)'}
            </button>
          </div>
        </div>

        {/* Executive Coach & Educator Section (Available for Coaches, Educators, and Admins) */}
        {isCoachOrEducator && (
          <div style={{ background: '#111827', color: '#FFF', padding: '2.5rem 2rem', marginBottom: '2.5rem', border: '1px solid #374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                  INSTRUCTOR & COACHING PORTAL AUDIT
                </div>
                <h3 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                  Classroom Cohort & Student Roster Audit
                </h3>
                <p style={{ color: '#ccc', fontSize: '0.88rem', marginTop: '0.4rem', maxWidth: '650px' }}>
                  Generate an executive report summarizing all enrolled students, their active debate topics, letter grades (A+, A, B+, etc.), session counts, and class pain points.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleDownloadRosterPDF}
                  disabled={downloading === 'roster_pdf'}
                  className="btn btn-red"
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.825rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  {downloading === 'roster_pdf' ? 'GENERATING ROSTER PDF...' : 'DOWNLOAD ROSTER (PDF)'}
                </button>
                <button
                  onClick={handleDownloadRosterExcel}
                  disabled={downloading === 'roster_excel'}
                  className="btn btn-login"
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.825rem', cursor: 'pointer', background: '#FFF', color: '#111827', fontWeight: 700 }}
                >
                  {downloading === 'roster_excel' ? 'EXPORTING ROSTER CSV...' : 'EXPORT ROSTER (CSV)'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
