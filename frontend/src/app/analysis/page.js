"use client";

import { useState } from 'react';

export default function ArgumentAnalysisPage() {
  const [text, setText] = useState('AI systems should be regulated because transparent rules reduce harm and improve public trust.');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('logos_ai_jwt');
      if (!token) throw new Error('Please log in before running an argument analysis.');
      const sessionResponse = await fetch('http://localhost:8000/api/v1/sessions/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Argument Analysis Session', topic: text, format: 'Argument Analysis', assigned_position: 'Affirmative' })
      });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok) throw new Error(session.detail || 'Could not create analysis session.');
      const response = await fetch('http://localhost:8000/api/v1/argument-analysis/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: session.id, speech_text: text })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Argument analysis failed.');
      setResult(data);
    } catch (analysisError) {
      setError(analysisError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-container">
      <div className="badge-red-pill">ARGUMENT INTELLIGENCE</div>
      <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>ARGUMENT ANALYSIS</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 720, marginBottom: '2rem' }}>Extract the claim, score the reasoning, and generate counterargument directions from a learner speech.</p>
      <form onSubmit={analyze} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '1.5rem' }}>
          <label className="font-mono" style={{ display: 'block', fontSize: '0.78rem', marginBottom: '0.5rem' }}>ARGUMENT TEXT</label>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={12} style={{ width: '100%', padding: '1rem', border: '1px solid var(--border-light)', resize: 'vertical' }} />
          <button className="btn btn-red" type="submit" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>{loading ? 'ANALYZING...' : 'RUN ARGUMENT ANALYSIS'}</button>
          {error && <p style={{ color: 'var(--accent-red)', marginTop: '1rem' }}>{error}</p>}
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', padding: '1.5rem' }}>
          {!result && <p style={{ color: 'var(--text-muted)' }}>Your claim, evidence, reasoning, fallacies, and rebuttal options will appear here.</p>}
          {result && <>
            <div className="font-mono text-red" style={{ fontSize: '0.72rem' }}>EXTRACTED CLAIM</div><p style={{ margin: '0.5rem 0 1.5rem' }}>{result.claim_identified}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>{[['Evidence', result.evidence_strength], ['Reasoning', result.reasoning_quality], ['Clarity', result.clarity_score], ['Persuasion', result.persuasiveness_score]].map(([label, value]) => <div key={label} style={{ padding: '1rem', background: '#F8FAFC' }}><div className="font-mono" style={{ fontSize: '0.7rem' }}>{label}</div><strong className="font-display" style={{ fontSize: '1.7rem' }}>{value}</strong></div>)}</div>
            <h3 className="font-display" style={{ textTransform: 'uppercase', margin: '1.5rem 0 0.75rem' }}>Fallacies</h3>{result.fallacies.length === 0 ? <p>No supported fallacies detected.</p> : result.fallacies.map((fallacy) => <div key={fallacy.fallacy_type} style={{ padding: '0.75rem', background: '#FEF2F2', marginBottom: '0.5rem' }}><strong>{fallacy.fallacy_type}</strong><p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>{fallacy.correction_suggestion}</p></div>)}
          </>}
        </div>
      </form>
    </div>
  );
}
