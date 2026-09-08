"use client";

import { useEffect, useState } from 'react';

export default function FallaciesPage() {
  const [text, setText] = useState('Either we ban every AI system or society will inevitably collapse.');
  const [catalog, setCatalog] = useState([]);
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/fallacy-detection/supported-fallacies')
      .then((response) => response.json())
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  const runAudit = async (event) => {
    event.preventDefault();
    setError('');
    const token = localStorage.getItem('logos_ai_jwt');
    if (!token) { setError('Please log in before running a fallacy audit.'); return; }
    try {
      const response = await fetch(`http://localhost:8000/api/v1/fallacy-detection/audit?speech_text=${encodeURIComponent(text)}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Fallacy audit failed.');
      setAudit(data);
    } catch (auditError) { setError(auditError.message); }
  };

  return (
    <div className="section-container">
      <div className="badge-red-pill">LOGIC AUDIT</div>
      <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>FALLACY DETECTION</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 720, marginBottom: '2rem' }}>Audit a position against the supported fallacy patterns and receive correction guidance.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem' }}>
        <form onSubmit={runAudit} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '1.5rem' }}>
          <label className="font-mono" style={{ display: 'block', fontSize: '0.78rem', marginBottom: '0.5rem' }}>TEXT TO AUDIT</label>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={9} style={{ width: '100%', padding: '1rem', border: '1px solid var(--border-light)' }} />
          <button className="btn btn-red" type="submit" style={{ width: '100%', marginTop: '1rem' }}>RUN LOGIC AUDIT</button>
          {error && <p style={{ color: 'var(--accent-red)', marginTop: '1rem' }}>{error}</p>}
        </form>
        <div style={{ background: '#111827', color: '#fff', padding: '1.5rem' }}>
          <div className="font-mono" style={{ color: '#FCA5A5', fontSize: '0.72rem' }}>AUDIT RESULT</div>
          {audit ? <><div className="font-display" style={{ fontSize: '3rem', margin: '0.5rem 0' }}>{audit.fallacies_detected_count}</div><p>fallacies detected</p>{audit.fallacies.map((fallacy) => <div key={fallacy.fallacy_type} style={{ borderTop: '1px solid #374151', padding: '0.8rem 0' }}><strong style={{ color: '#FCA5A5' }}>{fallacy.fallacy_type}</strong><p style={{ margin: '0.3rem 0', color: '#D1D5DB', fontSize: '0.85rem' }}>{fallacy.explanation}</p><p style={{ margin: 0, color: '#A7F3D0', fontSize: '0.8rem' }}>{fallacy.correction_suggestion}</p></div>)}</> : <p style={{ color: '#CBD5E1', marginTop: '1rem' }}>Run an audit to see detected patterns and correction suggestions.</p>}
        </div>
      </div>
      <h2 className="font-display" style={{ margin: '3rem 0 1rem', textTransform: 'uppercase' }}>Supported patterns</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>{catalog.map((fallacy) => <div key={fallacy.name} style={{ border: '1px solid var(--border-light)', padding: '1rem', background: '#fff' }}><strong>{fallacy.name}</strong><p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{fallacy.explanation}</p></div>)}</div>
    </div>
  );
}
