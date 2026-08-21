'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { apiFetch, clearAuth, getStoredUser } from '../../lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try { setItems(await apiFetch('/notifications/my-alerts?limit=100') || []); }
    catch (err) { if (err.status === 401) { clearAuth(); router.push('/login'); } else setError(err.message || 'Unable to load notifications.'); }
  }
  useEffect(() => { if (!getStoredUser()?.access_token) router.push('/login'); else load(); }, [router]);
  async function mark(id) { await apiFetch(`/notifications/read/${id}`, { method: 'POST' }); setItems(old => old.map(item => item.id === id ? { ...item, read: true } : item)); }
  async function markAll() { await apiFetch('/notifications/read-all', { method: 'POST' }); setItems(old => old.map(item => ({ ...item, read: true }))); }

  return <><Navbar /><main className="section-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem', maxWidth: '900px' }}><div className="badge-red-pill">PERSISTED ALERT STREAM</div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem', flexWrap: 'wrap' }}><div><h1 className="font-display" style={{ fontSize: '3rem', textTransform: 'uppercase', marginBottom: '.5rem' }}>Notifications</h1><p style={{ color: 'var(--text-secondary)' }}>Milestones and coaching reminders generated from your stored activity.</p></div><button onClick={markAll} className="btn btn-dark" style={{ cursor: 'pointer' }}>MARK ALL READ</button></div>{error && <div role="alert" style={{ marginTop: '1rem', padding: '.8rem 1rem', color: '#991b1b', background: '#fef2f2' }}>{error}</div>}<div style={{ display: 'grid', gap: '.75rem', marginTop: '2rem' }}>{items.length === 0 ? <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '2rem', color: '#71717a' }}>No notifications yet.</div> : items.map(item => <button key={item.id} onClick={() => !item.read && mark(item.id)} style={{ textAlign: 'left', background: item.read ? '#fff' : '#fff7f7', border: '1px solid #e5e7eb', borderLeft: `4px solid ${item.read ? '#d4d4d8' : '#dc2626'}`, padding: '1rem', cursor: item.read ? 'default' : 'pointer' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><strong>{item.title}</strong><span style={{ color: '#71717a', fontSize: '.75rem' }}>{item.timestamp}</span></div><div style={{ color: '#52525b', marginTop: '.35rem' }}>{item.message}</div><small style={{ color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.08em' }}>{item.category} {item.read ? '· READ' : '· UNREAD'}</small></button>)}</div></main></>;
}
