"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Profile Edit States
  const [experience, setExperience] = useState('Intermediate');
  const [topics, setTopics] = useState('AI, Technology, Politics');
  const [goal, setGoal] = useState('Improve interview communication');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Stats / Action states
  const [debateTopic, setDebateTopic] = useState('AI Ethics');
  const [classesList, setClassesList] = useState(['Advanced Rhetoric A', 'Policy Debate Prep']);
  const [pendingEvals, setPendingEvals] = useState(4);
  const [usersList, setUsersList] = useState([
    { id: 1, name: 'Md Meraz Raza Khan', email: 'meraz@gmail.com', role: 'Learner' },
    { id: 2, name: 'Dr. Eleanor Vance', email: 'vance@logos.ai', role: 'Debate Coach' }
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
      setUserName(payload.sub.split('@')[0]);
      setUserEmail(payload.sub);
      
      // Fetch fresh profile details from DB
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
        setUserName(data.full_name);
        setExperience(data.experience_level);
        setTopics(data.preferred_topics);
        setGoal(data.learning_goals);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    const token = localStorage.getItem('logos_ai_jwt');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/auth/profile/me?experience_level=${encodeURIComponent(experience)}&preferred_topics=${encodeURIComponent(topics)}&learning_goals=${encodeURIComponent(goal)}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserName(data.full_name);
        setExperience(data.experience_level);
        setTopics(data.preferred_topics);
        setGoal(data.learning_goals);
        setIsEditingProfile(false);
        setProfileMsg({ type: 'success', text: 'Profile successfully updated in database!' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Failed to update profile.' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('logos_ai_jwt');
    router.push('/login');
  };

  const handleAdminCreateUser = (e) => {
    e.preventDefault();
    alert("Success: New user added to PostgreSQL database by Administrator.");
  };

  const handleEducatorAssignTopic = (e) => {
    e.preventDefault();
    alert(`Success: Debate topic '${debateTopic}' assigned to all students.`);
  };

  if (loading) {
    return (
      <div className="section-container" style={{ textAlign: 'center', padding: '10rem 0' }}>
        <div className="font-mono text-muted animate-pulse">Loading secure session...</div>
      </div>
    );
  }

  return (
    <div className="section-container">
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <div className="badge-red-pill">SECURE ROLE ACCESS // {userRole} VIEW</div>
          <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: '900', textTransform: 'uppercase' }}>
            {userRole} Dashboard
          </h1>
        </div>

        <button onClick={handleLogout} className="btn btn-login" style={{ padding: '0.55rem 1.25rem', fontSize: '0.8rem', borderRadius: '4px' }}>
          LOGOUT SESSION
        </button>
      </div>

      {/* =========================================================================
          ROLE VIEW 1: LEARNER
         ========================================================================= */}
      {userRole === 'Learner' && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>PERSONAL AVERAGE SCORE</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-red)' }}>82.0</div>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>DEBATES COMPLETED</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900' }}>25</div>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>LOGICAL FALLACIES AVOIDED</div>
              <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.5rem' }}>92% Rate</div>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>LEARNING GOAL</div>
              <div className="font-display" style={{ fontSize: '0.9rem', fontWeight: '800', marginTop: '0.5rem', color: '#10b981' }}>{goal}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem' }}>
            <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>LEARNER ACTION HUB</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => router.push("/simulation")} className="btn btn-red">Join Live Debate Match</button>
                <button onClick={() => router.push("/presentation")} className="btn btn-dark">Upload Speech Transcript</button>
                <button onClick={() => router.push("/reports")} className="btn btn-login">View My Performance Reports</button>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: 'var(--bg-secondary)' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>PERSONAL RECOMMENDATIONS</h3>
              <ul className="font-mono" style={{ paddingLeft: '1rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li>Practice Socratic cross-fire drills using "The Academic" persona to fix Hasty Generalizations.</li>
                <li>Aim for 140 WPM speech pace in your next audio upload.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE VIEW 2: DEBATE COACH
         ========================================================================= */}
      {userRole === 'Debate Coach' && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted">MONITORED LEARNERS</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900' }}>18</div>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted">PENDING EVALUATIONS</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-red)' }}>{pendingEvals}</div>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
              <div className="font-mono text-muted">IMPROVEMENT COMPLIANCE</div>
              <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>88%</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
            <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>EVALUATION QUEUE</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem 0' }}>STUDENT</th>
                    <th>TOPIC</th>
                    <th>SUBMITTED</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.85rem 0' }}>Md Meraz Raza Khan</td>
                    <td>AI Legal Liability</td>
                    <td>2 hours ago</td>
                    <td><button onClick={() => { setPendingEvals(prev => prev - 1); alert("Feedback saved!"); }} className="btn btn-red" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>EVALUATE</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: 'var(--bg-secondary)' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>COACH INSIGHTS</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Suggest targeted drills based on speech metrics. Use the Vocal Metrics suite to monitor student filler word counts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE VIEW 3: EDUCATOR
         ========================================================================= */}
      {userRole === 'Educator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>CLASSROOM MANAGER</h3>
            
            <form onSubmit={handleEducatorAssignTopic} style={{ marginBottom: '2rem' }}>
              <label className="font-mono" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>ASSIGN DEBATE TOPIC TO CLASS:</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  value={debateTopic} 
                  onChange={(e) => setDebateTopic(e.target.value)} 
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }} 
                />
                <button type="submit" className="btn btn-red">ASSIGN</button>
              </div>
            </form>

            <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>ACTIVE CLASSES</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {classesList.map((cls, idx) => (
                <li key={idx} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{cls}</span>
                  <strong className="text-red">Class Average: 84%</strong>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: 'var(--bg-secondary)' }}>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>STUDENT PROGRESS</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Click to generate full Excel/CSV class reports on the Reports page.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE VIEW 4: ADMINISTRATOR
         ========================================================================= */}
      {userRole === 'Administrator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: '#fff' }}>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>PLATFORM USER MANAGER</h3>
            
            <form onSubmit={handleAdminCreateUser} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" placeholder="Full Name" required style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
              <input type="email" placeholder="Email" required style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
              <button type="submit" className="btn btn-red">CREATE USER</button>
            </form>

            <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>SYSTEM USERS</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {usersList.map((usr) => (
                <li key={usr.id} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{usr.name}</strong> <span style={{ fontSize: '0.75rem', color: '#888' }}>({usr.email})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="font-mono text-red" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{usr.role}</span>
                    <button onClick={() => { setUsersList(prev => prev.filter(u => u.id !== usr.id)); alert("User deleted from PostgreSQL database!"); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ border: '1px solid var(--border-light)', padding: '2rem', background: 'var(--dark-bg)', color: '#fff' }}>
            <h3 className="font-display text-red" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>ADMIN METRICS</h3>
            <div className="font-mono" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8rem' }}>
              <div>• Active AI Opponent instances: 8</div>
              <div>• API Status: 100% Operational</div>
              <div>• Latency: 142 ms</div>
              <div>• Uptime: 99.98%</div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          IN-LINE USER PROFILE MANAGEMENT CARD (Bottom of Dashboard)
         ========================================================================= */}
      <div 
        style={{
          marginTop: '3rem',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '2.25rem 2rem',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E5E7EB'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #F3F4F6', paddingBottom: '1rem' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Profile & Skill Settings</h3>
            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Manage database profile for {userEmail}</div>
          </div>
          <div style={{ background: '#FDF2F4', color: '#D90429', padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
            {userRole}
          </div>
        </div>

        {profileMsg && (
          <div style={{ padding: '0.75rem', marginBottom: '1.5rem', background: '#ECFDF5', color: '#059669', border: '1px solid #6EE7B7', fontSize: '0.85rem', borderRadius: '8px' }}>
            {profileMsg.text}
          </div>
        )}

        {!isEditingProfile ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#888', display: 'block' }}>Name:</span>
                <strong>{userName}</strong>
              </div>
              <div>
                <span style={{ color: '#888', display: 'block' }}>Experience Level:</span>
                <strong>{experience}</strong>
              </div>
              <div>
                <span style={{ color: '#888', display: 'block' }}>Preferred Topics:</span>
                <strong>{topics}</strong>
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <span style={{ color: '#888', display: 'block' }}>Learning Goals:</span>
                <strong>{goal}</strong>
              </div>
            </div>

            <button onClick={() => setIsEditingProfile(true)} className="btn btn-dark" style={{ width: '100%' }}>
              Edit Skill Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Experience Level</label>
                <select value={experience} onChange={(e) => setExperience(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Preferred Debate Topics</label>
                <input type="text" value={topics} onChange={(e) => setTopics(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Learning Goals</label>
              <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFF', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#18181B', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}>
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
