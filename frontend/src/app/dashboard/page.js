"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Invalid authentication token');
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return JSON.parse(atob(padded));
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview'); // overview, debates, presentations, settings, coach-class, educator-class, admin-ops
  const [userRole, setUserRole] = useState('Learner');
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

  // Real Dynamic Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    hasHistory: false,
    debatesCount: 0,
    presentationsCount: 0,
    avgScore: "N/A",
    avgWpm: "N/A",
    drillStatus: "N/A",
    topAvoidedFallacy: "N/A",
    skillsMatrix: [
      { name: 'Logical Consistency', value: 'N/A', rawValue: 0, color: '#D90429', description: 'Ability to avoid fallacy traps under cross-examination.' },
      { name: 'Argument Construction', value: 'N/A', rawValue: 0, color: '#111827', description: 'Evidence strength, claim isolation, and structural reasoning.' },
      { name: 'Vocal Clarity & Cadence', value: 'N/A', rawValue: 0, color: '#4B5563', description: 'Pacing precision (target: 130-150 WPM) and voice modulation.' },
      { name: 'Filler Word Control', value: 'N/A', rawValue: 0, color: '#10B981', description: 'Minimal use of vocal pauses (e.g. "um", "uh", "you know").' },
      { name: 'Rebuttal Effectiveness', value: 'N/A', rawValue: 0, color: '#3B82F6', description: 'Addressing critical challenges using rigorous counter-arguments.' }
    ],
    coachingInsights: {
      activePlan: "Initial Assessment",
      summary: "No historical debates or presentations found. Start your first AI debate or presentation to compute your real rhetorical baseline.",
      recommendations: [
        "Complete your first AI Debate Simulation on any topic",
        "Record a vocal presentation to establish baseline WPM and prosody metrics",
        "Review logical fallacy shields in the Rhetoric documentation"
      ],
      activeStep: "Launch your first debate simulation"
    }
  });

  // Real Datasets for User
  const [debateHistory, setDebateHistory] = useState([]);
  const [presentationHistory, setPresentationHistory] = useState([]);
  const [selectedDebateIds, setSelectedDebateIds] = useState([]);
  const [selectedPresentationIds, setSelectedPresentationIds] = useState([]);
  const [deletingHistory, setDeletingHistory] = useState(false);

  // Coach Dashboard States
  const [coachStudents, setCoachStudents] = useState([
    { id: 1, name: 'Alex Mercer', topic: 'AI Governance & Liability', grade: 'A', gap: 'Slippery Slope', feedback: 'Strong opening framing.' },
    { id: 2, name: 'Sofia Chen', topic: 'Climate Policy & Carbon Tax', grade: 'A-', gap: 'Straw Man', feedback: 'Excellent evidentiary citations.' },
    { id: 3, name: 'David Kim', topic: 'Universal Basic Income', grade: 'B+', gap: 'Circular Reasoning', feedback: 'Pacing is solid (140 WPM).' },
    { id: 4, name: 'Marcus Aurelius', topic: 'Space Priorities & Colonization', grade: 'A', gap: 'False Dilemma', feedback: 'Compelling delivery.' }
  ]);
  const [selectedStudentId, setSelectedStudentId] = useState(1);
  const [selectedStudentGrade, setSelectedStudentGrade] = useState('A');
  const [selectedStudentGap, setSelectedStudentGap] = useState('Evidence Strength');
  const [coachFeedbackInput, setCoachFeedbackInput] = useState('');
  const [coachSuccessMsg, setCoachSuccessMsg] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentTopic, setNewStudentTopic] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('B+');
  const [newStudentGap, setNewStudentGap] = useState('Evidence Strength');
  const [studentDebates, setStudentDebates] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const [selectedDebateDetail, setSelectedDebateDetail] = useState(null);
  const [classDashboard, setClassDashboard] = useState({ studentCount: 0, debateCount: 0, averageScore: 0, students: [] });

  // Admin Dashboard States
  const [adminUsers, setAdminUsers] = useState([
    { id: 1, email: 'student1@logos.ai', name: 'Alex Vance', role: 'Learner', status: 'Active' },
    { id: 2, email: 'mentor@logos.ai', name: 'Dr. Evelyn Reed', role: 'Debate Coach', status: 'Active' },
    { id: 3, email: 'teacher@logos.ai', name: 'Prof. Marcus Vance', role: 'Educator', status: 'Active' },
    { id: 4, email: 'admin@logos.ai', name: 'Root Administrator', role: 'Admin', status: 'Active' }
  ]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newAdminUserEmail, setNewAdminUserEmail] = useState('');
  const [newAdminUserName, setNewAdminUserName] = useState('');
  const [newAdminUserRole, setNewAdminUserRole] = useState('Learner');
  const [adminOpNotice, setAdminOpNotice] = useState('');

  const isCoach = userRole === 'Debate Coach' || userRole === 'Coach';
  const isEducator = userRole === 'Educator';
  const isAdmin = userRole === 'Admin' || userRole === 'Administrator';

  useEffect(() => {
    localStorage.removeItem('logos_ai_last_analytics');
    localStorage.removeItem('logos_ai_debates');
    localStorage.removeItem('logos_ai_presentations');

    const savedToken = localStorage.getItem('logos_ai_jwt');
    if (!savedToken) {
      router.push('/login');
      return;
    }

    try {
      const payload = decodeJwtPayload(savedToken);
      const rawRole = payload.role || 'Learner';
      const role = rawRole.toLowerCase() === 'debate coach' || rawRole.toLowerCase() === 'coach'
        ? 'Debate Coach'
        : rawRole.toLowerCase() === 'educator'
          ? 'Educator'
          : rawRole.toLowerCase() === 'admin' || rawRole.toLowerCase() === 'administrator'
            ? 'Administrator'
            : 'Learner';
      setUserRole(role);
      setUserEmail(payload.email || payload.sub || 'alex@example.com');
      setUserName(payload.name || payload.sub || 'Alex Vance');
      setFullName(payload.name || 'Alex Vance');
      
      // Set appropriate default tab depending on role
      if (role === 'Debate Coach' || role === 'Coach') {
        setActiveTab('coach-class');
      } else if (role === 'Educator') {
        setActiveTab('educator-class');
      } else if (role === 'Admin' || role === 'Administrator') {
        setActiveTab('admin-ops');
      } else {
        setActiveTab('overview');
      }

      fetchProfile(savedToken);
      fetchAnalytics(savedToken);
      if (role === 'Debate Coach' || role === 'Coach' || role === 'Educator') {
        fetchCoachStudents(savedToken);
        fetchClassDashboard(savedToken, role);
      }
      if (role === 'Admin' || role === 'Administrator') {
        fetchAdminUsers(savedToken);
      }
    } catch (e) {
      console.error('Dashboard authentication token could not be read:', e);
      router.push('/login');
    }
  }, [router]);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch("/api/v1/auth/profile/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const displayName = data.name || data.full_name || "Alex Vance";
        setFullName(displayName);
        setUserName(displayName);
        setExperience(data.experience || data.experience_level || 'Intermediate');
        setTopics(data.preferred_topics || 'AI, Technology, Politics');
        setDomains(data.presentation_domains || 'Public Speaking, Keynotes');
        setGoals(data.learning_goals || 'Reduce filler words, Master counterarguments');
        setCoaching(data.coaching_preferences || 'Real-time alerts, Detailed post-session audits');
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (token) => {
    try {
      const authToken = token || localStorage.getItem('logos_ai_jwt');

      const res = await fetch("/api/v1/dashboard/analytics", {
        headers: authToken ? { "Authorization": `Bearer ${authToken}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData((previous) => ({
          ...previous,
          ...data,
          skillsMatrix: Array.isArray(data.skillsMatrix) ? data.skillsMatrix : previous.skillsMatrix,
          coachingInsights: data.coachingInsights || previous.coachingInsights
        }));
        setDebateHistory(Array.isArray(data.debateHistory) ? data.debateHistory : []);
        setPresentationHistory(Array.isArray(data.presentationHistory) ? data.presentationHistory : []);
      }
    } catch (err) {
      console.warn("Analytics fetch fallback", err);
    }
  };

  const toggleHistorySelection = (setter, id) => {
    setter((current) => current.includes(String(id))
      ? current.filter((item) => item !== String(id))
      : [...current, String(id)]);
  };

  const deleteHistory = async (type, ids) => {
    if (!ids.length || deletingHistory) return;
    if (!window.confirm(`Delete ${ids.length} selected ${type}? This cannot be undone.`)) return;
    setDeletingHistory(true);
    try {
      const token = localStorage.getItem('logos_ai_jwt');
      const response = await fetch(`/api/v1/history?type=${type}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || 'Unable to delete history');
      if (type === 'debates') {
        setDebateHistory((current) => current.filter((item) => !ids.includes(String(item.id))));
        setSelectedDebateIds([]);
      } else {
        setPresentationHistory((current) => current.filter((item) => !ids.includes(String(item.id))));
        setSelectedPresentationIds([]);
      }
      fetchAnalytics(token);
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingHistory(false);
    }
  };

  const fetchCoachStudents = async (token) => {
    try {
      const authToken = token || localStorage.getItem('logos_ai_jwt');
      const res = await fetch("/api/v1/coaching/students", {
        headers: authToken ? { "Authorization": `Bearer ${authToken}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.students && data.students.length > 0) {
          setCoachStudents(data.students);
          setSelectedStudentId(data.students[0].id);
          fetchStudentDebates(data.students[0].id, token);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch coach students", e);
    }
  };

  const fetchStudentDebates = async (studentId, token) => {
    if (!studentId) return;
    try {
      const res = await fetch(`/api/v1/coaching/students/${studentId}/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const history = Array.isArray(data.history) ? data.history : [];
      setStudentDebates(history);
      const firstId = history[0]?._id || history[0]?.id || '';
      setSelectedHistoryId(firstId);
      if (firstId) fetchDebateDetail(studentId, firstId, token);
    } catch {
      setStudentDebates([]);
      setSelectedHistoryId('');
    }
  };

  const fetchDebateDetail = async (studentId, historyId, token) => {
    if (!studentId || !historyId) {
      setSelectedDebateDetail(null);
      return;
    }
    try {
      const response = await fetch(`/api/v1/coaching/students/${studentId}/history?historyId=${encodeURIComponent(historyId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSelectedDebateDetail(response.ok ? await response.json() : null);
    } catch {
      setSelectedDebateDetail(null);
    }
  };

  const fetchClassDashboard = async (token, role) => {
    try {
      const prefix = role === 'Educator' ? 'educator' : 'coach';
      const res = await fetch(`/api/v1/coaching/class-dashboard?role=${prefix}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setClassDashboard(await res.json());
    } catch {}
  };

  const fetchAdminUsers = async (token) => {
    try {
      const authToken = token || localStorage.getItem('logos_ai_jwt');
      const res = await fetch("/api/v1/admin/users", {
        headers: authToken ? { "Authorization": `Bearer ${authToken}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setAdminUsers(data.users);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch admin users", e);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setProfileMsg(null);
    const token = localStorage.getItem('logos_ai_jwt');
    
    try {
      const res = await fetch("/api/v1/auth/profile/me", {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: fullName,
          experience,
          preferred_topics: topics,
          presentation_domains: domains,
          learning_goals: goals,
          coaching_preferences: coaching
        })
      });
      
      if (res.ok) {
        setUserName(fullName);
        setProfileMsg({ type: 'success', text: 'User profile metrics successfully updated in database.' });
        fetchAnalytics(token);
      } else {
        setProfileMsg({ type: 'error', text: 'Error updating profile. Please verify authorization.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Failed to connect to API backend.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddCoachStudent = async (e) => {
    e.preventDefault();
    if (!newStudentEmail.trim()) return;
    try {
      const token = localStorage.getItem('logos_ai_jwt');
      const res = await fetch("/api/v1/coaching/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: newStudentEmail.trim()
        })
      });
      if (res.ok) {
        setCoachSuccessMsg(`Student account "${newStudentEmail}" added to the class.`);
        setNewStudentEmail('');
        setNewStudentName('');
        setNewStudentTopic('');
        setShowAddStudentModal(false);
        fetchCoachStudents(token);
        fetchClassDashboard(token, userRole);
        setTimeout(() => setCoachSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveCoachStudent = async (studentId, studentName) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from the class roster?`)) return;
    try {
      const token = localStorage.getItem('logos_ai_jwt');
      const res = await fetch(`/api/v1/coaching/students?id=${studentId}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setCoachSuccessMsg(`Student "${studentName}" removed from class roster.`);
        fetchCoachStudents(token);
        setTimeout(() => setCoachSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendCoachFeedback = async (e) => {
    e.preventDefault();
    if (!coachFeedbackInput.trim()) return;
    try {
      const token = localStorage.getItem('logos_ai_jwt');
      const res = await fetch("/api/v1/coaching/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          historyId: selectedHistoryId,
          feedback: coachFeedbackInput,
          grade: selectedStudentGrade,
          logicGap: selectedStudentGap,
        })
      });
      if (res.ok) {
        setCoachSuccessMsg(`✓ Feedback from ${userName || "you"} was added to the selected debate history.`);
        setCoachFeedbackInput('');
        await fetchStudentDebates(selectedStudentId, token);
        await fetchClassDashboard(token, userRole);
        setTimeout(() => setCoachSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const token = localStorage.getItem('logos_ai_jwt');
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setAdminOpNotice("User account platform status successfully updated.");
        fetchAdminUsers(token);
        setTimeout(() => setAdminOpNotice(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPlatformUser = async (e) => {
    e.preventDefault();
    if (!newAdminUserEmail.trim()) return;
    try {
      const token = localStorage.getItem('logos_ai_jwt');
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: newAdminUserEmail,
          name: newAdminUserName || newAdminUserEmail.split('@')[0],
          role: newAdminUserRole
        })
      });
      if (res.ok) {
        setAdminOpNotice(`Platform user ${newAdminUserEmail} provisioned.`);
        setNewAdminUserEmail('');
        setNewAdminUserName('');
        setShowAddUserModal(false);
        fetchAdminUsers(token);
        setTimeout(() => setAdminOpNotice(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminOperation = async (action) => {
    try {
      const token = localStorage.getItem('logos_ai_jwt');
      const res = await fetch("/api/v1/admin/operations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const data = await res.json();
        setAdminOpNotice(data.message || `Operation ${action} completed successfully.`);
        setTimeout(() => setAdminOpNotice(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('logos_ai_jwt');
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-pulse" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-red)' }}>DECRYPTING DATA MATRIX...</div>
        </div>
      </div>
    );
  }

  // Define tabs so that EVERY role has the basic features, plus extra role-specific features
  const getTabs = () => {
    const basicTabs = [
      { id: 'overview', label: 'OVERVIEW & SKILL MATRIX' },
      { id: 'debates', label: `DEBATE HISTORY (${debateHistory.length})` },
      { id: 'presentations', label: `PRESENTATION ARCHIVE (${presentationHistory.length})` },
      { id: 'settings', label: 'PROFILE SETTINGS' }
    ];

    if (isCoach) {
      return [
        { id: 'coach-class', label: `COACH ROSTER & FEEDBACK (${coachStudents.length})` },
        ...basicTabs
      ];
    }
    if (isEducator) {
      return [
        { id: 'educator-class', label: 'CLASS ANALYTICS & RANKINGS' },
        ...basicTabs
      ];
    }
    if (isAdmin) {
      return [
        { id: 'admin-ops', label: 'PLATFORM ADMINISTRATION' },
        ...basicTabs
      ];
    }
    return basicTabs;
  };

  return (
    <div className="section-container" style={{ paddingTop: '2.5rem' }}>
      
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

      {/* Tab Select Bar for ALL roles */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0, padding: '6px', marginBottom: '2.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {(getTabs() || []).map((tab) => (
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

      {/* ========================================================================= */}
      {/* ROLE EXTRA: COACH / EDUCATOR CLASS & STUDENT ROSTER */}
      {/* ========================================================================= */}
      {(isCoach || isEducator) && activeTab === (isCoach ? 'coach-class' : 'educator-class') && (
        <div>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ENROLLED STUDENTS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{classDashboard.studentCount}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>CLASS PERFORMANCE AVERAGE</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{classDashboard.averageScore || 'N/A'}{classDashboard.averageScore ? '%' : ''}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ACTIVE COACHING STATUS</div>
              <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: '900', color: '#10B981' }}>ONLINE</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>PERSONAL SESSIONS LOGGED</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{classDashboard.debateCount}</div>
            </div>
          </div>

          {coachSuccessMsg && (
            <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#059669', padding: '0.85rem 1.2rem', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600 }}>
              {coachSuccessMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* Student Progress Monitoring & Management */}
            <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{isEducator ? 'Class Learner Accounts' : 'Class Roster Management'}</h3>
                <button 
                  onClick={() => setShowAddStudentModal(!showAddStudentModal)}
                  className="btn btn-red"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                >
                  {showAddStudentModal ? "Close Form" : "+ Add Existing Student"}
                </button>
              </div>

              {showAddStudentModal && (
                <form onSubmit={handleAddCoachStudent} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem' }}>ADD AN EXISTING ACCOUNT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Existing Student Account Email</label>
                      <input
                        type="email"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                        placeholder="student@example.com"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Assigned Topic</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Carbon Tax Economics"
                        value={newStudentTopic}
                        onChange={(e) => setNewStudentTopic(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Target Grade</label>
                      <select 
                        value={newStudentGrade} 
                        onChange={(e) => setNewStudentGrade(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', background: '#fff', fontSize: '0.85rem' }}
                      >
                        <option>A</option>
                        <option>A-</option>
                        <option>B+</option>
                        <option>B</option>
                        <option>B-</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Primary Focus Gap</label>
                      <select 
                        value={newStudentGap} 
                        onChange={(e) => setNewStudentGap(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', background: '#fff', fontSize: '0.85rem' }}
                      >
                        <option>Evidence Strength</option>
                        <option>Straw Man Fallacies</option>
                        <option>Slippery Slope</option>
                        <option>Vocal Cadence (WPM)</option>
                        <option>Rebuttal Precision</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-dark" style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem' }}>
                    Save & Enroll Student
                  </button>
                </form>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem' }}>Active Debate Topic</th>
                    <th style={{ padding: '0.75rem' }}>Grade</th>
                    <th style={{ padding: '0.75rem' }}>Top Logic Gap</th>
                    <th style={{ padding: '0.75rem' }}>Latest Coach Feedback</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(classDashboard.students || []).map((student) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 600 }}>{student.name}</td>
                      <td style={{ padding: '0.85rem' }}>{student.latestTopic || 'Assigned learner'}</td>
                      <td style={{ padding: '0.85rem', color: '#D90429', fontWeight: 700 }}>{student.grade || 'Pending'}</td>
                      <td style={{ padding: '0.85rem' }}>
                        <span style={{ background: '#FEE2E2', color: '#D90429', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
                          {student.gap || 'Review performance'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', maxWidth: '280px', color: student.latestFeedback && student.latestFeedback !== 'Awaiting feedback' ? '#374151' : '#9CA3AF' }}>
                        {student.latestFeedback || 'Awaiting feedback'}
                        {student.latestFeedbackBy ? <div style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>From {student.latestFeedbackBy}</div> : null}
                      </td>
                      <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                        {isCoach && <button 
                          onClick={() => handleRemoveCoachStudent(student.id, student.name)}
                          style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Remove
                        </button>}
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
                  <li><strong>Straw Man fallacies</strong> flagged in student transcripts.</li>
                  <li>Inability to cite empirical statistics (low Evidence Strength).</li>
                  <li>Speaking pace exceeding 165 WPM under cross-examination rebuttal.</li>
                </ul>
              </div>

              {/* Coaching feedback form */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Dispatch Student Feedback</h4>
                <form onSubmit={handleSendCoachFeedback}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Select Student</label>
                    <select 
                      value={selectedStudentId} 
                        onChange={(e) => {
                          setSelectedStudentId(e.target.value);
                          fetchStudentDebates(e.target.value, localStorage.getItem('logos_ai_jwt'));
                        }}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', background: '#FFF', fontSize: '0.85rem' }}
                    >
                      {coachStudents.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Debate History *</label>
                    <select
                      required
                      value={selectedHistoryId}
                      onChange={(e) => {
                        setSelectedHistoryId(e.target.value);
                        fetchDebateDetail(selectedStudentId, e.target.value, localStorage.getItem('logos_ai_jwt'));
                      }}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', background: '#FFF', fontSize: '0.85rem' }}
                    >
                      {studentDebates.map((debate) => <option key={debate._id || debate.id} value={debate._id || debate.id}>{debate.topic} - {debate.date || 'Recent'}</option>)}
                    </select>
                  </div>
                  {selectedDebateDetail && (
                    <div style={{ marginBottom: '1rem', border: '1px solid #E5E7EB', background: '#F9FAFB', padding: '1rem', maxHeight: '360px', overflowY: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{selectedDebateDetail.topic}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{selectedDebateDetail.date || 'Recent'} · Score {selectedDebateDetail.score ?? 'N/A'}%</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {(Array.isArray(selectedDebateDetail.transcript) ? selectedDebateDetail.transcript : []).map((turn, index) => (
                          <div key={index} style={{ padding: '0.7rem', background: turn.type === 'opponent' ? '#FFF1F2' : '#FFFFFF', borderLeft: `3px solid ${turn.type === 'opponent' ? '#D90429' : '#111827'}` }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem', color: turn.type === 'opponent' ? '#B91C1C' : '#374151' }}>{turn.speaker || (turn.type === 'opponent' ? 'AI Opponent' : 'Student')}</div>
                            <div style={{ fontSize: '0.84rem', lineHeight: 1.45, color: '#1F2937' }}>{turn.text || turn.user_input || turn.opponent_response || 'No argument text recorded.'}</div>
                          </div>
                        ))}
                        {(!Array.isArray(selectedDebateDetail.transcript) || selectedDebateDetail.transcript.length === 0) && (
                          <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>This debate has no stored turn transcript.</div>
                        )}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Update Grade</label>
                    <select 
                      value={selectedStudentGrade} 
                      onChange={(e) => setSelectedStudentGrade(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', background: '#FFF', fontSize: '0.85rem' }}
                    >
                      <option>A</option>
                      <option>A-</option>
                      <option>B+</option>
                      <option>B</option>
                      <option>B-</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Top Logic Gap</label>
                    <select
                      value={selectedStudentGap}
                      onChange={(e) => setSelectedStudentGap(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', background: '#FFF', fontSize: '0.85rem' }}
                    >
                      <option>Evidence Strength</option>
                      <option>Straw Man Fallacies</option>
                      <option>Slippery Slope</option>
                      <option>Vocal Cadence (WPM)</option>
                      <option>Rebuttal Precision</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Feedback / Recommendations *</label>
                    <textarea 
                      rows={3} 
                      required
                      value={coachFeedbackInput}
                      onChange={(e) => setCoachFeedbackInput(e.target.value)}
                      placeholder="e.g. Focus on pausing. Slow down speech pace to 140 WPM during rebuttal and substantiate claim with empirical studies." 
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-red" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem' }}>
                    Send Performance Feedback
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROLE EXTRA: EDUCATOR CLASSROOM ANALYTICS & RANKINGS */}
      {/* ========================================================================= */}
      {isEducator && activeTab === 'educator-class' && (
        <div>
          {/* Roster classroom statistics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ACTIVE CLASSES</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>3</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>TOTAL ENROLLED STUDENTS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{classDashboard.studentCount}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>CLASS DEBATE AVERAGE</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{classDashboard.averageScore || 'N/A'}{classDashboard.averageScore ? '%' : ''}</div>
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
                    <th style={{ padding: '0.75rem' }}>Debates Completed</th>
                    <th style={{ padding: '0.75rem' }}>Latest Debate</th>
                    <th style={{ padding: '0.75rem' }}>Overall Debate Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(classDashboard.students || []).map((student, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 700 }}>#{i + 1}</td>
                      <td style={{ padding: '0.85rem', fontWeight: 600 }}>{student.name}</td>
                      <td style={{ padding: '0.85rem' }}>{student.debateCount} debates</td>
                      <td style={{ padding: '0.85rem' }}>{student.latestTopic}</td>
                      <td style={{ padding: '0.85rem', color: 'var(--accent-red)', fontWeight: 700 }}>{student.averageScore || 'Pending'}{student.averageScore ? '%' : ''}</td>
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
                  <Link href="/reports" className="btn btn-dark" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', textAlign: 'center' }}>
                    Open Verified Reports Engine
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROLE EXTRA: ADMIN PLATFORM CONTROLS (NO FEEDBACK, ADMINISTRATIVE TASKS) */}
      {/* ========================================================================= */}
      {isAdmin && activeTab === 'admin-ops' && (
        <div>
          {/* Admin Platform Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>PLATFORM REGISTERED USERS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>{adminUsers.length}</div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ACTIVE AI DEBATE AGENTS</div>
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

          {adminOpNotice && (
            <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#059669', padding: '0.85rem 1.2rem', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600 }}>
              {adminOpNotice}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* User Management Panel */}
            <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>User Directory Access Control</h3>
                <button 
                  onClick={() => setShowAddUserModal(!showAddUserModal)}
                  className="btn btn-dark" 
                  style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }}
                >
                  {showAddUserModal ? "Close Form" : "+ Add User"}
                </button>
              </div>

              {showAddUserModal && (
                <form onSubmit={handleAddPlatformUser} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem' }}>PROVISION NEW USER ACCOUNT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email Address *</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="user@logos.ai"
                        value={newAdminUserEmail}
                        onChange={(e) => setNewAdminUserEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Jordan Lee"
                        value={newAdminUserName}
                        onChange={(e) => setNewAdminUserName(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>Role Assignment</label>
                      <select 
                        value={newAdminUserRole} 
                        onChange={(e) => setNewAdminUserRole(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', background: '#fff', fontSize: '0.85rem' }}
                      >
                        <option>Learner</option>
                        <option>Debate Coach</option>
                        <option>Educator</option>
                        <option>Admin</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-red" style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem' }}>
                    Create & Provision Account
                  </button>
                </form>
              )}
              
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
                    <tr key={user.id || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
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
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem' }}>
                        <button onClick={() => handleToggleUserStatus(user.id)} style={{ background: 'none', border: 'none', color: '#D90429', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
                          Toggle Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ fontSize: '0.8rem', color: '#6B7280', fontStyle: 'italic', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                Notice: Administrators manage platform infrastructure, database indices, and access control. Administrators do not dispatch student performance feedback.
              </div>
            </div>

            {/* Platform Health and System Operations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#111827', color: '#FFF', padding: '2rem', borderRadius: 0 }}>
                <div className="font-mono text-red" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>AI MODEL MONITORING</div>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Embedding Index Health</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#ccc' }}>
                  <li>Vector Database: <strong>FAISS Semantic Context Indices</strong></li>
                  <li>Retrieval Precision Rating: <strong>98.5% precision</strong></li>
                  <li>GPU Inference Threshold: <strong>Under 18ms latency</strong></li>
                </ul>
              </div>

              {/* Server control buttons */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '2.2rem 2rem', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Platform Operations</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                  Execute administrative maintenance tasks, rebuild vector databases, or extract security audit ledgers.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button onClick={() => handleAdminOperation('reindex')} className="btn btn-dark" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem' }}>
                    Re-index Semantic Database
                  </button>
                  <button onClick={() => handleAdminOperation('clear_cache')} className="btn btn-login" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', border: '1px solid #E5E7EB' }}>
                    Clear Platform Inference Cache
                  </button>
                  <button onClick={() => handleAdminOperation('export_audit')} className="btn btn-login" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', border: '1px solid #E5E7EB' }}>
                    Export System Audit Ledger
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BASIC FEATURES AVAILABLE TO EVERY ROLE */}
      {/* ========================================================================= */}

      {/* Tab 1: Overview & Skill Matrix */}
      {activeTab === 'overview' && (
        <div>
          {/* Quick statistics cards - Real dynamic metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>DEBATES COMPLETED</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>
                {analyticsData.debatesCount}
              </div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>AVG OVERALL SCORE</div>
              <div className="font-display text-red" style={{ fontSize: '2.2rem', fontWeight: '900' }}>
                {analyticsData.avgScore}
              </div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>ACTIVE DRILL STATUS</div>
              <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900' }}>
                {analyticsData.drillStatus}
              </div>
            </div>
            <div style={{ padding: '1.75rem', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 0 }}>
              <div className="font-mono text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>TOP AVOIDED FALLACY</div>
              <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase' }}>
                {analyticsData.topAvoidedFallacy}
              </div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2.5rem' }}>
            {/* Left Side: Skill matrix */}
            <div style={{ background: '#FFF', padding: '2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>Rhetorical Skill Matrix</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {(analyticsData.skillsMatrix || []).map((skill, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      <span style={{ color: '#111827' }}>{skill.name}</span>
                      <span style={{ color: skill.color }}>{skill.value}</span>
                    </div>
                    {/* Bar */}
                    <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: 0, overflow: 'hidden' }}>
                      <div style={{ width: `${skill.rawValue || 0}%`, height: '100%', background: skill.color, borderRadius: 0, transition: 'width 0.8s ease-in-out' }}></div>
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
                <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>
                  Active Plan: {analyticsData.coachingInsights?.activePlan || "Initial Assessment"}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#ccc', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  {analyticsData.coachingInsights?.summary}
                </p>
                
                <div className="font-mono text-red" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>ACTIVE LEARNING STEP</div>
                <div style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 600 }}>
                  {analyticsData.coachingInsights?.activeStep || "Launch your first debate simulation"}
                </div>
              </div>

              {/* Recommendations Exercise list */}
              <div style={{ background: '#FFF', padding: '2rem', border: '1px solid #E5E7EB', borderRadius: 0 }}>
                <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>Recommended Practice Drills</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', color: '#4B5563', lineHeight: '1.4' }}>
                  {analyticsData.coachingInsights?.recommendations?.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Debate Practice History for ALL roles */}
      {activeTab === 'debates' && (
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Debate Practice History</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                All simulated debates, recordings, and scored matches logged to your account.
              </p>
            </div>
            <Link href="/simulation" className="btn btn-red" style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }}>
              + New AI Debate
            </Link>
            <button
              type="button"
              className="btn btn-login"
              disabled={!selectedDebateIds.length || deletingHistory}
              onClick={() => deleteHistory('debates', selectedDebateIds)}
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem', marginLeft: '0.5rem', color: '#B91C1C' }}
            >
              Delete Selected ({selectedDebateIds.length})
            </button>
          </div>

          {debateHistory.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#F9FAFB', border: '1px dashed #D1D5DB' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>No Debate Records Found Yet</div>
              <p style={{ fontSize: '0.88rem', color: '#6B7280', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
                Launch a live AI debate simulation or record a debate argument to populate your personal debate scorecard and analytics.
              </p>
              <Link href="/simulation" className="btn btn-dark">
                Launch Debate Simulation
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Topic</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Select</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Format</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Position</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Performance Score</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Coach / Educator Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {debateHistory.map((d, idx) => (
                    <tr key={d.id || idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{d.topic}</td>
                      <td style={{ padding: '1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedDebateIds.includes(String(d.id))}
                          onChange={() => toggleHistorySelection(setSelectedDebateIds, d.id)}
                          aria-label={`Select debate ${d.topic}`}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>{d.format}</td>
                      <td style={{ padding: '1rem' }}>{d.position}</td>
                      <td style={{ padding: '1rem', color: 'var(--accent-red)', fontWeight: 700 }}>{d.score}%</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: '#ECFDF5', color: '#059669', padding: '0.25rem 0.6rem', borderRadius: 0, fontSize: '0.75rem', fontWeight: 700 }}>
                          {d.status || 'Completed'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#6B7280' }}>{d.date || 'Recent'}</td>
                      <td style={{ padding: '1rem', minWidth: '240px' }}>
                        {d.coachFeedback ? <div><strong>Feedback from your coach {d.coachFeedbackByName ? `(${d.coachFeedbackByName})` : ''}:</strong> {d.coachFeedback}</div> : null}
                        {d.educatorFeedback ? <div><strong>Feedback from your educator {d.educatorFeedbackByName ? `(${d.educatorFeedbackByName})` : ''}:</strong> {d.educatorFeedback}</div> : null}
                        {!d.coachFeedback && !d.educatorFeedback ? <span style={{ color: '#9CA3AF' }}>Awaiting review</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Presentation Prosody Archive for ALL roles */}
      {activeTab === 'presentations' && (
        <div style={{ background: '#FFF', padding: '2.5rem 2rem', borderRadius: 0, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Presentation Prosody Archive</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                All microphone vocal runs, speaking pace logs (WPM), and filler word analyses.
              </p>
            </div>
            <Link href="/presentation" className="btn btn-red" style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }}>
              + Analyze New Speech
            </Link>
            <button
              type="button"
              className="btn btn-login"
              disabled={!selectedPresentationIds.length || deletingHistory}
              onClick={() => deleteHistory('presentations', selectedPresentationIds)}
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem', marginLeft: '0.5rem', color: '#B91C1C' }}
            >
              Delete Selected ({selectedPresentationIds.length})
            </button>
          </div>

          {presentationHistory.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#F9FAFB', border: '1px dashed #D1D5DB' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>No Presentation Archives Found</div>
              <p style={{ fontSize: '0.88rem', color: '#6B7280', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
                Speak into the microphone or submit a speech transcript in the Presentation Suite to evaluate vocal pacing (WPM), filler words, and clarity.
              </p>
              <Link href="/presentation" className="btn btn-dark">
                Open Presentation Suite
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Speech Title</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Select</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Speaking Pace (WPM)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Filler Word Usage</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Confidence Score</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Vocal Clarity</th>
                  </tr>
                </thead>
                <tbody>
                  {presentationHistory.map((p, idx) => (
                    <tr key={p.id || idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{p.title}</td>
                      <td style={{ padding: '1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedPresentationIds.includes(String(p.id))}
                          onChange={() => toggleHistorySelection(setSelectedPresentationIds, p.id)}
                          aria-label={`Select presentation ${p.title}`}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>{p.duration}</td>
                      <td style={{ padding: '1rem' }}>{p.wpm} WPM</td>
                      <td style={{ padding: '1rem', color: '#D90429', fontWeight: 600 }}>{p.fillerWords} fillers</td>
                      <td style={{ padding: '1rem', color: '#059669', fontWeight: 700 }}>{p.confidence}%</td>
                      <td style={{ padding: '1rem' }}>{p.clarity}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Profile Settings Form for ALL roles */}
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
  );
}

