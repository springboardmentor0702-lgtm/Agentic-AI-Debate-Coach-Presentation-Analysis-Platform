"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview'); // overview, skills, debates, presentations, settings
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learnerDashboard, setLearnerDashboard] = useState(null);
  const [roleDashboard, setRoleDashboard] = useState(null);

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [experience, setExperience] = useState('Intermediate');
  const [topics, setTopics] = useState('AI, Technology, Politics');
  const [domains, setDomains] = useState('Public Speaking, Keynotes');
  const [goals, setGoals] = useState('Reduce filler words, Master counterarguments');
  const [coaching, setCoaching] = useState('Real-time alerts, Detailed post-session audits');
  
  const [profileMsg, setProfileMsg] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [debateHistory, setDebateHistory] = useState([]);
  const [coachDashboard, setCoachDashboard] = useState(null);

  const [presentationHistory, setPresentationHistory] = useState([]);

  // Skill Metrics Matrix
  const [skillsMatrix, setSkillsMatrix] = useState([
    { name: 'Logical Consistency', value: 88, color: '#D90429', description: 'Ability to avoid fallacy traps (e.g. straw man, ad hominem) under cross-examination.' },
    { name: 'Argument Construction', value: 84, color: '#111827', description: 'Evidence strength, claim isolation, and structural reasoning relevance.' },
    { name: 'Vocal Clarity & Cadence', value: 80, color: '#4B5563', description: 'Pacing precision (target: 130-150 WPM) and voice modulation.' },
    { name: 'Filler Word Control', value: 92, color: '#10B981', description: 'Minimal use of vocal pauses (e.g. "um", "uh", "you know").' },
    { name: 'Rebuttal Effectiveness', value: 78, color: '#3B82F6', description: 'Addressing critical challenges using 5-type argument strategies.' }
  ]);

  useEffect(() => {
    const savedToken = localStorage.getItem('logos_ai_jwt');
    if (!savedToken) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(savedToken.split('.')[1]));
      setUserRole(payload.role);
      setUserId(payload.user_id);
      setUserEmail(payload.sub);
      
      fetchProfile(savedToken);
      fetchDebateHistory(savedToken, payload.role);
      if (payload.role === 'Learner' && payload.user_id) {
        fetchLearnerDashboard(payload.user_id, savedToken);
        fetchPresentationHistory(savedToken);
      }
      if (payload.role === 'Debate Coach' && payload.user_id) {
        fetchCoachDashboard(payload.user_id, savedToken);
      }
      if (payload.role === 'Educator' && payload.user_id) {
        fetchRoleDashboard(`educator/${payload.user_id}`, savedToken);
      }
      if (payload.role === 'Administrator') {
        fetchRoleDashboard('admin', savedToken);
      }
    } catch (e) {
      localStorage.removeItem('logos_ai_jwt');
      router.push('/login');
    }
  }, []);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/profile/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFullName(data.full_name);
        setUserName(data.full_name);
        setExperience(data.experience_level);
        setTopics(data.preferred_topics);
        setDomains(data.presentation_domains);
        setGoals(data.learning_goals);
        setCoaching(data.coaching_preferences);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchDebateHistory = async (token, role) => {
    try {
      const endpoint = role === 'Administrator'
        ? 'http://localhost:8000/api/v1/sessions/admin/all'
        : role === 'Debate Coach'
          ? 'http://localhost:8000/api/v1/sessions/coach/all'
          : 'http://localhost:8000/api/v1/sessions/mine';
      const res = await fetch(endpoint, { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) throw new Error('Could not load debate history.');
      const sessions = await res.json();
      setDebateHistory(sessions.map((session) => ({
        id: session.id,
        topic: session.topic,
        format: session.format,
        position: session.assigned_position,
        status: session.status,
        date: new Date(session.created_at).toLocaleDateString(),
        userName: session.user_name || userName || 'You'
      })));
    } catch (err) {
      setDebateHistory([]);
    }
  };

  const fetchLearnerDashboard = async (learnerId, token) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/dashboards/learner/${learnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load learner dashboard.');
      const dashboard = await res.json();
      setLearnerDashboard(dashboard);
      if (dashboard.skill_metrics) setSkillsMatrix(dashboard.skill_metrics);
    } catch (err) {
      setLearnerDashboard(null);
    }
  };

  const fetchPresentationHistory = async (token) => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/presentation-analysis/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load presentation history.');
      const history = await res.json();
      setPresentationHistory(history.map((item) => ({
        id: item.session_id,
        title: `Presentation Session ${item.session_id}`,
        duration: 'Recorded',
        wpm: item.speech_pace_wpm,
        fillerWords: item.filler_words_count,
        confidence: `${item.confidence_score}%`,
        clarity: `${item.clarity_score}%`
      })));
    } catch (err) {
      setPresentationHistory([]);
    }
  };

  const fetchCoachDashboard = async (coachId, token) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/dashboards/coach/${coachId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load coach dashboard.');
      setCoachDashboard(await res.json());
    } catch (err) {
      setCoachDashboard(null);
    }
  };

  const fetchRoleDashboard = async (path, token) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/dashboards/${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load role dashboard.');
      setRoleDashboard(await res.json());
    } catch (err) {
      setRoleDashboard(null);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setProfileMsg(null);
    const token = localStorage.getItem('logos_ai_jwt');
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/auth/profile/me?full_name=${encodeURIComponent(fullName)}&experience_level=${encodeURIComponent(experience)}&preferred_topics=${encodeURIComponent(topics)}&presentation_domains=${encodeURIComponent(domains)}&learning_goals=${encodeURIComponent(goals)}&coaching_preferences=${encodeURIComponent(coaching)}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserName(data.full_name);
        setProfileMsg({ type: 'success', text: 'Profile & Skills successfully saved to database!' });
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Failed to update user profile.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('logos_ai_jwt');
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.1em' }} className="animate-pulse">
          SYNCHRONIZING SECURE PROFILE MATRIX...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '90vh', background: '#FAFAFA', padding: '3rem 2rem', fontFamily: "'Inter', sans-serif", color: '#111827' }}>
      
      {/* Dynamic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-block', background: userRole === 'Debate Coach' ? '#E0F2FE' : '#FEE2E2', color: userRole === 'Debate Coach' ? '#0369A1' : '#D90429', fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            {userRole === 'Debate Coach' ? 'COACH OPERATIONS' : `${userRole} PROFILE SPACE`}
          </div>
          <h1 className="font-display" style={{ fontSize: '2.25rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
            {userRole === 'Debate Coach' ? `Coach Workspace, ${userName}` : `Welcome Back, ${userName}`}
          </h1>
        </div>

        <button onClick={handleLogout} className="btn btn-login" style={{ padding: '0.6rem 1.4rem', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>
          LOGOUT SESSION
        </button>
      </div>

      {/* Modern Horizontal Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '6px', marginBottom: '2.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {(userRole === 'Debate Coach' ? [
          { id: 'overview', label: 'Coach Overview' },
          { id: 'learners', label: 'Learner Roster' },
          { id: 'skill-gaps', label: 'Skill Gaps' },
          { id: 'debates', label: 'Review Sessions' },
          { id: 'settings', label: 'Coach Profile' }
        ] : userRole === 'Educator' ? [
          { id: 'overview', label: 'Class Overview' },
          { id: 'debates', label: 'Class Sessions' },
          { id: 'settings', label: 'Educator Profile' }
        ] : userRole === 'Administrator' ? [
          { id: 'overview', label: 'System Overview' },
          { id: 'debates', label: 'All Sessions' },
          { id: 'settings', label: 'Admin Profile' }
        ] : [
          { id: 'overview', label: 'Dashboard Overview' },
          { id: 'skills', label: 'Communication Skill Matrix' },
          { id: 'debates', label: 'Debate History Log' },
          { id: 'presentations', label: 'Presentation Archive' },
          { id: 'settings', label: 'Profile Settings' }
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setProfileMsg(null); }}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === tab.id ? '#111827' : 'transparent',
              color: activeTab === tab.id ? '#FFF' : '#4B5563',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==============================================
          TAB CONTENT 1: DASHBOARD OVERVIEW
         ============================================== */}
      {activeTab === 'overview' && userRole === 'Learner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DEBATES COMPLETED</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#111827', margin: '0.5rem 0 0.2rem 0' }}>{learnerDashboard?.total_debates_completed ?? '—'}</div>
              <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 500 }}>Recorded debate sessions</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AVG PERFORMANCE SCORE</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#D90429', margin: '0.5rem 0 0.2rem 0' }}>{learnerDashboard?.average_overall_score ?? '—'}</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Average weighted performance score</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ORAL PRESENTATION TIME</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#111827', margin: '0.5rem 0 0.2rem 0' }}>{learnerDashboard?.recent_performance_trend?.length ?? 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Recent scored sessions</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>COACHING LEVEL</div>
              <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981', margin: '0.7rem 0 0.4rem 0', textTransform: 'uppercase' }}>{experience}</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Analytical coaching type</div>
            </div>
          </div>

          {/* Quick Action Center */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ background: '#FFF', padding: '2rem', borderRadius: '20px', border: '1px solid #E5E7EB' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Active Training Options</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => router.push("/simulation")} className="btn btn-red" style={{ padding: '0.85rem 1.5rem', borderRadius: '8px' }}>Launch AI Debate Simulation</button>
                <button onClick={() => router.push("/presentation")} className="btn btn-dark" style={{ padding: '0.85rem 1.5rem', borderRadius: '8px' }}>Start Presentation Analysis</button>
              </div>
            </div>

            <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', color: '#D90429', margin: '0 0 1rem 0' }}>CURRENT LEARNING GOALS</h4>
              <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
                {goals}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>COACHING PREFERENCE:</span>
                <span style={{ fontSize: '0.75rem', color: '#E5E7EB' }}>{coaching}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && userRole === 'Debate Coach' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: '#0F172A', color: '#FFF', padding: '2.25rem', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div className="font-mono" style={{ color: '#38BDF8', fontSize: '0.75rem', marginBottom: '0.75rem' }}>COACH CONTROL CENTER / LIVE</div>
              <h2 className="font-display" style={{ fontSize: '2rem', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Guide better arguments.</h2>
              <p style={{ color: '#CBD5E1', maxWidth: '620px', margin: 0 }}>Review learner evidence, identify recurring reasoning gaps, and turn debate sessions into focused coaching actions.</p>
            </div>
            <button onClick={() => setActiveTab('learners')} className="btn btn-red">REVIEW LEARNERS</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem' }}>
            {[
              { label: 'ASSIGNED LEARNERS', value: coachDashboard?.assigned_students_count ?? '—', detail: 'Learner accounts in your cohort', color: '#0369A1' },
              { label: 'PENDING REVIEWS', value: coachDashboard?.pending_evaluations ?? '—', detail: 'Active sessions needing attention', color: '#D90429' },
              { label: 'TOP PERFORMERS', value: coachDashboard?.top_performers?.length ?? '—', detail: 'Learners with recorded scores', color: '#059669' },
              { label: 'SKILL GAPS', value: coachDashboard?.class_skill_gaps?.length ?? '—', detail: 'Recurring issues across learners', color: '#7C3AED' }
            ].map((metric) => (
              <div key={metric.label} style={{ background: '#FFF', border: '1px solid #E5E7EB', borderTop: `4px solid ${metric.color}`, padding: '1.5rem', borderRadius: '12px' }}>
                <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em' }}>{metric.label}</div>
                <div className="font-display" style={{ color: metric.color, fontSize: '2.3rem', fontWeight: 900, margin: '0.35rem 0' }}>{metric.value}</div>
                <div style={{ color: '#64748B', fontSize: '0.78rem' }}>{metric.detail}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '1.75rem', borderRadius: '14px' }}>
              <h3 className="font-display" style={{ textTransform: 'uppercase', marginBottom: '1rem' }}>Top performers</h3>
              {(coachDashboard?.top_performers || ['No learner scores yet']).map((name, index) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: index < (coachDashboard?.top_performers?.length || 1) - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <span style={{ fontWeight: 600 }}>{index + 1}. {name}</span>
                  <span style={{ color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}>PERFORMING WELL</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '1.75rem', borderRadius: '14px' }}>
              <h3 className="font-display" style={{ textTransform: 'uppercase', marginBottom: '1rem' }}>Priority skill gaps</h3>
              {(coachDashboard?.class_skill_gaps || ['No recurring gaps detected']).map((gap) => (
                <div key={gap} style={{ display: 'inline-block', margin: '0 0.5rem 0.5rem 0', padding: '0.55rem 0.75rem', borderRadius: '6px', background: '#FEF2F2', color: '#B91C1C', fontSize: '0.8rem', fontWeight: 700 }}>{gap}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && userRole === 'Educator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: '#164E63', color: '#FFF', padding: '2.25rem', borderRadius: '18px' }}><div className="font-mono" style={{ color: '#A5F3FC', fontSize: '0.75rem' }}>EDUCATOR ANALYTICS</div><h2 className="font-display" style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.7rem 0' }}>See the class clearly.</h2><p style={{ color: '#CFFAFE', margin: 0 }}>Track enrollment, class performance, and assigned topics in one teaching workspace.</p></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[['ACTIVE CLASSES', roleDashboard?.active_classes], ['ENROLLED LEARNERS', roleDashboard?.total_enrolled_students], ['AVERAGE CLASS SCORE', roleDashboard?.average_class_score], ['TOPICS ASSIGNED', roleDashboard?.debate_topics_assigned?.length]].map(([label, value]) => <div key={label} style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '1.5rem', borderTop: '4px solid #0891B2' }}><div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700 }}>{label}</div><div className="font-display" style={{ fontSize: '2.3rem', fontWeight: 900, color: '#0E7490', marginTop: '0.4rem' }}>{value ?? '—'}</div></div>)}
          </div>
        </div>
      )}

      {activeTab === 'overview' && userRole === 'Administrator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: '#18181B', color: '#FFF', padding: '2.25rem', borderRadius: '18px' }}><div className="font-mono" style={{ color: '#FCA5A5', fontSize: '0.75rem' }}>SYSTEM OPERATIONS</div><h2 className="font-display" style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.7rem 0' }}>Platform control room.</h2><p style={{ color: '#D4D4D8', margin: 0 }}>Monitor users, sessions, AI agents, and service health from the administrator workspace.</p></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[['TOTAL USERS', roleDashboard?.platform_users_total], ['LEARNERS', roleDashboard?.learners_total], ['COACHES', roleDashboard?.coaches_total], ['DEBATE SESSIONS', roleDashboard?.sessions_total], ['AI AGENTS', roleDashboard?.active_ai_agents], ['API HEALTH', roleDashboard?.llm_api_health]].map(([label, value]) => <div key={label} style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '1.5rem', borderTop: '4px solid #D90429' }}><div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700 }}>{label}</div><div className="font-display" style={{ fontSize: '1.8rem', fontWeight: 900, color: '#18181B', marginTop: '0.4rem' }}>{value ?? '—'}</div></div>)}
          </div>
        </div>
      )}

      {activeTab === 'learners' && userRole === 'Debate Coach' && (
        <div style={{ background: '#FFF', padding: '2rem', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Learner Roster</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Monitor debate volume and average performance before opening a coaching review.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead><tr style={{ borderBottom: '1px solid #E5E7EB', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}><th style={{ padding: '0.9rem 0.5rem' }}>LEARNER</th><th>EMAIL</th><th>DEBATES</th><th>AVERAGE SCORE</th><th>ACTION</th></tr></thead>
              <tbody>
                {(coachDashboard?.learner_roster || []).map((learner) => (
                  <tr key={learner.id} style={{ borderBottom: '1px solid #F1F5F9' }}><td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{learner.name}</td><td style={{ color: '#64748B' }}>{learner.email}</td><td>{learner.debates_completed}</td><td style={{ fontWeight: 700, color: learner.average_score >= 70 ? '#059669' : '#D90429' }}>{learner.average_score || '—'}</td><td><button onClick={() => setActiveTab('debates')} className="btn btn-login" style={{ padding: '0.45rem 0.7rem', fontSize: '0.7rem' }}>REVIEW SESSIONS</button></td></tr>
                ))}
                {(!coachDashboard?.learner_roster || coachDashboard.learner_roster.length === 0) && <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>No learners are available yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'skill-gaps' && userRole === 'Debate Coach' && (
        <div style={{ background: '#FFF', padding: '2rem', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Cohort Skill Gaps</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1.75rem' }}>Use recurring fallacies as the agenda for your next coaching cycle.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {(coachDashboard?.class_skill_gaps || ['No recurring skill gaps yet']).map((gap, index) => (
              <div key={gap} style={{ padding: '1.25rem', border: '1px solid #FECACA', background: '#FFF7F7', borderRadius: '10px' }}><div className="font-mono" style={{ color: '#D90429', fontSize: '0.72rem' }}>PRIORITY 0{index + 1}</div><strong style={{ display: 'block', margin: '0.6rem 0' }}>{gap}</strong><span style={{ color: '#64748B', fontSize: '0.8rem' }}>Review examples and assign a targeted rebuttal exercise.</span></div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================
          TAB CONTENT 2: SKILL MATRIX & TRACKING
         ============================================== */}
      {activeTab === 'skills' && (
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
            Rhetorical Skill Matrix
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
            Dynamic communication capabilities generated from AI logic audits, fallacy check logs, and voice pace logs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {skillsMatrix.map((skill, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{skill.name}</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>{skill.description}</span>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: skill.color }}>{skill.value}%</span>
                </div>
                {/* Bar */}
                <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${skill.value}%`, height: '100%', background: skill.color, borderRadius: '4px', transition: 'width 1s ease-in-out' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================
          TAB CONTENT 3: DEBATE HISTORY LOG
         ============================================== */}
      {activeTab === 'debates' && (
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Debate History Management
          </h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>SESSION TOPIC</th>
                  {(userRole === 'Administrator' || userRole === 'Debate Coach') && <th>USER</th>}
                  <th>FORMAT</th>
                  <th>POSITION</th>
                  <th>SCORE</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {debateHistory.map((debate) => (
                  <tr key={debate.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1.2rem 0.5rem', fontWeight: 600 }}>{debate.topic}</td>
                    {(userRole === 'Administrator' || userRole === 'Debate Coach') && <td>{debate.userName}</td>}
                    <td>{debate.format}</td>
                    <td>{debate.position}</td>
                    <td style={{ fontWeight: 'bold', color: '#6B7280' }}>{debate.score ?? '—'}</td>
                    <td>
                      <span style={{ background: '#ECFDF5', color: '#059669', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {debate.status}
                      </span>
                    </td>
                    <td style={{ color: '#6B7280' }}>{debate.date}</td>
                  </tr>
                ))}
                {debateHistory.length === 0 && (
                  <tr>
                    <td colSpan={(userRole === 'Administrator' || userRole === 'Debate Coach') ? 7 : 6} style={{ padding: '2rem 0.5rem', textAlign: 'center', color: '#6B7280' }}>
                      No debate sessions have been recorded yet. Start a simulation to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================
          TAB CONTENT 4: PRESENTATION ARCHIVE
         ============================================== */}
      {activeTab === 'presentations' && (
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Presentation History Archive
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>SPEECH KEYNOTE TITLE</th>
                  <th>DURATION</th>
                  <th>PACING (WPM)</th>
                  <th>FILLER WORDS</th>
                  <th>CONFIDENCE</th>
                  <th>CLARITY</th>
                </tr>
              </thead>
              <tbody>
                {presentationHistory.map((pres) => (
                  <tr key={pres.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '1.2rem 0.5rem', fontWeight: 600 }}>{pres.title}</td>
                    <td>{pres.duration}</td>
                    <td style={{ fontWeight: 600 }}>{pres.wpm} WPM</td>
                    <td style={{ color: pres.fillerWords > 5 ? '#D90429' : '#10B981', fontWeight: 600 }}>{pres.fillerWords} count</td>
                    <td style={{ fontWeight: 600 }}>{pres.confidence}</td>
                    <td>{pres.clarity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================
          TAB CONTENT 5: PROFILE SETTINGS
         ============================================== */}
      {activeTab === 'settings' && (
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
            User Information & Profile Settings
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Manage experience limits, coaching details, target debate topics, and presentation domains stored inside your PostgreSQL system.
          </p>

          {profileMsg && (
            <div style={{ padding: '0.85rem 1.2rem', marginBottom: '1.5rem', borderRadius: '10px', fontSize: '0.875rem', background: profileMsg.type === 'error' ? '#FEF2F2' : '#ECFDF5', color: profileMsg.type === 'error' ? '#DC2626' : '#059669', border: `1px solid ${profileMsg.type === 'error' ? '#FCA5A5' : '#6EE7B7'}` }}>
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
              
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none' }}
                />
              </div>

              {/* Experience Level */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Experience Level</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF' }}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Preferred Debate Topics */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Preferred Debate Topics</label>
                <input
                  type="text"
                  required
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none' }}
                />
              </div>

              {/* Presentation Domains */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Presentation Domains</label>
                <input
                  type="text"
                  required
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none' }}
                />
              </div>
            </div>

            {/* Learning Goals */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Learning Goals</label>
              <input
                type="text"
                required
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none' }}
              />
            </div>

            {/* Coaching Preferences */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Coaching Preferences</label>
              <input
                type="text"
                required
                value={coaching}
                onChange={(e) => setCoaching(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB', outline: 'none' }}
              />
            </div>

            {/* Save Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => fetchProfile(localStorage.getItem('logos_ai_jwt'))}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset Details
              </button>
              <button
                type="submit"
                disabled={updating}
                style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', background: '#111827', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
              >
                {updating ? 'Saving...' : 'Save Profile Matrix'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
