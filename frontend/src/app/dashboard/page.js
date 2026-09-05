"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthModal from '../../components/AuthModal';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview'); // overview, skills, debates, presentations, settings
  const [userRole, setUserRole] = useState('Learner');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [experience, setExperience] = useState('Intermediate');
  const [topics, setTopics] = useState('AI, Technology, Politics');
  const [domains, setDomains] = useState('Public Speaking, Keynotes');
  const [goals, setGoals] = useState('Reduce filler words, Master counterarguments');
  const [coaching, setCoaching] = useState('Real-time alerts, Detailed post-session audits');
  
  const [profileMsg, setProfileMsg] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Dynamic Coaching States
  const [skillGapSummary, setSkillGapSummary] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [pathSteps, setPathSteps] = useState([]);
  const [progressStatus, setProgressStatus] = useState('');

  // Persistent Datasets fetched directly from PostgreSQL
  const [debateHistory, setDebateHistory] = useState([]);
  const [presentationHistory, setPresentationHistory] = useState([]);

  // Coach Dashboard States
  const [coachOverview, setCoachOverview] = useState({
    assigned_students: 0,
    class_performance_average: 85.0,
    pending_evaluations: 0,
    system_status: '100% ONLINE',
    top_class_pain_points: []
  });
  const [coachStudents, setCoachStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [coachFeedbackInput, setCoachFeedbackInput] = useState('');
  const [coachSuccessMsg, setCoachSuccessMsg] = useState('');

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('logos_ai_jwt') : null;
    if (!savedToken) {
      setIsAuthModalOpen(true);
      setUserName('Guest User');
      setUserEmail('guest@logos.ai');
      setLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(savedToken.split('.')[1]));
      setUserRole(payload.role || 'Learner');
      setUserEmail(payload.sub);
      
      fetchProfile(savedToken);
      fetchCoachingPlan();
      fetchDebateHistory(savedToken);
      fetchPresentationHistory(savedToken);
      fetchCoachData(savedToken);
    } catch (e) {
      localStorage.removeItem('logos_ai_jwt');
      setIsAuthModalOpen(true);
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/profile/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFullName(data.full_name || 'Debater');
        setUserName(data.full_name || 'Debater');
        setExperience(data.experience_level || 'Intermediate');
        setTopics(data.preferred_topics || 'Technology, AI, Policy');
        setDomains(data.presentation_domains || 'Public Speaking, Keynotes');
        setGoals(data.learning_goals || 'Reduce filler words, Master counterarguments');
        setCoaching(data.coaching_preferences || 'Real-time alerts');
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchCoachingPlan = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/coaching/plan/1");
      if (res.ok) {
        const data = await res.json();
        setSkillGapSummary(data.skill_gap_summary);
        setRecommendations(data.targeted_recommendations);
        setPathSteps(data.learning_path_steps);
        setProgressStatus(data.progress_status);
      }
    } catch (err) {
      setSkillGapSummary("Your metrics indicate solid progress. Focus on reducing filler words and logical fallacies.");
      setRecommendations(["Practice Logical Consistency", "Vocal Pacing drills", "Review fallacy shield guidelines."]);
      setPathSteps(["Speech Cadence (Active)", "Filler Word Mitigation (Active)", "Socratic Cross-examination (Upcoming)"]);
      setProgressStatus("Level 2 - Competent Debater");
    }
  };

  const fetchDebateHistory = async (token) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/sessions/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDebateHistory(data);
        }
      }
    } catch (err) {
      console.error("Failed to load debate history:", err);
    }
  };

  const fetchPresentationHistory = async (token) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/presentation-analysis/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPresentationHistory(data);
        }
      }
    } catch (err) {
      console.error("Failed to load presentation history:", err);
    }
  };

  const fetchCoachData = async (token) => {
    try {
      const [overviewRes, studentsRes] = await Promise.all([
        fetch("http://localhost:8000/api/v1/coaching/coach/overview", {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch("http://localhost:8000/api/v1/coaching/coach/students", {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);
      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        setCoachOverview(ovData);
      }
      if (studentsRes.ok) {
        const stData = await studentsRes.json();
        if (Array.isArray(stData)) {
          setCoachStudents(stData);
          if (stData.length > 0) {
            setSelectedStudentId((prev) => prev || stData[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load coach data:", err);
    }
  };

  // Compile unified recent activity (Top 3 most recent sessions)
  const unifiedRecentSessions = [
    ...debateHistory.map(d => ({
      id: `deb-${d.id}`,
      title: d.title || d.topic,
      topic: d.topic,
      format: d.format || d.session_type || 'Debate Session',
      type: d.session_type === 'Vocal Matrix' ? 'Vocal Matrix' : 'Debate',
      score: d.score || 85,
      date: d.date || 'Recent',
      created_at: d.created_at
    })),
    ...presentationHistory.filter(p => !debateHistory.some(d => d.id === p.session_id)).map(p => ({
      id: `pres-${p.id}`,
      title: p.title || 'Vocal Metrics Session',
      topic: p.topic || 'Speech Prosody Evaluation',
      format: 'Vocal Matrix',
      type: 'Vocal Matrix',
      score: p.overall_score || Math.round(p.confidence_score * 0.5 + p.clarity_score * 0.5),
      date: p.date || 'Recent',
      created_at: p.created_at
    }))
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const top3Recent = unifiedRecentSessions.slice(0, 3);

  // Dynamic calculations
  const totalDebates = debateHistory.filter(d => d.session_type !== 'Vocal Matrix').length;
  const totalVocalSessions = presentationHistory.length;
  const avgScore = unifiedRecentSessions.length > 0 
    ? Math.round((unifiedRecentSessions.reduce((acc, curr) => acc + (parseFloat(curr.score) || 85), 0) / unifiedRecentSessions.length) * 10) / 10 
    : 86.5;

  const latestVocal = presentationHistory[0];
  const currentPace = latestVocal ? `${latestVocal.wpm} WPM` : '142 WPM';

  // Skill Metrics Matrix
  const skillsMatrix = [
    { name: 'Logical Consistency', value: Math.min(98, Math.max(75, Math.round(avgScore * 1.02))), color: '#D90429', description: 'Ability to avoid fallacy traps under cross-examination.' },
    { name: 'Argument Construction', value: Math.min(96, Math.max(70, Math.round(avgScore * 0.98))), color: '#111827', description: 'Evidence strength, claim isolation, and structural reasoning relevance.' },
    { name: 'Vocal Clarity & Cadence', value: latestVocal ? Math.round(latestVocal.clarity_score) : 80, color: '#4B5563', description: 'Pacing precision (target: 130-150 WPM) and voice modulation.' },
    { name: 'Filler Word Control', value: latestVocal ? Math.max(60, 100 - latestVocal.filler_words_count * 6) : 92, color: '#10B981', description: 'Minimal use of vocal pauses (e.g. "um", "uh", "you know").' },
    { name: 'Rebuttal Effectiveness', value: Math.min(95, Math.max(68, Math.round(avgScore * 0.95))), color: '#3B82F6', description: 'Addressing critical challenges using structured counterargument strategies.' }
  ];

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
        setUserName(fullName);
        setProfileMsg({ type: 'success', text: 'User profile metrics successfully updated in PostgreSQL database.' });
        fetchCoachingPlan(); // Refresh coaching recommendations based on updated profile
      } else {
        setProfileMsg({ type: 'error', text: 'Error updating profile. Please verify authorization.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Failed to connect to API backend.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleSendCoachFeedback = async (e) => {
    e.preventDefault();
    if (!coachFeedbackInput.trim() || !selectedStudentId) return;
    const token = localStorage.getItem('logos_ai_jwt');
    try {
      const res = await fetch("http://localhost:8000/api/v1/coaching/coach/feedback", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          student_id: parseInt(selectedStudentId),
          feedback: coachFeedbackInput
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCoachSuccessMsg(data.message || "Coaching recommendation dispatched to student dashboard!");
        setCoachFeedbackInput('');
        setTimeout(() => setCoachSuccessMsg(''), 4000);
        fetchCoachData(token);
      } else {
        setCoachSuccessMsg("Failed to dispatch recommendation. Verify student selection.");
      }
    } catch (err) {
      setCoachSuccessMsg("Failed to connect to API backend.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('logos_ai_jwt');
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-pulse" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-red)' }}>DECRYPTING DATA MATRIX...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container" style={{ paddingTop: '2.5rem', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Dashboard Brand Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'inline-block', background: '#FEE2E2', color: '#D90429', fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 0, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            ROUTER SESSION ACTIVE // ROLE: {userRole.toUpperCase()}
          </div>
          <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.1' }}>
            Welcome, {userName || 'User'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Account email: {userEmail}</p>
        </div>
        <button onClick={handleLogout} className="btn btn-login" style={{ padding: '0.6rem 1.4rem', fontSize: '0.8rem', borderRadius: 0, border: '1px solid #E5E7EB', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>
          LOGOUT
        </button>
      </div>

      {/* Tab Select Bar for Learner role, or general view */}
      {userRole === 'Learner' && (
        <div style={{ display: 'flex', gap: '0.5rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0, padding: '6px', marginBottom: '2.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {[
            { id: 'overview', label: 'OVERVIEW & SUMMARY' },
            { id: 'debates', label: `DEBATE HISTORY (${totalDebates})` },
            { id: 'presentations', label: `VOCAL MATRIX ARCHIVE (${totalVocalSessions})` },
            { id: 'settings', label: 'PROFILE SETTINGS' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: activeTab === tab.id ? '#111827' : 'transparent',
                color: activeTab === tab.id ? '#FFF' : '#4B5563',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 0,
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. LEARNER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {userRole === 'Learner' && (
        <div>
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div>
              {/* Quick statistics cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>DEBATES COMPLETED</div>
                  <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{totalDebates}</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>VOCAL MATRIX SESSIONS</div>
                  <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{totalVocalSessions}</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>AVG OVERALL SCORE</div>
                  <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{avgScore}%</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>LATEST SPEAKING PACE</div>
                  <div className="font-display" style={{ fontSize: '2rem', fontWeight: '900' }}>{currentPace}</div>
                </div>
              </div>

              {/* 3 Most Recent Entries Summary Card */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2rem', marginBottom: '2.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                      Recent Completed Sessions (Latest 3)
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0.2rem 0 0' }}>
                      Summary of your most recent debate and vocal matrix practice sessions saved in the database.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab(totalDebates > 0 ? 'debates' : 'presentations')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-red)',
                      fontWeight: 700,
                      fontSize: '0.825rem',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    VIEW FULL HISTORY ({unifiedRecentSessions.length} SESSIONS) →
                  </button>
                </div>

                {top3Recent.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Session Topic / Title</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Format / Type</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Performance Score</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Date Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top3Recent.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '1rem', fontWeight: 600 }}>{s.topic || s.title}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: s.type === 'Vocal Matrix' ? '#FEF2F2' : '#F0FDF4',
                                color: s.type === 'Vocal Matrix' ? '#DC2626' : '#166534',
                                border: `1px solid ${s.type === 'Vocal Matrix' ? '#FECACA' : '#BBF7D0'}`
                              }}>
                                {s.format}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                              {s.score}%
                            </td>
                            <td style={{ padding: '1rem', color: '#6B7280' }}>{s.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', background: '#FAFAFC', border: '1px dashed #E5E7EB' }}>
                    No completed sessions found yet. Start a simulation or record in the Vocal Matrix studio to see your metrics!
                  </div>
                )}
              </div>

              {/* Main Content Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
                {/* Left Side: Skill matrix */}
                <div style={{ background: '#FFF', padding: '2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
                  <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Rhetorical Skill Matrix</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {skillsMatrix.map((skill, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                          <span style={{ color: '#111827' }}>{skill.name}</span>
                          <span style={{ color: skill.color }}>{skill.value}%</span>
                        </div>
                        {/* Bar */}
                        <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: 0, overflow: 'hidden' }}>
                          <div style={{ width: `${skill.value}%`, height: '100%', background: skill.color, borderRadius: 0, transition: 'width 1s ease-in-out' }}></div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: '1.4' }}>{skill.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Coaching Engine Insights & Suggestions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Coaching Plan Summary */}
                  <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: 0 }}>
                    <div className="font-mono text-red" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>COACHING ENGINE INSIGHTS</div>
                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Active Plan: {progressStatus}</h3>
                    <p style={{ fontSize: '0.88rem', color: '#ccc', lineHeight: '1.5', marginBottom: '1.5rem' }}>{skillGapSummary}</p>
                    
                    <div className="font-mono text-red" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>ACTIVE LEARNING STEP</div>
                    <div style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 600 }}>{pathSteps[0]}</div>
                  </div>

                  {/* Recommendations Exercise list */}
                  <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                    <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Recommended Practice drills</h4>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', color: '#4B5563', lineHeight: '1.4' }}>
                      {recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Tab 2: Debate History */}
          {activeTab === 'debates' && (
            <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                    Complete Debate History & Practice Log
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.25rem 0 0' }}>
                    All completed parliamentary, Oxford, and AI agent simulation debate sessions stored in PostgreSQL.
                  </p>
                </div>
                <Link href="/simulation" className="btn btn-red" style={{ padding: '0.6rem 1.25rem', fontSize: '0.825rem' }}>
                  + START NEW DEBATE
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Topic</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Format</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Position</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Performance Score</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Date Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debateHistory.length > 0 ? (
                      debateHistory.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{d.topic || d.title}</td>
                          <td style={{ padding: '1rem' }}>{d.format}</td>
                          <td style={{ padding: '1rem' }}>{d.position}</td>
                          <td style={{ padding: '1rem', color: 'var(--accent-red)', fontWeight: 700 }}>{d.score}%</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ background: '#ECFDF5', color: '#059669', padding: '0.25rem 0.6rem', borderRadius: 0, fontSize: '0.75rem', fontWeight: 700 }}>
                              {d.status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: '#6B7280' }}>{d.date}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF' }}>
                          No debate sessions recorded yet. Launch the simulation to record your first debate!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Presentation History */}
          {activeTab === 'presentations' && (
            <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                    Complete Vocal Matrix & Speech Prosody Archive
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.25rem 0 0' }}>
                    Every recorded presentation, speaking pace metric, filler word count, and confidence rating preserved across sessions.
                  </p>
                </div>
                <Link href="/presentation" className="btn btn-red" style={{ padding: '0.6rem 1.25rem', fontSize: '0.825rem' }}>
                  + RECORD VOCAL MATRIX
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Speech Title / Topic</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Speaking Pace</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Filler Words</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Confidence</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Vocal Clarity</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Overall Score</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Date Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presentationHistory.length > 0 ? (
                      presentationHistory.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{p.topic || p.title}</td>
                          <td style={{ padding: '1rem' }}>{p.wpm} WPM</td>
                          <td style={{ padding: '1rem', color: p.filler_words_count > 2 ? '#D90429' : '#10B981', fontWeight: 600 }}>
                            {p.filler_words_count} fillers
                          </td>
                          <td style={{ padding: '1rem', color: '#059669', fontWeight: 700 }}>{p.confidence_score}%</td>
                          <td style={{ padding: '1rem' }}>{p.clarity_score}%</td>
                          <td style={{ padding: '1rem', color: 'var(--accent-red)', fontWeight: 700 }}>{p.overall_score || 85}%</td>
                          <td style={{ padding: '1rem', color: '#6B7280' }}>{p.date}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF' }}>
                          No Vocal Matrix sessions recorded yet. Open the Vocal Metrics studio to evaluate your first speech!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Profile Settings Form */}
          {activeTab === 'settings' && (
            <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Profile Settings & Experience Metrics</h3>
              
              {profileMsg && (
                <div style={{ padding: '0.85rem 1.2rem', marginBottom: '1.5rem', borderRadius: 0, fontSize: '0.875rem', background: profileMsg.type === 'error' ? '#FEF2F2' : '#ECFDF5', color: profileMsg.type === 'error' ? '#DC2626' : '#059669', border: `1px solid ${profileMsg.type === 'error' ? '#FCA5A5' : '#6EE7B7'}` }}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Experience Level</label>
                    <select
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', background: '#FFF' }}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Preferred Debate Topics</label>
                    <input 
                      type="text" 
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Presentation Domains</label>
                    <input 
                      type="text" 
                      value={domains}
                      onChange={(e) => setDomains(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Learning Goals</label>
                    <textarea 
                      rows={3}
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Coaching Style Preference</label>
                    <textarea 
                      rows={3}
                      value={coaching}
                      onChange={(e) => setCoaching(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" onClick={() => setActiveTab('overview')} style={{ padding: '0.75rem 1.5rem', borderRadius: 0, border: '1px solid #E5E7EB', background: '#FFF', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={updating} style={{ padding: '0.75rem 2rem', borderRadius: 0, border: 'none', background: '#111827', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}>
                    {updating ? 'Saving Metrics...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEBATE COACH DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {userRole === 'Debate Coach' && (
        <div>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ASSIGNED STUDENTS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{coachOverview.assigned_students}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>CLASS PERFORMANCE AVERAGE</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{coachOverview.class_performance_average}%</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>PENDING EVALUATIONS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{coachOverview.pending_evaluations}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>STATUS SYSTEM</div>
              <div className="font-display" style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10B981' }}>{coachOverview.system_status}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* Student Progress Monitoring */}
            <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Student Progress Monitoring</h3>
                <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{coachStudents.length} ENROLLED</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                      <th style={{ padding: '0.75rem' }}>Student Name</th>
                      <th style={{ padding: '0.75rem' }}>Active Debate / Session Topic</th>
                      <th style={{ padding: '0.75rem' }}>Sessions</th>
                      <th style={{ padding: '0.75rem' }}>Grade</th>
                      <th style={{ padding: '0.75rem' }}>Avg Score</th>
                      <th style={{ padding: '0.75rem' }}>Top Logic Gap / Metric</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coachStudents.length > 0 ? (
                      coachStudents.map((student) => (
                        <tr key={student.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{student.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{student.email}</div>
                          </td>
                          <td style={{ padding: '0.85rem', maxWidth: '200px' }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                              {student.topic}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{student.format}</span>
                          </td>
                          <td style={{ padding: '0.85rem', fontWeight: 600 }}>{student.total_sessions}</td>
                          <td style={{ padding: '0.85rem' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: student.grade.startsWith('A') ? '#ECFDF5' : student.grade.startsWith('B') ? '#EFF6FF' : '#FEF2F2',
                              color: student.grade.startsWith('A') ? '#059669' : student.grade.startsWith('B') ? '#2563EB' : '#DC2626'
                            }}>
                              {student.grade}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem', color: 'var(--accent-red)', fontWeight: 700 }}>
                            {student.score > 0 ? `${student.score}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.85rem' }}>
                            <span style={{ background: '#FEE2E2', color: '#D90429', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
                              {student.gap}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                          No students registered in the database yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar Skill Gaps and Recommendations Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: 0 }}>
                <div className="font-mono text-red" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>ROSTER SKILL GAP ANALYSIS</div>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Top Class Pain Points</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#ccc' }}>
                  {coachOverview.top_class_pain_points && coachOverview.top_class_pain_points.length > 0 ? (
                    coachOverview.top_class_pain_points.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))
                  ) : (
                    <>
                      <li>Logical consistency remains steady across recent debate transcripts.</li>
                      <li>Encourage speech recordings in Vocal Matrix studio to evaluate speaking cadence.</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Coaching feedback form */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Dispatch Coaching Recommendations</h4>
                {coachSuccessMsg && (
                  <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#059669', padding: '0.75rem', fontSize: '0.825rem', marginBottom: '1rem', fontWeight: 600 }}>
                    {coachSuccessMsg}
                  </div>
                )}
                <form onSubmit={handleSendCoachFeedback}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Select Student</label>
                    <select 
                      value={selectedStudentId} 
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E7EB', background: '#FFF', fontSize: '0.85rem' }}
                    >
                      {coachStudents.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Feedback / Recommendations</label>
                    <textarea 
                      rows={3} 
                      value={coachFeedbackInput}
                      onChange={(e) => setCoachFeedbackInput(e.target.value)}
                      placeholder="e.g. Work on pausing to reduce filler words. Aim for 140 WPM during rebuttal." 
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-red" style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Send Recommendations
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDUCATOR DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {userRole === 'Educator' && (
        <div>
          {/* Roster classroom statistics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ACTIVE CLASSES</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>1</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>TOTAL ENROLLED STUDENTS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{coachStudents.length}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>CLASS DEBATE AVERAGE</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{coachOverview.class_performance_average}%</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>PLATFORM STATUS</div>
              <div className="font-display text-red" style={{ fontSize: '1.6rem', fontWeight: '900' }}>100% ONLINE</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* Student Rankings */}
            <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Student Leaderboard Rankings</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Rank</th>
                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem' }}>Active Debate / Session</th>
                    <th style={{ padding: '0.75rem' }}>Total Sessions</th>
                    <th style={{ padding: '0.75rem' }}>Overall Score</th>
                  </tr>
                </thead>
                <tbody>
                  {coachStudents.length > 0 ? (
                    [...coachStudents].sort((a, b) => (b.score || 0) - (a.score || 0)).map((student, i) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '0.85rem', fontWeight: 700 }}>#{i + 1}</td>
                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ fontWeight: 600 }}>{student.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{student.email}</div>
                        </td>
                        <td style={{ padding: '0.85rem' }}>{student.topic}</td>
                        <td style={{ padding: '0.85rem', fontWeight: 600 }}>{student.total_sessions}</td>
                        <td style={{ padding: '0.85rem', color: 'var(--accent-red)', fontWeight: 700 }}>{student.score > 0 ? `${student.score}%` : 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                        No enrolled student metrics found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Reports Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Active Debate Motion Topics</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#ccc' }}>
                  <li>Autonomous AI systems legal liability standards</li>
                  <li>Space Exploration vs. Deep Ocean Funding Priorities</li>
                  <li>Universal Basic Income and Macroeconomic Stability</li>
                </ul>
              </div>

              {/* Assessment reports generator tool */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2.2rem 2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Classroom Reports Engine</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                  Export debate and presentation assessment audits as standardized CSV/PDF reports.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <Link href="/reports" className="btn btn-dark" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', textAlign: 'center' }}>
                    Open Assessment Reports Hub
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADMIN DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {userRole === 'Administrator' && (
        <div>
          {/* Admin Platform Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>TOTAL PLATFORM USERS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>1,420</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ACTIVE AI OPPO AGENTS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>8 Agents</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>LLM INFERENCE LATENCY</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>112ms</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>SYSTEM UPTIME</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>99.98%</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* User Management Panel */}
            <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>User Directory Access Control</h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>User Email</th>
                    <th style={{ padding: '0.75rem' }}>Role Level</th>
                    <th style={{ padding: '0.75rem' }}>Platform Status</th>
                    <th style={{ padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { email: 'mentor@logos.ai', role: 'Debate Coach', status: 'Active' },
                    { email: 'admin@logos.ai', role: 'Administrator', status: 'Active' },
                    { email: 'student1@logos.ai', role: 'Learner', status: 'Active' },
                    { email: 'teacher@logos.ai', role: 'Educator', status: 'Suspended' }
                  ].map((user, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 600 }}>{user.email}</td>
                      <td style={{ padding: '0.85rem' }}>{user.role}</td>
                      <td style={{ padding: '0.85rem' }}>
                        <span style={{ 
                          background: user.status === 'Active' ? '#ECFDF5' : '#FEF2F2', 
                          color: user.status === 'Active' ? '#059669' : '#DC2626', 
                          padding: '0.2rem 0.5rem', 
                          fontSize: '0.72rem', 
                          fontWeight: 700 
                        }}>
                          {user.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem' }}>
                        <button onClick={() => alert(`Status change for ${user.email} triggered!`)} style={{ background: 'none', border: 'none', color: '#D90429', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
                          Toggle Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button onClick={() => alert("Mock user creation template loaded.")} className="btn btn-dark" style={{ padding: '0.6rem 1.5rem', fontSize: '0.8rem' }}>
                Add New Platform User
              </button>
            </div>

            {/* Platform Health and System Reports */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: 0 }}>
                <div className="font-mono text-red" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>AI MODEL MONITORING</div>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Embedding Index Health</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#ccc' }}>
                  <li>Vector Database Size: <strong>3.42 GB (FAISS context indexes)</strong></li>
                  <li>Retrieval Precision Rating: <strong>98.5% precision</strong></li>
                  <li>GPU Latency Threshold: <strong>Under 12ms</strong></li>
                </ul>
              </div>

              {/* Server control buttons */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2.2rem 2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Platform Operations</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                  Perform semantic indexing refactoring, clear logged database stacks, or extract system status configurations.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button onClick={() => alert("Vector context memory index rebuilt successfully!")} className="btn btn-dark" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem' }}>
                    Re-index Semantic Database
                  </button>
                  <button onClick={() => alert("Platform traffic status logs exported!")} className="btn btn-login" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', border: '1px solid #E5E7EB' }}>
                    Download System Audit Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onAuthSuccess={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
