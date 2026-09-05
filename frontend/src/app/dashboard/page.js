'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { apiFetch, clearAuth, getStoredUser } from '../../lib/api';

const endpointFor = {
  Learner: (id) => `/dashboards/learner/${id}`,
  'Debate Coach': (id) => `/dashboards/coach/${id}`,
  Educator: (id) => `/dashboards/educator/${id}`,
  Administrator: () => '/dashboards/admin',
};

function Stat({ label, value, hint, icon, delta }) {
  return (
    <div className="glass-card" style={{ padding: '1.4rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        {icon && <span style={{ fontSize: '1.25rem', opacity: 0.9 }}>{icon}</span>}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
        {delta && (
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '0.15rem 0.45rem', borderRadius: '9999px' }}>
            {delta}
          </span>
        )}
        {hint && <span style={{ color: '#64748b', fontSize: '0.76rem' }}>{hint}</span>}
      </div>
    </div>
  );
}

function ErrorBox({ children }) {
  return children ? (
    <div role="alert" style={{ marginBottom: '1.25rem', padding: '.9rem 1.25rem', color: '#991b1b', background: 'rgba(254, 242, 242, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid #fecaca', borderRadius: '16px', fontWeight: 600 }}>
      {children}
    </div>
  ) : null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [form, setForm] = useState({ title: '', topic: '', assigned_position: 'Affirmative', format: 'Parliamentary Debate' });
  const [creating, setCreating] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', preferred_topics: '', learning_goals: '', coaching_preferences: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);

  // Session Details Modal state
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailActionError, setDetailActionError] = useState('');

  const load = async (current = user) => {
    if (!current?.user_id) return;
    setLoading(true);
    setError('');
    try {
      const [main, currentProfile] = await Promise.all([
        apiFetch(endpointFor[current.role]?.(current.user_id) || endpointFor.Learner(current.user_id)),
        apiFetch('/auth/profile/me'),
      ]);
      setData(main);
      setProfile(currentProfile);
      setProfileForm({
        full_name: currentProfile.full_name || '',
        preferred_topics: currentProfile.preferred_topics || '',
        learning_goals: currentProfile.learning_goals || '',
        coaching_preferences: currentProfile.coaching_preferences || '',
      });
      if (current.role === 'Learner') {
        const [history, received] = await Promise.all([apiFetch('/sessions/user/me'), apiFetch('/feedback/received')]);
        setSessions(history || []);
        setFeedback(received || []);
      }
      if (current.role === 'Administrator') {
        const users = await apiFetch('/auth/admin/users');
        setAdminUsers(users || []);
      }
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        router.push('/login');
        return;
      }
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const current = getStoredUser();
    if (!current?.access_token || !current?.user_id) {
      router.push('/login');
      return;
    }
    setUser(current);
    load(current);
  }, [router]);

  const learner = user?.role === 'Learner' ? data : null;
  const staff = user && user.role !== 'Learner' ? data : null;
  const sessionCount = useMemo(() => sessions.length, [sessions]);

  async function openSessionDetails(sessionId) {
    setSelectedSessionId(sessionId);
    setLoadingDetail(true);
    setDetailActionError('');
    setSessionDetail(null);
    try {
      const details = await apiFetch(`/sessions/${sessionId}/details`);
      setSessionDetail(details);
    } catch (err) {
      setDetailActionError(err.message || 'Unable to load session details.');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function toggleSessionStatus(sessionId, targetStatus, e) {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/sessions/${sessionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: targetStatus } : s)));
      if (selectedSessionId === sessionId) {
        setSessionDetail((prev) => (prev ? { ...prev, session: { ...prev.session, status: targetStatus } } : prev));
      }
      await load(user);
    } catch (err) {
      setError(err.message || 'Unable to update session status.');
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setError('');
    try {
      const updated = await apiFetch('/auth/profile/me', { method: 'PUT', body: JSON.stringify(profileForm) });
      setProfile(updated);
      setUser((old) => ({ ...old, full_name: updated.full_name }));
      localStorage.setItem('logos_ai_user', JSON.stringify({ ...getStoredUser(), full_name: updated.full_name }));
    } catch (err) {
      setError(err.message || 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changeUserRole(userId, role) {
    setError('');
    try {
      const updated = await apiFetch(`/auth/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setAdminUsers((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err.message || 'Unable to update the user role.');
    }
  }

  async function createSession(event) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      const newSession = await apiFetch('/sessions/create', { method: 'POST', body: JSON.stringify({ ...form, status: 'Active' }) });
      setForm({ title: '', topic: '', assigned_position: 'Affirmative', format: 'Parliamentary Debate' });
      await load(user);
      if (newSession?.id) {
        openSessionDetails(newSession.id);
      }
    } catch (err) {
      setError(err.message || 'Unable to create a session.');
    } finally {
      setCreating(false);
    }
  }

  if (!user || loading) {
    return (
      <main className="section-container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
        <div className="font-mono text-red animate-pulse" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
          &gt; Loading Performance Analytics Telemetry...
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="section-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
        {/* Header with iOS Glass Banner */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
          <div>
            <div className="badge-red-pill">
              <span className="badge-dot"></span> LIVE ANALYTICS // {user.role.toUpperCase()}
            </div>
            <h1 className="font-display" style={{ margin: '0.2rem 0 0', fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>
              Welcome back, <span className="text-gradient">{user.full_name || 'Debater'}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.92rem' }}>
              Track your debate mastery, prosody metrics, and rhetorical performance in real-time.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link href="/simulation" className="btn btn-red" style={{ padding: '0.65rem 1.35rem', fontSize: '0.82rem' }}>
              ⚡ Start Simulation
            </Link>
            <button onClick={() => load(user)} className="btn btn-login" style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', cursor: 'pointer' }}>
              🔄 Refresh
            </button>
          </div>
        </header>

        <ErrorBox>{error}</ErrorBox>

        {learner && (
          <>
            {/* iOS Glass Nav Tabs */}
            <div style={{ 
              display: 'inline-flex', 
              background: 'rgba(255, 255, 255, 0.75)', 
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.9)', 
              padding: '0.35rem', 
              borderRadius: '9999px',
              gap: '0.35rem', 
              marginBottom: '2rem',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.05)'
            }}>
              {[
                { id: 'overview', label: '📊 Overview' },
                { id: 'history', label: '📜 Practice History' },
                { id: 'settings', label: '⚙️ Settings' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  style={{
                    border: 0,
                    background: tab === item.id ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'transparent',
                    color: tab === item.id ? '#ffffff' : '#475569',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: tab === item.id ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <>
                {/* 5-part iOS Stat Cards */}
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  <Stat label="Debates Completed" value={learner.total_debates_completed} icon="🏆" delta="+2 this week" />
                  <Stat label="Average Score" value={`${learner.average_overall_score}%`} icon="🎯" hint="Weighted performance" delta="+8.2%" />
                  <Stat label="Speech Pace" value={learner.average_speech_pace_wpm ? `${learner.average_speech_pace_wpm} WPM` : '128 WPM'} icon="⚡" hint="Optimal range (120-150)" />
                  <Stat label="Filler Density" value={learner.average_filler_words ?? '0'} icon="✨" hint="Avg count per round" />
                  <Stat label="Unread Alerts" value={learner.unread_notifications} icon="🔔" hint="Coaching updates" />
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.85fr)', gap: '2rem', alignItems: 'start' }}>
                  {/* Recent Sessions List Glass Card */}
                  <div className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h2 className="font-display" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Recent Practice Sessions</h2>
                      <span className="font-mono text-muted" style={{ fontSize: '0.78rem' }}>{sessionCount} sessions</span>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      Click on any session below to inspect detailed <strong>Vocal Prosody, AI Coaching Feedback & Opponent Rebuttals</strong>.
                    </p>

                    <div style={{ display: 'grid', gap: '0.85rem' }}>
                      {sessions.slice(0, 8).map((item) => {
                        const isCompleted = item.status === 'Completed' || item.status === 'Ended';
                        return (
                          <div
                            key={item.id}
                            onClick={() => openSessionDetails(item.id)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.85)',
                              border: '1px solid rgba(226, 232, 240, 0.9)',
                              borderRadius: '16px',
                              padding: '1.1rem 1.25rem',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '1rem',
                              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(99, 102, 241, 0.12)';
                              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.02)';
                              e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  color: 'var(--ios-indigo)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '6px'
                                }}>
                                  #{item.id}
                                </span>
                                <strong style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>{item.title}</strong>
                              </div>
                              <div style={{ color: '#475569', fontSize: '0.82rem', marginTop: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.topic}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                                {item.format} · Position: <strong>{item.assigned_position}</strong>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                              <span
                                style={{
                                  color: isCompleted ? '#15803d' : '#c2410c',
                                  background: isCompleted ? '#ecfdf5' : '#fff7ed',
                                  border: `1px solid ${isCompleted ? '#bbf7d0' : '#fed7aa'}`,
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '9999px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {item.status}
                              </span>

                              {item.status === 'Active' ? (
                                <button
                                  onClick={(e) => toggleSessionStatus(item.id, 'Completed', e)}
                                  className="btn btn-dark"
                                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', cursor: 'pointer' }}
                                >
                                  End Session
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => toggleSessionStatus(item.id, 'Active', e)}
                                  className="btn btn-login"
                                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', cursor: 'pointer' }}
                                >
                                  Reopen
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {sessions.length === 0 && <p style={{ color: '#94a3b8', padding: '1.5rem 0', textAlign: 'center' }}>No practice sessions yet. Create one on the right!</p>}
                    </div>
                  </div>

                  {/* Create Session Glass Form */}
                  <div className="glass-card" style={{ padding: '2rem' }}>
                    <h2 className="font-display" style={{ marginTop: 0, fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                      Initialize Practice Session
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                      Configure motion, debate format, and assigned position.
                    </p>

                    <form onSubmit={createSession} style={{ display: 'grid', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                          Session Title
                        </label>
                        <input
                          required
                          maxLength={200}
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          placeholder="e.g. AI Ethics & Governance Debate"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                          Debate Motion / Topic
                        </label>
                        <textarea
                          required
                          maxLength={2000}
                          rows={4}
                          value={form.topic}
                          onChange={(e) => setForm({ ...form, topic: e.target.value })}
                          placeholder="e.g. Autonomous AI systems should be held strictly liable for unintended damages."
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                            Position
                          </label>
                          <select
                            value={form.assigned_position}
                            onChange={(e) => setForm({ ...form, assigned_position: e.target.value })}
                            style={{ width: '100%' }}
                          >
                            <option>Affirmative</option>
                            <option>Negative</option>
                            <option>Neutral</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                            Format
                          </label>
                          <select
                            value={form.format}
                            onChange={(e) => setForm({ ...form, format: e.target.value })}
                            style={{ width: '100%' }}
                          >
                            <option>Parliamentary Debate</option>
                            <option>1-on-1 Debate</option>
                            <option>Oxford Debate</option>
                            <option>Policy Debate</option>
                            <option>Public Forum Debate</option>
                          </select>
                        </div>
                      </div>

                      <button disabled={creating} className="btn btn-red" style={{ padding: '0.9rem', cursor: 'pointer', marginTop: '0.5rem', width: '100%' }}>
                        {creating ? 'CREATING…' : '⚡ START LIVE SIMULATION'}
                      </button>
                    </form>
                  </div>
                </section>

                {/* AI Coaching Plan Dark Glass Card */}
                <section className="glass-card-dark" style={{ marginTop: '2rem', padding: '2rem', color: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div className="badge-red-pill" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc', border: '1px solid rgba(165, 180, 252, 0.3)', margin: 0 }}>
                      AGENTIC COACHING ENGINE
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      PERSONALIZED AI DIRECTIVES
                    </span>
                  </div>
                  <h2 className="font-display" style={{ margin: '0.6rem 0 0.4rem', fontSize: '1.4rem', fontWeight: 800 }}>
                    {learner.average_overall_score ? 'Personalized Rhetorical Improvement Plan' : 'Start Your Baseline Assessment'}
                  </h2>
                  <p style={{ color: '#cbd5e1', maxWidth: '850px', lineHeight: '1.65', fontSize: '0.92rem' }}>
                    {(learner.recommended_exercises || []).join(' ') || 'Complete a live debate simulation and vocal analysis to generate personalized feedback, drill routines, and fallacy remediation plans.'}
                  </p>
                </section>
              </>
            )}

            {tab === 'history' && (
              <section className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="font-display" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
                    Complete Practice History
                  </h2>
                  <span className="font-mono text-muted">{sessions.length} total</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  Click on any session to review full prosody metrics, fallacy detections, and AI opponent counter-arguments.
                </p>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {sessions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openSessionDetails(item.id)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        borderRadius: '16px',
                        padding: '1.1rem 1.4rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--ios-indigo)', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                            #{item.id}
                          </span>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{item.title}</strong>
                        </div>
                        <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.25rem' }}>{item.topic}</div>
                        <small style={{ color: '#94a3b8' }}>Format: {item.format} · Position: {item.assigned_position}</small>
                      </div>
                      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                        <span style={{ color: item.status === 'Completed' || item.status === 'Ended' ? '#15803d' : '#c2410c', fontWeight: 800, fontSize: '.75rem', textTransform: 'uppercase' }}>
                          {item.status}
                        </span>
                        <button className="btn btn-dark" style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}>
                          Inspect →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === 'settings' && (
              <section className="glass-card" style={{ padding: '2rem' }}>
                <h2 className="font-display" style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 900 }}>
                  Profile & Preferences
                </h2>
                <form onSubmit={saveProfile} style={{ display: 'grid', gap: '1rem', maxWidth: '720px', marginTop: '1.25rem' }}>
                  {[
                    ['full_name', 'Full Name'],
                    ['preferred_topics', 'Preferred Topics'],
                    ['learning_goals', 'Learning Goals'],
                    ['coaching_preferences', 'Coaching Preferences'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'grid', gap: '0.35rem', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                      {label}
                      <input
                        value={profileForm[key]}
                        onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                        style={{ padding: '0.75rem 1rem', fontWeight: 400 }}
                      />
                    </label>
                  ))}
                  <button disabled={savingProfile} className="btn btn-red" style={{ width: 'fit-content', cursor: 'pointer', padding: '0.75rem 1.75rem', marginTop: '0.5rem' }}>
                    {savingProfile ? 'SAVING…' : '✓ SAVE PROFILE'}
                  </button>
                </form>
                {feedback.length > 0 && (
                  <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Latest Coach Feedback</h3>
                    <p style={{ color: '#475569', marginTop: '0.5rem', lineHeight: '1.6' }}>{feedback[0].content}</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {staff && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem' }}>
            {user.role === 'Debate Coach' && (
              <>
                <Stat label="Learners" value={staff.assigned_students_count} icon="🎓" />
                <Stat label="Pending Evaluations" value={staff.pending_evaluations} icon="⏳" />
                <Stat label="Skill Gaps" value={staff.class_skill_gaps?.length || 0} icon="🎯" />
              </>
            )}
            {user.role === 'Educator' && (
              <>
                <Stat label="Active Classes" value={staff.active_classes} icon="🏛️" />
                <Stat label="Enrolled Learners" value={staff.total_enrolled_students} icon="👥" />
                <Stat label="Class Average" value={`${staff.average_class_score}%`} icon="📈" />
              </>
            )}
            {user.role === 'Administrator' && (
              <>
                <Stat label="Platform Users" value={staff.platform_users_total} icon="👥" />
                <Stat label="Total Sessions" value={staff.sessions_total} icon="📊" />
                <Stat label="Completed Sessions" value={staff.completed_sessions_total} icon="✓" />
                <Stat label="AI Provider" value={staff.llm_api_health} icon="🤖" />
              </>
            )}
            {user.role === 'Administrator' && (
              <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '1.75rem', marginTop: '1rem' }}>
                <h2 className="font-display" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>User Role Management</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Only administrators can change roles. Your own administrator role cannot be demoted.</p>
                {adminUsers.map((item) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px', gap: '1rem', alignItems: 'center', borderTop: '1px solid rgba(226, 232, 240, 0.8)', padding: '.75rem 0' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{item.full_name}</strong>
                      <div style={{ color: '#64748b', fontSize: '.8rem' }}>
                        {item.email}
                        {item.id === user.user_id ? ' · You' : ''}
                      </div>
                    </div>
                    <select
                      value={item.role}
                      disabled={item.id === user.user_id}
                      onChange={(event) => changeUserRole(item.id, event.target.value)}
                      style={{ padding: '.55rem', background: item.id === user.user_id ? '#f4f4f5' : '#fff' }}
                    >
                      <option>Learner</option>
                      <option>Debate Coach</option>
                      <option>Educator</option>
                      <option>Administrator</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* iOS GLASS SESSION DETAILS MODAL */}
      {selectedSessionId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedSessionId(null)}
        >
          <div
            className="glass-card"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              maxWidth: '880px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(99, 102, 241, 0.12)', color: 'var(--ios-indigo)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                    SESSION #{selectedSessionId}
                  </span>
                  {sessionDetail && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                        background: sessionDetail.session.status === 'Completed' || sessionDetail.session.status === 'Ended' ? '#ecfdf5' : '#fff7ed',
                        color: sessionDetail.session.status === 'Completed' || sessionDetail.session.status === 'Ended' ? '#15803d' : '#c2410c',
                        border: `1px solid ${sessionDetail.session.status === 'Completed' || sessionDetail.session.status === 'Ended' ? '#bbf7d0' : '#fed7aa'}`,
                      }}
                    >
                      {sessionDetail.session.status}
                    </span>
                  )}
                </div>
                <h2 className="font-display" style={{ margin: '0.5rem 0 0.2rem', fontSize: '1.5rem', fontWeight: 900 }}>
                  {sessionDetail?.session.title || 'Session Details'}
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                  {sessionDetail?.session.topic}
                </p>
              </div>

              <button
                onClick={() => setSelectedSessionId(null)}
                style={{ background: 'rgba(241, 245, 249, 0.8)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading session analytics & AI feedback…</div>
            ) : detailActionError ? (
              <ErrorBox>{detailActionError}</ErrorBox>
            ) : sessionDetail ? (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Status Toggle Bar */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                    Format: <strong>{sessionDetail.session.format}</strong> · Position: <strong>{sessionDetail.session.assigned_position}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {sessionDetail.session.status === 'Active' ? (
                      <button
                        onClick={() => toggleSessionStatus(sessionDetail.session.id, 'Completed')}
                        className="btn btn-red"
                        style={{ fontSize: '0.75rem', padding: '0.45rem 1rem', cursor: 'pointer' }}
                      >
                        ✓ Mark as Completed / End Session
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleSessionStatus(sessionDetail.session.id, 'Active')}
                        className="btn btn-dark"
                        style={{ fontSize: '0.75rem', padding: '0.45rem 1rem', cursor: 'pointer' }}
                      >
                        ↺ Reopen Session as Active
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. VOCAL & SPEECH METRICS WITH AI FEEDBACK */}
                <div style={{ border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', padding: '1.25rem', background: '#fff' }}>
                  <div className="font-mono text-red" style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                    1. VOCAL METRICS & PRESENTATION ANALYSIS
                  </div>

                  {sessionDetail.latest_presentation_metric ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                        {[
                          ['SPEECH PACE', `${sessionDetail.latest_presentation_metric.speech_pace_wpm} WPM`],
                          ['FILLER WORDS', `${sessionDetail.latest_presentation_metric.filler_words_count} count`],
                          ['CONFIDENCE', `${sessionDetail.latest_presentation_metric.confidence_score}%`],
                          ['CLARITY', `${sessionDetail.latest_presentation_metric.clarity_score}%`],
                          ['ENGAGEMENT', `${sessionDetail.latest_presentation_metric.engagement_score}%`],
                        ].map(([lbl, val]) => (
                          <div key={lbl} style={{ background: '#f8fafc', padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>{lbl}</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '0.2rem', color: '#0f172a' }}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* AI FEEDBACK BLOCK */}
                      {sessionDetail.latest_presentation_metric.ai_feedback && (
                        <div style={{ background: '#0f172a', color: '#f8fafc', padding: '1.25rem', borderRadius: '14px', marginTop: '0.75rem' }}>
                          <div className="font-mono text-red" style={{ fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                            🤖 AI COACHING & VOCAL EVALUATION
                          </div>
                          <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                            {sessionDetail.latest_presentation_metric.ai_feedback}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                      No vocal analysis performed for this session yet.{' '}
                      <Link href="/presentation" style={{ color: 'var(--ios-indigo)', fontWeight: 700, textDecoration: 'underline' }}>
                        Run Vocal Metrics Analysis →
                      </Link>
                    </p>
                  )}
                </div>

                {/* 2. PERFORMANCE SCORE MATRIX */}
                {sessionDetail.performance_score && (
                  <div style={{ border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', padding: '1.25rem', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div className="font-mono text-red" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                        2. WEIGHTED PERFORMANCE SCORE
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--ios-indigo)' }}>
                        {sessionDetail.performance_score.overall_weighted_score}%
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                      {[
                        ['Argument Quality (30%)', sessionDetail.performance_score.argument_quality],
                        ['Evidence Use (20%)', sessionDetail.performance_score.evidence_use],
                        ['Logic & Consistency (20%)', sessionDetail.performance_score.logical_consistency],
                        ['Rebuttal Effectiveness (15%)', sessionDetail.performance_score.rebuttal_effectiveness],
                        ['Communication Skills (15%)', sessionDetail.performance_score.communication_skills],
                      ].map(([lbl, val]) => (
                        <div key={lbl} style={{ padding: '0.65rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{lbl}</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem', color: '#0f172a' }}>{val}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. AI SIMULATION TURNS */}
                {sessionDetail.simulation_turns?.length > 0 && (
                  <div style={{ border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', padding: '1.25rem', background: '#fff' }}>
                    <div className="font-mono text-red" style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                      3. LIVE DEBATE SIMULATION TURNS ({sessionDetail.simulation_turns.length})
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                      {sessionDetail.simulation_turns.map((turn, idx) => (
                        <div key={idx} style={{ background: '#0f172a', color: '#fff', padding: '0.9rem', borderRadius: '12px', fontSize: '0.82rem' }}>
                          <div style={{ color: '#38bdf8', marginBottom: '0.2rem' }}>
                            <strong>Turn #{turn.turn_index} You:</strong> {turn.user_argument}
                          </div>
                          <div style={{ color: '#f43f5e', marginTop: '0.4rem' }}>
                            <strong>AI Opponent ({turn.opponent_persona}):</strong> {turn.opponent_rebuttal}
                          </div>
                          {turn.coaching_tip && (
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.35rem' }}>
                              💡 Coaching Tip: {turn.coaching_tip}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(226, 232, 240, 0.8)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                  <Link href="/presentation" className="btn btn-login" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    Open in Vocal Metrics
                  </Link>
                  <Link href="/simulation" className="btn btn-red" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    Open in AI Simulation
                  </Link>
                  <Link href="/reports" className="btn btn-login" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    Export PDF / Excel
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
