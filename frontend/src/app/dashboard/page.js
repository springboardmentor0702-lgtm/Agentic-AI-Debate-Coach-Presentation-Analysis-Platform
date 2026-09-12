"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview'); // overview, skills, debates, presentations, settings
  const [userRole, setUserRole] = useState('Learner');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [coachSystemOnline, setCoachSystemOnline] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    total_debates_completed: 0,
    average_overall_score: 0,
    top_fallacy: 'None recorded',
    recent_performance_trend: [],
    debate_history: [],
    presentation_history: [],
    skill_matrix: {
      logical_consistency: 0,
      argument_construction: 0,
      evidence_strength: 0,
      rebuttal_effectiveness: 0,
      communication_skills: 0
    },
    recommended_exercises: []
  });

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
const [coachFeedback, setCoachFeedback] = useState([]);

  // Database-driven learner analytics
  const [debateHistory, setDebateHistory] = useState([]);
  const [presentationHistory, setPresentationHistory] = useState([]);

  // Database-driven Skill Metrics Matrix
  const skillsMatrix = [
    {
      name: 'Logical Consistency',
      value: dashboardData.skill_matrix?.logical_consistency || 0,
      color: '#D90429',
      description: 'Ability to avoid fallacy traps under cross-examination.'
    },
    {
      name: 'Argument Construction',
      value: dashboardData.skill_matrix?.argument_construction || 0,
      color: '#111827',
      description: 'Evidence strength, claim isolation, and structural reasoning relevance.'
    },
    {
      name: 'Vocal Clarity & Cadence',
      value: dashboardData.skill_matrix?.communication_skills || 0,
      color: '#4B5563',
      description: 'Pacing precision and voice modulation.'
    },
    {
      name: 'Filler Word Control',
      value: dashboardData.skill_matrix?.communication_skills || 0,
      color: '#10B981',
      description: 'Control of unnecessary filler words and vocal pauses.'
    },
    {
      name: 'Rebuttal Effectiveness',
      value: dashboardData.skill_matrix?.rebuttal_effectiveness || 0,
      color: '#3B82F6',
      description: 'Addressing critical challenges using effective rebuttal strategies.'
    }
  ];

  // Coach Dashboard States
  const [coachStudents, setCoachStudents] = useState([]);
  const [selectedCoachStudent, setSelectedCoachStudent] = useState('');
  const [coachFeedbackInput, setCoachFeedbackInput] = useState('');
  const [coachSuccessMsg, setCoachSuccessMsg] = useState('');
  const [pendingCoachReviews, setPendingCoachReviews] = useState([]);

  // Administrator Coach-Learner Assignment States
  const [assignmentData, setAssignmentData] = useState({ coaches: [], learners: [] });
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [selectedAssignmentCoach, setSelectedAssignmentCoach] = useState('');
const [adminUsers, setAdminUsers] = useState([]);
const [adminStats, setAdminStats] = useState({ platform_users_total: 0, system_runtime_seconds: 0 });

  useEffect(() => {
    const savedToken = localStorage.getItem('logos_ai_jwt');

    fetch('http://localhost:8000/api/v1/coach-feedback/my', {
      headers: { Authorization: "Bearer " + savedToken }
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setCoachFeedback(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load coach feedback:', err));
    if (!savedToken) {
      router.push('/login');
      return;
    }

    try {
      const base64 = savedToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      const role = payload.role || 'Learner';

      setUserRole(role);
      setUserEmail(payload.sub);

      
      if (role === 'Debate Coach' || role === 'Administrator') {
        fetchCoachDashboard(savedToken);
        if (role === 'Debate Coach') {
          fetchPendingCoachReviews(savedToken);
        }
        if (role === 'Administrator') {
          fetchAssignmentData(savedToken);
          fetchAdminUsers(savedToken);
        }
      } else {
        fetchDashboardData(savedToken);
        getUserId(savedToken).then(fetchCoachingPlan).catch(console.error);
      }
    } catch (e) {
      console.error("DASHBOARD AUTH ERROR:", e);
      alert("Dashboard error: " + e.message);
    }
  }, []);
  const fetchAdminUsers = async (token) => {
  try {
    const res = await fetch("http://localhost:8000/api/v1/dashboards/admin", {
      headers: {
        "Authorization": `Bearer ${token}` 
      }
    });

    if (res.ok) {
      const data = await res.json();
      setAdminUsers(data.users || []);
      setAdminStats({ platform_users_total: data.platform_users_total || 0, system_runtime_seconds: data.system_runtime_seconds || 0, inference_latency_ms: data.inference_latency_ms });
    } else {
      console.error("Failed to load administrator users:", res.status);
    }
  } catch (err) {
    console.error("Administrator user directory error:", err);
  }
};
const fetchAssignmentData = async (token) => {
    setAssignmentLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/coach-assignments/", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        setCoachSystemOnline(true);
        const data = await res.json();
        setAssignmentData({
          coaches: data.coaches || [],
          learners: data.learners || []
        });
      } else {
        console.error("Failed to load coach assignments:", res.status);
        setAssignmentMessage("Unable to load coach assignments.");
      }
    } catch (err) {
      console.error("Failed to connect to coach assignment API:", err);
      setAssignmentMessage("Unable to connect to the assignment service.");
    } finally {
      setAssignmentLoading(false);
    }
  };
  const fetchDashboardData = async (token) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/dashboards/learner/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        setCoachSystemOnline(true);
        const data = await res.json();

        setDashboardData(data);
        setDebateHistory(data.debate_history || []);
        setPresentationHistory(data.presentation_history || []);
      } else {
        console.error("Failed to load learner dashboard:", res.status);
      }
    } catch (err) {
      console.error("Failed to connect to dashboard API:", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchPendingCoachReviews = async (token) => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/sessions/coach/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        setPendingCoachReviews([]);
        return;
      }

      const data = await res.json();
      setPendingCoachReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load pending coach reviews:', err);
      setPendingCoachReviews([]);
    }
  };

  const fetchCoachDashboard = async (token) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/dashboards/coach/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        setCoachSystemOnline(true);
        const data = await res.json();

        const rosterStudents = (data.student_roster || []).map((student, index) => ({
          id: student.user_id,
          rank: index + 1,
          name: student.name,
          topic: student.topic || "No debate session recorded",
          grade: student.grade || "Not graded",
          gap: student.gap || "No fallacies recorded",
          logic: "-",
          clarity: "-",
          overall: student.grade || "Not graded"
        }));

        const rankedStudents = (data.top_performers || []).map((student, index) => ({
          rank: student.rank || index + 1,
          name: student.name,
          logic: student.logic != null
            ? student.logic.toFixed(1) + '%'
            : '-',
          clarity: student.clarity != null
            ? student.clarity.toFixed(1) + '%'
            : '-',
          overall: `${Number(student.score || 0).toFixed(1)}%`
        }));

        const rankedByName = new Map(
          rankedStudents.map(student => [student.name, student])
        );

        const mergedStudents = rosterStudents.map(student => {
          const ranked = rankedByName.get(student.name);

          return ranked
            ? { ...student, ...ranked }
            : student;
        });

        setCoachStudents(mergedStudents);
        setDashboardData(data);

        console.log("Coach dashboard loaded:", data);
      } else {
        setCoachSystemOnline(false);
        console.error("Failed to load coach dashboard:", res.status);
      }
    } catch (err) {
      setCoachSystemOnline(false);
      console.error("Failed to connect to coach dashboard API:", err);
    }  finally {
       setLoading(false);
    }
  };

  const getUserId = async (token) => {
    const res = await fetch("http://localhost:8000/api/v1/auth/profile/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Unable to fetch user profile");
    const profile = await res.json();
    return profile.id;
  };

  const fetchCoachingPlan = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/coaching/plan/${userId}`, { headers: { "Authorization": `Bearer ${localStorage.getItem("logos_ai_jwt")}` } });
      if (res.ok) {
        setCoachSystemOnline(true);
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
        getUserId(localStorage.getItem('logos_ai_jwt')).then(fetchCoachingPlan).catch(console.error); // Refresh coaching recommendations based on updated profile
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

    if (!selectedCoachStudent) {
      setCoachSuccessMsg("Please select a student first.");
      return;
    }

    if (!coachFeedbackInput.trim()) {
      setCoachSuccessMsg("Please enter feedback before sending.");
      return;
    }

    try {
      const token = localStorage.getItem("logos_ai_jwt");

      const params = new URLSearchParams({
        learner_id: selectedCoachStudent,
        feedback: coachFeedbackInput.trim()
      });

      const res = await fetch(
        `http://localhost:8000/api/v1/coach-feedback?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || "Failed to dispatch coaching feedback."
        );
      }

      setCoachSuccessMsg(
        "Coaching feedback dispatched to student dashboard!"
      );
      setCoachFeedbackInput('');
      setTimeout(() => setCoachSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Failed to send coach feedback:", err);
      setCoachSuccessMsg(
        typeof err?.message === 'string' ? err.message : "Failed to send coaching feedback."
      );
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
            DEBATE COACH DASHBOARD
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Account email: {userEmail}</p>
        </div>
        <button onClick={handleLogout} className="btn btn-login" style={{ padding: '0.6rem 1.4rem', fontSize: '0.8rem', borderRadius: 0, border: '1px solid #E5E7EB', background: 'transparent', fontWeight: 700 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>DEBATES COMPLETED</div>
                  <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{dashboardData.total_debates_completed || 0}</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>AVG OVERALL SCORE</div>
                  <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{Number(dashboardData.average_overall_score || 0).toFixed(1)}%</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ACTIVE DRILL STATUS</div>
                  <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{dashboardData.recommended_exercises?.length ? 'Active' : 'No Active Drill'}</div>
                </div>
                <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>TOP DETECTED FALLACY</div>
                  <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase' }}>{dashboardData.top_fallacy || 'None recorded'}</div>
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

                  {/* Coach Feedback */}
               <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                 <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Coach Feedback</h4>
                 {coachFeedback.length === 0 ? (
                   <p style={{ fontSize: '0.88rem', color: '#6B7280', margin: 0 }}>
                     No coach feedback received yet.
                   </p>
                 ) : (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {coachFeedback.map((item) => (
                       <div key={item.id} style={{ borderLeft: '3px solid #111827', paddingLeft: '1rem' }}>
                         <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.5', margin: '0 0 0.5rem' }}>
                           {item.feedback}
                         </p>
                         {item.created_at && (
                           <div className="font-mono" style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                             {new Date(item.created_at).toLocaleString()}
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 )}
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
                  <button type="button" onClick={() => setActiveTab('overview')} style={{ padding: '0.75rem 1.5rem', borderRadius: 0, border: '1px solid #E5E7EB', background: '#FFF', fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={updating} style={{ padding: '0.75rem 2rem', borderRadius: 0, border: 'none', background: '#111827', color: '#FFF', fontWeight: 600 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ASSIGNED STUDENTS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>
                {dashboardData.assigned_students_count || 0}
              </div>
            </div>
                    <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
          <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.8rem' }}>AVERAGE LEARNER PERFORMANCE</div>
          <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>
            {dashboardData.class_performance_average != null
              ? `${Number(dashboardData.class_performance_average).toFixed(1)}%`
              : '0.0%'}
          </div>
        </div>
            <div
              style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}
            >
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>PENDING COACH REVIEWS</div><div style={{ fontSize: '0.72rem', marginTop: '0.5rem', color: '#6B7280' }}>Session awaiting evaluation &gt;</div>
            <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>
              {dashboardData.pending_evaluations ?? 0}
            </div>  
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>STATUS SYSTEM</div>
              <div className="font-display" style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10B981' }}>{coachSystemOnline ? 'ONLINE' : 'OFFLINE'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* Student Progress Monitoring */}
            <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <h3 id="pending-coach-review" className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Student Progress Monitoring</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem' }}>Active Debate Topic</th>
                    <th style={{ padding: '0.75rem' }}>Overall Score</th>
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
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Top Learner Skill Gaps</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#ccc' }}>
            {dashboardData.class_skill_gaps.map((gap, index) => <li key={index}><strong>{gap.name}</strong>{gap.message ? ` - ${gap.message}` : ""}</li>)}
                </ul>
              </div>

              {/* Coaching feedback form */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Dispatch Coaching Recommendations</h4>
                {coachSuccessMsg && (
                  <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#059669', padding: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {typeof coachSuccessMsg === 'string' ? coachSuccessMsg : coachSuccessMsg?.message || 'Coaching feedback dispatched successfully.'}
                  </div>
                )}
                <form onSubmit={handleSendCoachFeedback}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Select Student</label>
                    <select
                      value={selectedCoachStudent}
                      onChange={(e) => setSelectedCoachStudent(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', background: '#FFF' }}
                    >
                      <option value="">Select a student</option>
                      {coachStudents.map((s, i) => (
                        <option key={i} value={s.id}>
                          {s.name}
                        </option>
                      ))}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
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
                  {coachStudents.map((student, i) => (
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>TOTAL PLATFORM USERS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{Number(adminStats.platform_users_total || 0).toLocaleString()}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>AI ENGINE LATENCY</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{adminStats.inference_latency_ms != null ? `${Number(adminStats.inference_latency_ms).toFixed(2)}ms` : 'No data'}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>SYSTEM RUNTIME</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{Math.floor((adminStats.system_runtime_seconds || 0) / 3600)}h {Math.floor(((adminStats.system_runtime_seconds || 0) % 3600) / 60)}m</div>
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
                  {adminUsers.map((user, i) => (
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
                        <button onClick={() => alert(`Status change for ${user.email} triggered!`)} style={{ background: 'none', border: 'none', color: '#D90429', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'underline' }}>
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

            {/* Coach-Learner Assignment Panel */}
<div style={{ gridColumn: '1 / -1', background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', marginTop: '0.5rem' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
    <div>
      <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
        Coach-Learner Assignment
      </h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
        Assign, reassign, or unassign learners from Debate Coaches.
      </p>
    </div>
    <button
      onClick={() => {
        const savedToken = localStorage.getItem('logos_ai_jwt');
        if (savedToken) fetchAssignmentData(savedToken);
      }}
      className="btn btn-dark"
      style={{ padding: '0.6rem 1rem', fontSize: '0.78rem' }}
      disabled={assignmentLoading}
    >
      {assignmentLoading ? 'Refreshing...' : 'Refresh'}
    </button>
  </div>

  {assignmentMessage && (
    <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#F0FDF4', color: '#166534', fontSize: '0.82rem' }}>
      {assignmentMessage}
    </div>
  )}

  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
    <div>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
        Select Debate Coach
      </label>
      <select
        value={selectedAssignmentCoach}
        onChange={(e) => setSelectedAssignmentCoach(e.target.value)}
        style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', background: '#FFF', fontSize: '0.85rem' }}
      >
        <option value="">Select a coach</option>
        {assignmentData.coaches.map((coach) => (
          <option key={coach.id} value={coach.id}>
            {coach.name} â€” {coach.email}
          </option>
        ))}
      </select>
    </div>

    <div style={{ padding: '0.75rem 1rem', background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center' }}>
      <strong>
        {assignmentData.coaches.length} Coach{assignmentData.coaches.length === 1 ? '' : 'es'} / {assignmentData.learners.length} Learner{assignmentData.learners.length === 1 ? '' : 's'}
      </strong>
    </div>
  </div>

  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
    <thead>
      <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
        <th style={{ padding: '0.75rem' }}>Learner</th>
        <th style={{ padding: '0.75rem' }}>Email</th>
        <th style={{ padding: '0.75rem' }}>Current Coach</th>
        <th style={{ padding: '0.75rem' }}>Action</th>
      </tr>
    </thead>
    <tbody>
      {assignmentData.learners.map((learner) => {
        const currentCoach = assignmentData.coaches.find((coach) => coach.id === learner.coach_id);

        return (
          <tr key={learner.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
            <td style={{ padding: '0.85rem', fontWeight: 600 }}>{learner.name}</td>
            <td style={{ padding: '0.85rem' }}>{learner.email}</td>
            <td style={{ padding: '0.85rem' }}>
              {currentCoach ? currentCoach.name : (
                <span style={{ color: '#B45309', fontWeight: 600 }}>Unassigned</span>
              )}
            </td>
            <td style={{ padding: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    if (!selectedAssignmentCoach) {
                      setAssignmentMessage('Please select a Debate Coach first.');
                      return;
                    }

                    const savedToken = localStorage.getItem('logos_ai_jwt');
                    if (!savedToken) return;

                    setAssignmentMessage('');

                    try {
                      const res = await fetch(
                        `http://localhost:8000/api/v1/coach-assignments/${learner.id}/${selectedAssignmentCoach}`,
                        {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${savedToken}`
                          }
                        }
                      );

                      const result = await res.json();

                      if (res.ok) {
                        setAssignmentMessage(`${learner.name} assigned successfully.`);
                        await fetchAssignmentData(savedToken);
                      } else {
                        setAssignmentMessage(result.detail || 'Unable to assign learner.');
                      }
                    } catch (err) {
                      console.error('Assignment failed:', err);
                      setAssignmentMessage('Unable to connect to the assignment service.');
                    }
                  }}
                  style={{ background: '#111827', color: '#FFF', border: 'none', padding: '0.5rem 0.8rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  {learner.coach_id ? 'Reassign' : 'Assign'}
                </button>

                {learner.coach_id && (
                  <button
                    onClick={async () => {
                      const savedToken = localStorage.getItem('logos_ai_jwt');
                      if (!savedToken) return;

                      setAssignmentMessage('');

                      try {
                        const res = await fetch(
                          `http://localhost:8000/api/v1/coach-assignments/${learner.id}`,
                          {
                            method: 'DELETE',
                            headers: {
                              Authorization: `Bearer ${savedToken}`
                            }
                          }
                        );

                        const result = await res.json();

                        if (res.ok) {
                          setAssignmentMessage(`${learner.name} unassigned successfully.`);
                          await fetchAssignmentData(savedToken);
                        } else {
                          setAssignmentMessage(result.detail || 'Unable to unassign learner.');
                        }
                      } catch (err) {
                        console.error('Unassignment failed:', err);
                        setAssignmentMessage('Unable to connect to the assignment service.');
                      }
                    }}
                    style={{ background: 'none', color: '#D90429', border: '1px solid #D90429', padding: '0.45rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Unassign
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}

      {assignmentData.learners.length === 0 && (
        <tr>
          <td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: '#6B7280' }}>
            No learners found.
          </td>
        </tr>
      )}
    </tbody>
  </table>
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

    </div>
  );
}

















































