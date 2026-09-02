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

  // Simulated Datasets for Learner
  const [debateHistory, setDebateHistory] = useState([
    { id: 101, topic: 'AI Legal Liability & Regulatory Frameworks', format: 'Oxford Style', position: 'Affirmative', score: 86.4, status: 'Completed', date: '2026-07-22' },
    { id: 102, topic: 'Universal Basic Income Feasibility', format: 'Parliamentary', position: 'Negative', score: 81.2, status: 'Completed', date: '2026-07-20' },
    { id: 103, topic: 'Space Colonization Funding Priority', format: 'AI Simulation', position: 'Affirmative', score: 79.5, status: 'Completed', date: '2026-07-18' }
  ]);

  const [presentationHistory, setPresentationHistory] = useState([
    { id: 201, title: 'Keynote on Generative Models & Rhetoric', duration: '2m 15s', wpm: 138, fillerWords: 4, confidence: '94%', clarity: '88%' },
    { id: 202, title: 'Opening Statement - Oxford Debate Mock', duration: '1m 40s', wpm: 146, fillerWords: 9, confidence: '81%', clarity: '79%' },
    { id: 203, title: 'Elevator Pitch - Venture Capital Simulation', duration: '45s', wpm: 128, fillerWords: 2, confidence: '96%', clarity: '92%' }
  ]);

  // Skill Metrics Matrix
  const skillsMatrix = [
    { name: 'Logical Consistency', value: 88, color: '#D90429', description: 'Ability to avoid fallacy traps (e.g. straw man, ad hominem) under cross-examination.' },
    { name: 'Argument Construction', value: 84, color: '#111827', description: 'Evidence strength, claim isolation, and structural reasoning relevance.' },
    { name: 'Vocal Clarity & Cadence', value: 80, color: '#4B5563', description: 'Pacing precision (target: 130-150 WPM) and voice modulation.' },
    { name: 'Filler Word Control', value: 92, color: '#10B981', description: 'Minimal use of vocal pauses (e.g. "um", "uh", "you know").' },
    { name: 'Rebuttal Effectiveness', value: 78, color: '#3B82F6', description: 'Addressing critical challenges using 5-type argument strategies.' }
  ];

  // Coach Dashboard States
  const [coachStudents, setCoachStudents] = useState([
    { name: 'Alex Mercer', topic: 'AI Governance', grade: 'A', gap: 'Slippery Slope' },
    { name: 'Sofia Chen', topic: 'Climate Policy', grade: 'A-', gap: 'Straw Man' },
    { name: 'David Kim', topic: 'Universal Basic Income', grade: 'B+', gap: 'Circular Reasoning' },
    { name: 'Marcus Aurelius', topic: 'Space Priorities', grade: 'A', gap: 'False Dilemma' }
  ]);
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
      // Fallback defaults
      setSkillGapSummary("Your metrics indicate solid progress. Focus on reducing filler words and logical fallacies.");
      setRecommendations(["Practice Logical Consistency", "Vocal Pacing drills", "Review fallacy shield guidelines."]);
      setPathSteps(["Speech Cadence (Completed)", "Filler Word Mitigation (Active)", "Socratic Cross-examination (Upcoming)"]);
      setProgressStatus("Level 2 - Competent Debater");
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

  const handleSendCoachFeedback = (e) => {
    e.preventDefault();
    if (!coachFeedbackInput.trim()) return;
    setCoachSuccessMsg("Coaching feedback dispatched to student dashboard!");
    setCoachFeedbackInput('');
    setTimeout(() => setCoachSuccessMsg(''), 3000);
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
            { id: 'overview', label: 'OVERVIEW & SKILL MATRIX' },
            { id: 'debates', label: 'DEBATE HISTORY' },
            { id: 'presentations', label: 'PRESENTATION ARCHIVE' },
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
                  <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>14</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>AVG OVERALL SCORE</div>
                  <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>88.5%</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ACTIVE DRILL STATUS</div>
                  <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>Level 2</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>TOP AVOIDED FALLACY</div>
                  <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase' }}>Straw Man</div>
                </div>
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
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Debate Practice History</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Topic</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Format</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Position</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Performance Score</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debateHistory.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{d.topic}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Presentation History */}
          {activeTab === 'presentations' && (
            <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Presentation Prosody Archive</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Speech Title</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Speaking Pace (WPM)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Filler Word Usage</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Confidence Score</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Vocal Clarity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presentationHistory.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{p.title}</td>
                        <td style={{ padding: '1rem' }}>{p.duration}</td>
                        <td style={{ padding: '1rem' }}>{p.wpm} WPM</td>
                        <td style={{ padding: '1rem', color: '#D90429', fontWeight: 600 }}>{p.fillerWords} fillers</td>
                        <td style={{ padding: '1rem', color: '#059669', fontWeight: 700 }}>{p.confidence}</td>
                        <td style={{ padding: '1rem' }}>{p.clarity}</td>
                      </tr>
                    ))}
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
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>28</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>CLASS PERFORMANCE AVERAGE</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>85.4%</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>PENDING EVALUATIONS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>4</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>STATUS SYSTEM</div>
              <div className="font-display" style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10B981' }}>100% ONLINE</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* Student Progress Monitoring */}
            <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Student Progress Monitoring</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem' }}>Active Debate Topic</th>
                    <th style={{ padding: '0.75rem' }}>Grade Rating</th>
                    <th style={{ padding: '0.75rem' }}>Top Logic Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {coachStudents.map((student, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 600 }}>{student.name}</td>
                      <td style={{ padding: '0.85rem' }}>{student.topic}</td>
                      <td style={{ padding: '0.85rem', color: '#D90429', fontWeight: 700 }}>{student.grade}</td>
                      <td style={{ padding: '0.85rem', color: '#555' }}>
                        <span style={{ background: '#FEE2E2', color: '#D90429', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
                          {student.gap}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sidebar Skill Gaps and Recommendations Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: 0 }}>
                <div className="font-mono text-red" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>ROSTER SKILL GAP ANALYSIS</div>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Top Class Pain Points</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#ccc' }}>
                  <li><strong>Straw Man fallacies</strong> flagged in 8 student transcripts.</li>
                  <li>Inability to cite empirical statistics (low **Evidence Strength**).</li>
                  <li>Speaking pace exceeding 165 WPM under cross-examination rebuttal.</li>
                </ul>
              </div>

              {/* Coaching feedback form */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Dispatch Coaching Recommendations</h4>
                {coachSuccessMsg && (
                  <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#059669', padding: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {coachSuccessMsg}
                  </div>
                )}
                <form onSubmit={handleSendCoachFeedback}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Select Student</label>
                    <select style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', background: '#FFF' }}>
                      {coachStudents.map((s, i) => <option key={i}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Feedback / Recommendations</label>
                    <textarea 
                      rows={2} 
                      value={coachFeedbackInput}
                      onChange={(e) => setCoachFeedbackInput(e.target.value)}
                      placeholder="e.g. Focus on pausing. Slow down speech pace to 140 WPM during rebuttal." 
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-red" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem' }}>
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
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>3</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>TOTAL ENROLLED STUDENTS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>72</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>CLASS DEBATE AVERAGE</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>84.2%</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>CLASS SPEAKING PACE</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>142 WPM</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* Student Rankings */}
            <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Student Leaderboard Rankings</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Rank</th>
                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem' }}>Rhetorical Logic Rating</th>
                    <th style={{ padding: '0.75rem' }}>Speech Clarity Rating</th>
                    <th style={{ padding: '0.75rem' }}>Overall Debate Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: 1, name: 'Sofia Chen', logic: '94%', clarity: '91%', overall: '92.5%' },
                    { rank: 2, name: 'Alex Mercer', logic: '91%', clarity: '88%', overall: '89.4%' },
                    { rank: 3, name: 'David Kim', logic: '89%', clarity: '86%', overall: '87.1%' },
                    { rank: 4, name: 'Elena Rostova', logic: '87%', clarity: '89%', overall: '86.8%' }
                  ].map((student, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 700 }}>#{student.rank}</td>
                      <td style={{ padding: '0.85rem', fontWeight: 600 }}>{student.name}</td>
                      <td style={{ padding: '0.85rem' }}>{student.logic}</td>
                      <td style={{ padding: '0.85rem' }}>{student.clarity}</td>
                      <td style={{ padding: '0.85rem', color: 'var(--accent-red)', fontWeight: 700 }}>{student.overall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reports Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Active Debate Topics</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#ccc' }}>
                  <li>AI Governance and System Liability policies</li>
                  <li>Climate Mitigation Carbon Taxes</li>
                  <li>Universal Basic Income feasibility trials</li>
                </ul>
              </div>

              {/* Assessment reports generator tool */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2.2rem 2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Classroom Reports Engine</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                  Export debate and presentation assessment audits as standardized CSV/PDF reports.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button onClick={() => alert("Debate Performance Report generated!")} className="btn btn-dark" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem' }}>
                    Generate Debate Performance Report
                  </button>
                  <button onClick={() => alert("Presentation Assessment Report generated!")} className="btn btn-login" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', border: '1px solid #E5E7EB' }}>
                    Generate Presentation Assessment Report
                  </button>
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
