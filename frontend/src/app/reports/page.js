'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearAuth, downloadReport, getStoredUser } from '../../lib/api';

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [certificate, setCertificate] = useState(null);
  const [certificateCode, setCertificateCode] = useState('');
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.access_token) {
      router.push('/login');
      return;
    }
    setUser(stored);
    apiFetch('/sessions/user/me')
      .then((items) => {
        const list = items || [];
        setSessions(list);
        setSelectedId(list[0]?.id ? String(list[0].id) : '');
      })
      .catch((err) => {
        if (err.status === 401) {
          clearAuth();
          router.push('/login');
          return;
        }
        setError(err.message || 'Unable to load sessions.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function downloadSessionReport(kind, path, filename) {
    if (!selectedId) {
      setError('Create or select a debate session first.');
      return;
    }
    setBusy(kind);
    setError('');
    try {
      await downloadReport(path.replace(':id', selectedId), filename.replace(':id', selectedId));
    } catch (err) {
      setError(err.message || 'Download failed.');
    } finally {
      setBusy('');
    }
  }

  async function downloadCoachingPlan() {
    if (!user?.user_id) return;
    setBusy('coaching');
    setError('');
    try {
      await downloadReport(`/reports/export/coaching/pdf/${user.user_id}`, `coaching-plan-${user.user_id}.pdf`);
    } catch (err) {
      setError(err.message || 'Coaching-plan download failed.');
    } finally {
      setBusy('');
    }
  }

  async function issueCertificate() {
    if (!selectedId) {
      setError('Select a completed, qualifying session first.');
      return;
    }
    setBusy('certificate');
    setError('');
    try {
      const result = await apiFetch(`/workflows/certificates/${selectedId}`, { method: 'POST' });
      setCertificate(result);
      setCertificateCode(result.certificate_id || '');
    } catch (err) {
      setError(err.message || 'Certificate issuance failed.');
    } finally {
      setBusy('');
    }
  }

  async function verifyCertificate(event) {
    event.preventDefault();
    if (!certificateCode.trim()) {
      setError('Enter a certificate ID to verify.');
      return;
    }
    setBusy('verify');
    setError('');
    setVerification(null);
    try {
      setVerification(await apiFetch(`/workflows/certificates/verify/${encodeURIComponent(certificateCode.trim())}`));
    } catch (err) {
      setError(err.message || 'Certificate verification failed.');
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="section-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <div className="badge-red-pill">
        <span className="badge-dot"></span> EXPORT & COMPLIANCE ENGINE
      </div>
      <h1 className="font-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
        Reports & Certificates
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '780px', fontSize: '0.92rem' }}>
        Export your achievements and performance data. Download structured PDF scorecards, Excel data workbooks, and verifiable LOGOS.AI certificates.
      </p>

      {error && (
        <div role="alert" style={{ color: '#991b1b', background: 'rgba(254, 242, 242, 0.9)', border: '1px solid #fecaca', borderRadius: '16px', padding: '0.9rem 1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Session Selector Glass Card */}
      <div className="glass-card" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>SELECT DEBATE SESSION</div>
          <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>Choose which session to export</div>
        </div>
        <select
          id="report-session"
          disabled={loading || sessions.length === 0}
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setCertificate(null);
          }}
          style={{ minWidth: '320px', flex: '1 1 300px' }}
        >
          <option value="">{loading ? 'Loading sessions…' : sessions.length ? 'Select a session' : 'No sessions available'}</option>
          {sessions.map((item) => (
            <option key={item.id} value={item.id}>
              #{item.id}: {item.title} [{item.status}]
            </option>
          ))}
        </select>
      </div>

      {/* Export Cards Grid matching mockup #06 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {/* PDF Report */}
        <article className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--ios-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '1rem' }}>
              📄
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              DEBATE & SPEECH ANALYSIS
            </div>
            <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Assessment Report
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Comprehensive PDF containing argument breakdown, fallacies, vocal prosody, and scoring rubrics.
            </p>
          </div>
          <button
            disabled={!selectedId || busy}
            onClick={() => downloadSessionReport('pdf', '/reports/export/pdf/:id', 'assessment-:id.pdf')}
            className="btn btn-red"
            style={{ width: '100%', cursor: 'pointer', padding: '0.8rem' }}
          >
            {busy === 'pdf' ? 'PREPARING PDF…' : '📥 Download PDF'}
          </button>
        </article>

        {/* Excel XLSX */}
        <article className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '1rem' }}>
              📊
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              PERFORMANCE MATRIX
            </div>
            <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Excel Workbook
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Raw quantitative scores across argument quality, evidence, consistency, and communication in `.xlsx`.
            </p>
          </div>
          <button
            disabled={!selectedId || busy}
            onClick={() => downloadSessionReport('excel', '/reports/export/excel/:id', 'assessment-:id.xlsx')}
            className="btn btn-login"
            style={{ width: '100%', cursor: 'pointer', padding: '0.8rem' }}
          >
            {busy === 'excel' ? 'PREPARING XLSX…' : '📊 Export XLSX'}
          </button>
        </article>

        {/* Coaching Plan */}
        <article className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '1rem' }}>
              🎯
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              COACHING & LEARNING
            </div>
            <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Coaching Plan PDF
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Personalized exercises, skill gap breakdown, and customized rhetorical improvement strategy.
            </p>
          </div>
          <button
            disabled={!user || busy}
            onClick={downloadCoachingPlan}
            className="btn btn-login"
            style={{ width: '100%', cursor: 'pointer', padding: '0.8rem' }}
          >
            {busy === 'coaching' ? 'PREPARING PLAN…' : '🎯 Export Plan'}
          </button>
        </article>

        {/* Issue Certificate */}
        <article className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '1rem' }}>
              🏆
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              ACHIEVEMENT CREDENTIAL
            </div>
            <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Issue Certificate
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Issue a verifiable cryptographic certificate for completed sessions with score &gt;= 80%.
            </p>
          </div>
          <div>
            <button
              disabled={!selectedId || busy}
              onClick={issueCertificate}
              className="btn btn-red"
              style={{ width: '100%', cursor: 'pointer', padding: '0.8rem' }}
            >
              {busy === 'certificate' ? 'ISSUING CREDENTIAL…' : '🏆 Issue Certificate'}
            </button>
            {certificate && (
              <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#166534' }}>
                <strong>✓ ID:</strong> {certificate.certificate_id}
                <br />
                <strong>Score:</strong> {certificate.score}%
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Verify Certificate Glass Card */}
      <section className="glass-card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ios-indigo)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
          PUBLIC VERIFICATION
        </div>
        <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem' }}>
          Verify Certificate Authenticity
        </h2>
        <form onSubmit={verifyCertificate} style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          <input
            value={certificateCode}
            onChange={(e) => setCertificateCode(e.target.value)}
            placeholder="Enter certificate ID: LOGOS-XXXXXXXXXXXX"
            style={{ flex: '1 1 320px', fontFamily: 'monospace' }}
          />
          <button disabled={busy === 'verify'} className="btn btn-red" style={{ padding: '0.8rem 1.8rem' }}>
            {busy === 'verify' ? 'VERIFYING…' : 'Verify'}
          </button>
        </form>
        {verification && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '14px', background: verification.valid ? '#ecfdf5' : '#fef2f2', border: `1px solid ${verification.valid ? '#bbf7d0' : '#fecaca'}`, color: verification.valid ? '#166534' : '#991b1b', fontWeight: 700 }}>
            {verification.valid
              ? `✓ Valid cryptographic certificate issued to ${verification.user_name || 'verified learner'} — overall performance score ${verification.score}%`
              : '❌ Certificate is not valid or has been revoked.'}
          </div>
        )}
      </section>
    </main>
  );
}
