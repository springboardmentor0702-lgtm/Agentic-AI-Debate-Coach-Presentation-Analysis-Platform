'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { apiFetch, clearAuth, getStoredUser } from '../../lib/api';

const endpointFor = {
  Learner: (id) => `/dashboards/learner/${id}`,
  'Debate Coach': (id) => `/dashboards/coach/${id}`,
  Educator: (id) => `/dashboards/educator/${id}`,
  Administrator: () => '/dashboards/admin',
};

function Stat({ label, value, hint }) {
  return <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1.25rem' }}><div style={{ color: '#71717a', fontSize: '.7rem', fontWeight: 800, letterSpacing: '.12em' }}>{label}</div><div style={{ marginTop: '.55rem', fontSize: '2rem', fontWeight: 900 }}>{value}</div>{hint && <div style={{ color: '#71717a', fontSize: '.78rem', marginTop: '.3rem' }}>{hint}</div>}</div>;
}

function ErrorBox({ children }) { return children ? <div role="alert" style={{ marginBottom: '1rem', padding: '.8rem 1rem', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' }}>{children}</div> : null; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [form, setForm] = useState({ title: '', topic: '', assigned_position: 'Affirmative' });
  const [creating, setCreating] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', preferred_topics: '', learning_goals: '', coaching_preferences: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);

  const load = async (current = user) => {
    if (!current?.user_id) return;
    setLoading(true); setError('');
    try {
      const [main, currentProfile] = await Promise.all([
        apiFetch(endpointFor[current.role]?.(current.user_id) || endpointFor.Learner(current.user_id)),
        apiFetch('/auth/profile/me'),
      ]);
      setData(main); setProfile(currentProfile);
      setProfileForm({
        full_name: currentProfile.full_name || '',
        preferred_topics: currentProfile.preferred_topics || '',
        learning_goals: currentProfile.learning_goals || '',
        coaching_preferences: currentProfile.coaching_preferences || '',
      });
      if (current.role === 'Learner') {
        const [history, received] = await Promise.all([apiFetch('/sessions/user/me'), apiFetch('/feedback/received')]);
        setSessions(history || []); setFeedback(received || []);
      }
      if (current.role === 'Administrator') {
        const users = await apiFetch('/auth/admin/users');
        setAdminUsers(users || []);
      }
    } catch (err) {
      if (err.status === 401) { clearAuth(); router.push('/login'); return; }
      setError(err.message || 'Unable to load dashboard data.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const current = getStoredUser();
    if (!current?.access_token || !current?.user_id) { router.push('/login'); return; }
    setUser(current); load(current);
  }, [router]);

  const learner = user?.role === 'Learner' ? data : null;
  const staff = user && user.role !== 'Learner' ? data : null;
  const sessionCount = useMemo(() => sessions.length, [sessions]);

  async function saveProfile(event) {
    event.preventDefault(); setSavingProfile(true); setError('');
    try {
      const updated = await apiFetch('/auth/profile/me', { method: 'PUT', body: JSON.stringify(profileForm) });
      setProfile(updated);
      setUser(old => ({ ...old, full_name: updated.full_name }));
      localStorage.setItem('logos_ai_user', JSON.stringify({ ...getStoredUser(), full_name: updated.full_name }));
    } catch (err) { setError(err.message || 'Unable to save profile.'); }
    finally { setSavingProfile(false); }
  }

  async function changeUserRole(userId, role) {
    setError('');
    try {
      const updated = await apiFetch(`/auth/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setAdminUsers(items => items.map(item => item.id === updated.id ? updated : item));
    } catch (err) { setError(err.message || 'Unable to update the user role.'); }
  }

  async function createSession(event) {
    event.preventDefault(); setCreating(true); setError('');
    try {
      await apiFetch('/sessions/create', { method: 'POST', body: JSON.stringify({ ...form, status: 'Active' }) });
      setForm({ title: '', topic: '', assigned_position: 'Affirmative' }); await load(user);
    } catch (err) { setError(err.message || 'Unable to create a session.'); }
    finally { setCreating(false); }
  }

  if (!user || loading) return <><Navbar /><main className="section-container" style={{ paddingTop: '3rem' }}>Loading persisted analytics…</main></>;

  return <>
    <Navbar />
    <main className="section-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
        <div><div className="font-mono text-red" style={{ fontSize: '.72rem' }}>LIVE ANALYTICS // {user.role.toUpperCase()}</div><h1 className="font-display" style={{ margin: '.5rem 0 0', fontSize: 'clamp(2rem, 5vw, 3.4rem)', textTransform: 'uppercase' }}>Welcome, {user.full_name || 'Debater'}</h1><p style={{ color: 'var(--text-muted)', marginTop: '.4rem' }}>{user.email || ''}</p></div>
        <div style={{ display: 'flex', gap: '.6rem' }}><button onClick={() => load(user)} className="btn btn-dark" style={{ border: 0, cursor: 'pointer' }}>REFRESH</button><button onClick={() => { clearAuth(); router.push('/login'); }} className="btn btn-login" style={{ cursor: 'pointer' }}>LOGOUT</button></div>
      </header>
      <ErrorBox>{error}</ErrorBox>

      {learner && <>
        <nav style={{ display: 'flex', gap: '.4rem', overflowX: 'auto', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>{['overview', 'history', 'settings'].map(item => <button key={item} onClick={() => setTab(item)} style={{ border: 0, borderBottom: tab === item ? '3px solid #dc2626' : '3px solid transparent', background: 'transparent', padding: '.7rem 1rem', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase', fontSize: '.75rem' }}>{item}</button>)}</nav>
        {tab === 'overview' && <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}><Stat label="Debates completed" value={learner.total_debates_completed} /><Stat label="Average score" value={`${learner.average_overall_score}%`} hint="Weighted performance" /><Stat label="Speech pace" value={learner.average_speech_pace_wpm ?? '—'} hint="Words per minute" /><Stat label="Filler words" value={learner.average_filler_words ?? '—'} hint="Average per analysis" /><Stat label="Unread alerts" value={learner.unread_notifications} /></section>
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, .8fr)', gap: '1rem', alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1.25rem' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 style={{ marginTop: 0 }}>Recent sessions</h2><span style={{ color: '#71717a', fontSize: '.8rem' }}>{sessionCount} total</span></div>{sessions.slice(0, 10).map(item => <div key={item.id} style={{ borderTop: '1px solid #f1f1f4', padding: '.8rem 0', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><div><strong>{item.title}</strong><div style={{ color: '#71717a', fontSize: '.8rem', marginTop: '.2rem' }}>{item.topic}</div></div><span style={{ color: item.status === 'Completed' ? '#15803d' : '#b45309', fontWeight: 800, fontSize: '.75rem' }}>{item.status}</span></div>)}{sessions.length === 0 && <p style={{ color: '#71717a' }}>No persisted sessions yet.</p>}</div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1.25rem' }}><h2 style={{ marginTop: 0 }}>Create practice session</h2><form onSubmit={createSession} style={{ display: 'grid', gap: '.7rem' }}><input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Session title" style={{ padding: '.75rem', border: '1px solid #d4d4d8' }} /><textarea required maxLength={2000} rows={4} value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Debate proposition" style={{ padding: '.75rem', border: '1px solid #d4d4d8' }} /><select value={form.assigned_position} onChange={e => setForm({ ...form, assigned_position: e.target.value })} style={{ padding: '.75rem', border: '1px solid #d4d4d8' }}><option>Affirmative</option><option>Negative</option><option>Neutral</option></select><button disabled={creating} className="btn btn-red" style={{ border: 0, padding: '.8rem', cursor: 'pointer' }}>{creating ? 'CREATING…' : 'CREATE SESSION'}</button></form></div>
          </section>
          <section style={{ marginTop: '1rem', background: '#111827', color: '#fff', padding: '1.25rem' }}><div className="font-mono text-red" style={{ fontSize: '.7rem' }}>COACHING ENGINE</div><h2 style={{ margin: '.4rem 0' }}>{learner.average_overall_score ? 'Personalized coaching plan' : 'Start your baseline assessment'}</h2><p style={{ color: '#d4d4d8', maxWidth: '760px' }}>{(learner.recommended_exercises || []).join(' ') || 'Complete a debate and presentation analysis to generate personalized recommendations.'}</p></section>
        </>}
        {tab === 'history' && <section style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1.25rem' }}><h2>Complete practice history</h2>{sessions.map(item => <div key={item.id} style={{ borderTop: '1px solid #f1f1f4', padding: '.8rem 0' }}><strong>{item.title}</strong><div>{item.topic}</div><small>{item.status} · {item.format}</small></div>)}</section>}
        {tab === 'settings' && <section style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1.25rem' }}><h2>Profile settings</h2><form onSubmit={saveProfile} style={{ display: 'grid', gap: '.7rem', maxWidth: '720px' }}>{[['full_name', 'Full name'], ['preferred_topics', 'Preferred topics'], ['learning_goals', 'Learning goals'], ['coaching_preferences', 'Coaching preferences']].map(([key, label]) => <label key={key} style={{ display: 'grid', gap: '.3rem', fontWeight: 700 }}>{label}<input value={profileForm[key]} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} style={{ padding: '.75rem', border: '1px solid #d4d4d8', fontWeight: 400 }} /></label>)}<button disabled={savingProfile} className="btn btn-red" style={{ width: 'fit-content', border: 0, cursor: 'pointer' }}>{savingProfile ? 'SAVING…' : 'SAVE PROFILE'}</button></form>{feedback.length > 0 && <><h3>Latest coach feedback</h3><p>{feedback[0].content}</p></>}</section>}
      </>}

      {staff && <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
        {user.role === 'Debate Coach' && <><Stat label="Learners" value={staff.assigned_students_count} /><Stat label="Pending evaluations" value={staff.pending_evaluations} /><Stat label="Skill gaps" value={staff.class_skill_gaps?.length || 0} /></>}
        {user.role === 'Educator' && <><Stat label="Active classes" value={staff.active_classes} /><Stat label="Enrolled learners" value={staff.total_enrolled_students} /><Stat label="Class average" value={`${staff.average_class_score}%`} /></>}
        {user.role === 'Administrator' && <><Stat label="Platform users" value={staff.platform_users_total} /><Stat label="Total sessions" value={staff.sessions_total} /><Stat label="Completed sessions" value={staff.completed_sessions_total} /><Stat label="AI provider" value={staff.llm_api_health} /></>}
        {user.role === 'Administrator' && <div style={{ gridColumn: '1 / -1', background: '#fff', border: '1px solid #e5e7eb', padding: '1.25rem' }}><h2>User role management</h2><p style={{ color: '#71717a' }}>Only administrators can change roles. Your own administrator role cannot be demoted.</p>{adminUsers.map(item => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px', gap: '1rem', alignItems: 'center', borderTop: '1px solid #f1f1f4', padding: '.75rem 0' }}><div><strong>{item.full_name}</strong><div style={{ color: '#71717a', fontSize: '.8rem' }}>{item.email}{item.id === user.user_id ? ' · You' : ''}</div></div><select value={item.role} disabled={item.id === user.user_id} onChange={event => changeUserRole(item.id, event.target.value)} style={{ padding: '.55rem', border: '1px solid #d4d4d8', background: item.id === user.user_id ? '#f4f4f5' : '#fff' }}><option>Learner</option><option>Debate Coach</option><option>Educator</option><option>Administrator</option></select></div>)}</div>}
        <div style={{ gridColumn: '1 / -1', background: '#fff', border: '1px solid #e5e7eb', padding: '1.25rem' }}><h2>Operational detail</h2><pre style={{ whiteSpace: 'pre-wrap', color: '#52525b', fontFamily: 'inherit' }}>{JSON.stringify(staff, null, 2)}</pre></div>
      </section>}
    </main>
  </>;
}
