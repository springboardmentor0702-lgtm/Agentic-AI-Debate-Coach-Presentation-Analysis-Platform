"use client";

import { useEffect, useState } from 'react';

export default function SchedulePage() {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ title: '', topic: '', format: 'Parliamentary Debate', scheduled_at: '' });
  const [message, setMessage] = useState('');

  const loadSessions = async () => {
    const token = localStorage.getItem('logos_ai_jwt');
    if (!token) return;
    const response = await fetch('http://localhost:8000/api/v1/sessions/mine', { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) setSessions(await response.json());
  };

  useEffect(() => { loadSessions(); }, []);

  const schedule = async (event) => {
    event.preventDefault();
    setMessage('');
    const token = localStorage.getItem('logos_ai_jwt');
    try {
      const response = await fetch('http://localhost:8000/api/v1/sessions/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, scheduled_at: new Date(form.scheduled_at).toISOString(), status: 'Scheduled', assigned_position: 'Affirmative' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not schedule session.');
      setMessage('Debate session scheduled.');
      setForm({ title: '', topic: '', format: 'Parliamentary Debate', scheduled_at: '' });
      loadSessions();
    } catch (error) { setMessage(error.message); }
  };

  return <div className="section-container"><div className="badge-red-pill">SESSION PLANNER</div><h1 className="font-display" style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>SCHEDULE A DEBATE</h1><p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Create a future practice session with a format, topic, and start time.</p><form onSubmit={schedule} style={{ maxWidth: 720, display: 'grid', gap: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '1.5rem' }}><input required placeholder="Session title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={{ padding: '0.85rem', border: '1px solid var(--border-light)' }} /><textarea required placeholder="Debate topic" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} rows={4} style={{ padding: '0.85rem', border: '1px solid var(--border-light)' }} /><select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })} style={{ padding: '0.85rem', border: '1px solid var(--border-light)' }}><option>Parliamentary Debate</option><option>Oxford Debate</option><option>Policy Debate</option><option>Public Forum Debate</option><option>1-on-1 Debate</option></select><input required type="datetime-local" value={form.scheduled_at} onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })} style={{ padding: '0.85rem', border: '1px solid var(--border-light)' }} /><button className="btn btn-red" type="submit">SCHEDULE SESSION</button>{message && <p>{message}</p>}</form><h2 className="font-display" style={{ margin: '3rem 0 1rem', textTransform: 'uppercase' }}>Your scheduled sessions</h2>{sessions.filter((session) => session.status === 'Scheduled').map((session) => <div key={session.id} style={{ border: '1px solid var(--border-light)', padding: '1rem', marginBottom: '0.75rem', background: '#fff' }}><strong>{session.title}</strong><div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{session.topic} | {session.format} | {new Date(session.scheduled_at).toLocaleString()}</div></div>)}</div>;
}
