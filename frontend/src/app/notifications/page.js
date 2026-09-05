'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch, clearAuth, getStoredUser } from '../../lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await apiFetch('/notifications/my-alerts?limit=100');
      setItems(data || []);
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        router.push('/login');
      } else {
        setError(err.message || 'Unable to load notifications.');
      }
    }
  }

  useEffect(() => {
    if (!getStoredUser()?.access_token) {
      router.push('/login');
    } else {
      load();
    }
  }, [router]);

  async function mark(id) {
    await apiFetch(`/notifications/read/${id}`, { method: 'POST' });
    setItems((old) => old.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }

  async function markAll() {
    await apiFetch('/notifications/read-all', { method: 'POST' });
    setItems((old) => old.map((item) => ({ ...item, read: true })));
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'unread') return !item.read;
    if (filter === 'milestones') return item.category === 'Milestone' || item.category === 'Achievement';
    return true;
  });

  const getCategoryIcon = (cat) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('achievement') || lower.includes('streak')) return '🏆';
    if (lower.includes('reminder') || lower.includes('practice')) return '⚡';
    if (lower.includes('performance') || lower.includes('score')) return '📈';
    return '🎯';
  };

  return (
    <main className="section-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem', maxWidth: '900px' }}>
      <div className="badge-red-pill">
        <span className="badge-dot"></span> PERSISTED ALERT STREAM
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 900, marginBottom: '0.4rem' }}>
            Notifications & Alerts
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Stay updated with your debate milestones, AI coaching recommendations, and practice streak updates.
          </p>
        </div>

        <button onClick={markAll} className="btn btn-login" style={{ padding: '0.65rem 1.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
          Mark All as Read
        </button>
      </div>

      {error && (
        <div role="alert" style={{ marginTop: '1rem', padding: '.9rem 1.25rem', color: '#991b1b', background: 'rgba(254, 242, 242, 0.9)', border: '1px solid #fecaca', borderRadius: '16px' }}>
          {error}
        </div>
      )}

      {/* Filter Tabs matching mockup #07 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread' },
          { id: 'milestones', label: 'Milestones' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '0.45rem 1.2rem',
              borderRadius: '9999px',
              border: 'none',
              background: filter === tab.id ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255, 255, 255, 0.8)',
              color: filter === tab.id ? '#fff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: filter === tab.id ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 2px 6px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '0.85rem' }}>
        {filteredItems.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            ✨ No notifications in this view.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => !item.read && mark(item.id)}
              className="glass-card"
              style={{
                padding: '1.25rem 1.5rem',
                cursor: item.read ? 'default' : 'pointer',
                background: item.read ? 'rgba(255, 255, 255, 0.75)' : 'rgba(238, 242, 255, 0.9)',
                borderColor: item.read ? 'rgba(255, 255, 255, 0.8)' : 'rgba(99, 102, 241, 0.3)',
                display: 'flex',
                gap: '1.25rem',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: item.read ? 'rgba(241, 245, 249, 0.8)' : 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0
              }}>
                {getCategoryIcon(item.category)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>{item.title}</strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>{item.timestamp}</span>
                </div>
                <div style={{ color: '#475569', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '0.5rem' }}>
                  {item.message}
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: item.read ? '#64748b' : 'var(--ios-indigo)',
                  background: item.read ? 'rgba(241, 245, 249, 0.8)' : 'rgba(99, 102, 241, 0.12)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase'
                }}>
                  {item.category} {!item.read && '· UNREAD'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
