'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearAuth, downloadReport, getStoredUser } from '../../lib/api';
import Navbar from '../../components/Navbar';

export default function ReportsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.access_token) { router.push('/login'); return; }
    apiFetch('/sessions/user/me').then(items => {
      const list = items || [];
      setSessions(list); setSelectedId(list[0]?.id ? String(list[0].id) : '');
    }).catch(err => {
      if (err.status === 401) { clearAuth(); router.push('/login'); return; }
      setError(err.message || 'Unable to load sessions.');
    }).finally(() => setLoading(false));
  }, [router]);

  async function download(kind, path, filename) {
    if (!selectedId) { setError('Create or select a debate session first.'); return; }
    setBusy(kind); setError('');
    try { await downloadReport(path.replace(':id', selectedId), filename.replace(':id', selectedId)); }
    catch (err) { setError(err.message || 'Download failed.'); }
    finally { setBusy(''); }
  }

  return <><Navbar /><main className="section-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
    <div className="badge-red-pill">EXPORT & COMPLIANCE ENGINE</div>
    <h1 className="font-display" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>Reports & Certificates</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '700px' }}>Download persisted performance scorecards, argument audits, presentation metrics, and coaching plans for an authenticated session.</p>
    {error && <div role="alert" style={{ color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', padding: '.8rem 1rem', marginBottom: '1rem' }}>{error}</div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginBottom: '2rem', flexWrap: 'wrap' }}><label htmlFor="report-session" style={{ fontWeight: 800 }}>Session</label><select id="report-session" disabled={loading || sessions.length === 0} value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ minWidth: '280px', padding: '.75rem', border: '1px solid #d4d4d8' }}><option value="">{loading ? 'Loading sessions…' : sessions.length ? 'Select a session' : 'No sessions available'}</option>{sessions.map(item => <option key={item.id} value={item.id}>{item.title} — {item.status}</option>)}</select></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
      <article style={{ border: '1px solid var(--border-light)', padding: '1.5rem', background: '#fff' }}><div className="font-mono text-red" style={{ fontSize: '.72rem' }}>DEBATE & SPEECH ANALYSIS</div><h2 style={{ fontSize: '1.25rem' }}>Assessment PDF</h2><p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>Argument analysis, fallacies, scores, and presentation metrics.</p><button disabled={!selectedId || busy} onClick={() => download('pdf', '/reports/export/pdf/:id', 'assessment-:id.pdf')} className="btn btn-red" style={{ width: '100%', cursor: 'pointer' }}>{busy === 'pdf' ? 'PREPARING…' : 'DOWNLOAD PDF'}</button></article>
      <article style={{ border: '1px solid var(--border-light)', padding: '1.5rem', background: '#fff' }}><div className="font-mono text-red" style={{ fontSize: '.72rem' }}>PERFORMANCE MATRIX</div><h2 style={{ fontSize: '1.25rem' }}>Excel workbook</h2><p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>Five weighted performance dimensions in a true `.xlsx` workbook.</p><button disabled={!selectedId || busy} onClick={() => download('excel', '/reports/export/excel/:id', 'assessment-:id.xlsx')} className="btn btn-dark" style={{ width: '100%', cursor: 'pointer' }}>{busy === 'excel' ? 'PREPARING…' : 'EXPORT XLSX'}</button></article>
      <article style={{ border: '1px solid var(--border-light)', padding: '1.5rem', background: '#fff' }}><div className="font-mono text-red" style={{ fontSize: '.72rem' }}>COACHING & LEARNING</div><h2 style={{ fontSize: '1.25rem' }}>Coaching plan PDF</h2><p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>Personalized exercises and progress recommendations derived from history.</p><button disabled={!selectedId || busy} onClick={() => download('coaching', '/reports/export/coaching/pdf/:id', 'coaching-plan-:id.pdf')} className="btn btn-dark" style={{ width: '100%', cursor: 'pointer' }}>{busy === 'coaching' ? 'PREPARING…' : 'EXPORT PLAN'}</button></article>
    </div>
  </main></>;
}
