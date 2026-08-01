"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview'); // overview, skills, debates, presentations, settings
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [experience, setExperience] = useState('Intermediate');
  const [topics, setTopics] = useState('AI, Technology, Politics');
  const [domains, setDomains] = useState('Public Speaking, Keynotes');
  const [goals, setGoals] = useState('Reduce filler words, Master counterarguments');
  const [coaching, setCoaching] = useState('Real-time alerts, Detailed post-session audits');
  
  const [profileMsg, setProfileMsg] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Simulated Datasets (connected to User's historical records)
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

  useEffect(() => {
    const savedToken = localStorage.getItem('logos_ai_jwt');
    if (!savedToken) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(savedToken.split('.')[1]));
      setUserRole(payload.role);
      setUserEmail(payload.sub);
      
      fetchProfile(savedToken);
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
          <div style={{ display: 'inline-block', background: '#FEE2E2', color: '#D90429', fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 0, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            {userRole} Profile Space
          </div>
          <h1 className="font-display" style={{ fontSize: '2.25rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
            Welcome Back, {userName}
          </h1>
        </div>

        <button onClick={handleLogout} className="btn btn-login" style={{ padding: '0.6rem 1.4rem', fontSize: '0.8rem', borderRadius: 0, border: '1px solid #E5E7EB', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>
          LOGOUT SESSION
        </button>
      </div>

      {/* Modern Horizontal Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0, padding: '6px', marginBottom: '2.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {[
          { id: 'overview', label: 'Dashboard Overview' },
          { id: 'skills', label: 'Communication Skill Matrix' },
          { id: 'debates', label: 'Debate History Log' },
          { id: 'presentations', label: 'Presentation Archive' },
          { id: 'settings', label: 'Profile Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setProfileMsg(null); }}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 0,
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
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DEBATES COMPLETED</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#111827', margin: '0.5rem 0 0.2rem 0' }}>25</div>
              <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 500 }}>↑ 12% increase this month</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AVG PERFORMANCE SCORE</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#D90429', margin: '0.5rem 0 0.2rem 0' }}>82.4</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Oxford & Parliamentary formats</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ORAL PRESENTATION TIME</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#111827', margin: '0.5rem 0 0.2rem 0' }}>42m</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Total audio speech analysed</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>COACHING LEVEL</div>
              <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981', margin: '0.7rem 0 0.4rem 0', textTransform: 'uppercase' }}>{experience}</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Analytical coaching type</div>
            </div>
          </div>

          {/* Quick Action Center */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ background: '#FFF', padding: '2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Active Training Options</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => router.push("/simulation")} className="btn btn-red" style={{ padding: '0.85rem 1.5rem', borderRadius: 0 }}>Launch AI Debate Simulation</button>
                <button onClick={() => router.push("/presentation")} className="btn btn-dark" style={{ padding: '0.85rem 1.5rem', borderRadius: 0 }}>Start Presentation Analysis</button>
              </div>
            </div>

            <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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

      {/* ==============================================
          TAB CONTENT 2: SKILL MATRIX & TRACKING
         ============================================== */}
      {activeTab === 'skills' && (
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
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
                <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: 0, overflow: 'hidden' }}>
                  <div style={{ width: `${skill.value}%`, height: '100%', background: skill.color, borderRadius: 0, transition: 'width 1s ease-in-out' }}></div>
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
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Debate History Management
          </h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>SESSION TOPIC</th>
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
                    <td>{debate.format}</td>
                    <td>{debate.position}</td>
                    <td style={{ fontWeight: 'bold', color: '#D90429' }}>{debate.score}</td>
                    <td>
                      <span style={{ background: '#ECFDF5', color: '#059669', padding: '0.25rem 0.6rem', borderRadius: 0, fontSize: '0.75rem', fontWeight: 700 }}>
                        {debate.status}
                      </span>
                    </td>
                    <td style={{ color: '#6B7280' }}>{debate.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================
          TAB CONTENT 4: PRESENTATION ARCHIVE
         ============================================== */}
      {activeTab === 'presentations' && (
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
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
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
            User Information & Profile Settings
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Manage experience limits, coaching details, target debate topics, and presentation domains stored inside your PostgreSQL system.
          </p>

          {profileMsg && (
            <div style={{ padding: '0.85rem 1.2rem', marginBottom: '1.5rem', borderRadius: 0, fontSize: '0.875rem', background: profileMsg.type === 'error' ? '#FEF2F2' : '#ECFDF5', color: profileMsg.type === 'error' ? '#DC2626' : '#059669', border: `1px solid ${profileMsg.type === 'error' ? '#FCA5A5' : '#6EE7B7'}` }}>
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
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }}
                />
              </div>

              {/* Experience Level */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Experience Level</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', background: '#FFF' }}
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
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }}
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
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }}
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
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }}
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
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 0, border: '1px solid #E5E7EB', outline: 'none' }}
              />
            </div>

            {/* Save Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => fetchProfile(localStorage.getItem('logos_ai_jwt'))}
                style={{ padding: '0.75rem 1.5rem', borderRadius: 0, border: '1px solid #E5E7EB', background: '#FFF', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset Details
              </button>
              <button
                type="submit"
                disabled={updating}
                style={{ padding: '0.75rem 2rem', borderRadius: 0, border: 'none', background: '#111827', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
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
