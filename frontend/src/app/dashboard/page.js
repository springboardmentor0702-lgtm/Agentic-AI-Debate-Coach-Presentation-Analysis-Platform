"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Brain, Mic, Target, Trophy, ArrowUpRight, LogOut, MessageSquare, CheckCircle2, Pencil, Save, X, Eye, Trash2, UserPlus, Send, RefreshCw, MessagesSquare, Swords } from "lucide-react";

const API = "http://localhost:8000/api/v1";
const h = () => {
  const t = localStorage.getItem("logos_ai_jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const hj = () => ({ ...h(), "Content-Type": "application/json" });

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [dash, setDash] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [plan, setPlan] = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [mentees, setMentees] = useState(null);
  const [allUsers, setAllUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [completingId, setCompletingId] = useState(null);

  // Inline row editing (students / all-accounts tables)
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [rowError, setRowError] = useState("");

  // Add-user form (Administrator only)
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserDraft, setAddUserDraft] = useState({ full_name: "", email: "", password: "", role: "Learner", experience_level: "Intermediate" });
  const [addUserError, setAddUserError] = useState("");

  // Student progress + feedback composer
  const [viewingStudent, setViewingStudent] = useState(null); // {id, full_name}
  const [studentDash, setStudentDash] = useState(null);
  const [studentSessions, setStudentSessions] = useState([]);
  const [studentFeedback, setStudentFeedback] = useState(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentHistory, setSentHistory] = useState([]);
  const [sendNote, setSendNote] = useState("");

  // Conversation transcript viewer
  const [viewingConversation, setViewingConversation] = useState(null); // {session_id, title, ...}
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState("");

  const loadAll = useCallback(async (role) => {
    const roleEndpoint = role === "Debate Coach" ? "coach/me" : role === "Educator" ? "educator/me" : role === "Administrator" ? "admin" : null;
    const fetches = [
      fetch(`${API}/dashboards/learner/me`, { headers: h() }),
      fetch(`${API}/sessions/user/me`, { headers: h() }),
      fetch(`${API}/dashboards/learner/feedback`, { headers: h() }),
      fetch(`${API}/coach-feedback/inbox`, { headers: h() }),
    ];
    if (roleEndpoint) fetches.push(fetch(`${API}/dashboards/${roleEndpoint}`, { headers: h() }));
    const results = await Promise.all(fetches);
    const [d, s, fb, ib, r] = results;
    if (results.some(x => x.status === 401)) { localStorage.removeItem("logos_ai_jwt"); router.push("/login"); return; }
    setDash(await d.json());
    setSessions(await s.json());
    if (fb && fb.ok) setFeedback(await fb.json());
    if (ib && ib.ok) setInbox(await ib.json());
    if (r && r.ok) setRoleData(await r.json());
    if (role === "Debate Coach" || role === "Educator" || role === "Administrator") {
      const m = await fetch(`${API}/auth/users/mentees`, { headers: h() });
      if (m.ok) setMentees(await m.json());
    }
    if (role === "Administrator") {
      const u = await fetch(`${API}/auth/users`, { headers: h() });
      if (u.ok) setAllUsers(await u.json());
    }
  }, [router]);

  useEffect(() => {
    const t = localStorage.getItem("logos_ai_jwt");
    if (!t) { router.push("/login"); return; }
    (async () => {
      try {
        const p = await fetch(`${API}/auth/profile/me`, { headers: h() });
        if (p.status === 401) { localStorage.removeItem("logos_ai_jwt"); router.push("/login"); return; }
        const profileData = await p.json();
        setProfile(profileData);
        await loadAll(profileData.role);
        const cp = await fetch(`${API}/coaching/plan/${JSON.parse(atob(t.split('.')[1])).user_id}`, { headers: h() });
        if (cp.ok) setPlan(await cp.json());
      } catch { /* keep dashboard usable even if one call fails */ }
      finally { setLoading(false); }
    })();
  }, [router, loadAll]);

  const logout = () => { localStorage.removeItem("logos_ai_jwt"); router.push("/login"); };

  const markComplete = async (sessionId) => {
    setCompletingId(sessionId);
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/complete`, { method: "POST", headers: h() });
      if (res.ok) await loadAll(profile?.role);
    } catch { /* leave the row as-is if the request fails */ }
    finally { setCompletingId(null); }
  };

  const startEdit = (row, isAdmin) => {
    setEditingId(row.id);
    setRowError("");
    setEditDraft(isAdmin
      ? { full_name: row.full_name, experience_level: row.experience_level, role: row.role }
      : { full_name: row.full_name, experience_level: row.experience_level });
  };
  const cancelEdit = () => { setEditingId(null); setRowError(""); };
  const saveEdit = async (userId) => {
    setRowError("");
    try {
      const res = await fetch(`${API}/auth/users/${userId}`, { method: "PUT", headers: hj(), body: JSON.stringify(editDraft) });
      const data = await res.json();
      if (!res.ok) { setRowError(data.detail || "Could not save this change."); return; }
      setEditingId(null);
      await loadAll(profile?.role);
    } catch { setRowError("Could not reach the server."); }
  };

  const deleteUser = async (userId, label) => {
    if (!window.confirm(`Permanently delete ${label}? This also deletes all of their sessions, scores, and feedback. This cannot be undone.`)) return;
    setRowError("");
    try {
      const res = await fetch(`${API}/auth/users/${userId}`, { method: "DELETE", headers: h() });
      const data = await res.json();
      if (!res.ok) { setRowError(data.detail || "Could not delete this account."); return; }
      if (viewingStudent?.id === userId) setViewingStudent(null);
      await loadAll(profile?.role);
    } catch { setRowError("Could not reach the server."); }
  };

  const submitAddUser = async () => {
    setAddUserError("");
    try {
      const res = await fetch(`${API}/auth/users`, { method: "POST", headers: hj(), body: JSON.stringify(addUserDraft) });
      const data = await res.json();
      if (!res.ok) { setAddUserError(data.detail || "Could not create this account."); return; }
      setShowAddUser(false);
      setAddUserDraft({ full_name: "", email: "", password: "", role: "Learner", experience_level: "Intermediate" });
      await loadAll(profile?.role);
    } catch { setAddUserError("Could not reach the server."); }
  };

  const openStudentProgress = async (student) => {
    setViewingStudent(student);
    setStudentDetailLoading(true);
    setSendNote("");
    setViewingConversation(null);
    setConversationError("");
    try {
      const [d, s, fb, hist] = await Promise.all([
        fetch(`${API}/dashboards/student/${student.id}`, { headers: h() }),
        fetch(`${API}/sessions/user/${student.id}`, { headers: h() }),
        fetch(`${API}/dashboards/student/${student.id}/feedback`, { headers: h() }),
        fetch(`${API}/coach-feedback/sent/${student.id}`, { headers: h() }),
      ]);
      setStudentDash(d.ok ? await d.json() : null);
      setStudentSessions(s.ok ? await s.json() : []);
      setStudentFeedback(fb.ok ? await fb.json() : null);
      setSentHistory(hist.ok ? await hist.json() : []);
      await refreshSuggestion(student.id);
    } finally { setStudentDetailLoading(false); }
  };

  const refreshSuggestion = async (studentId) => {
    setSuggestionLoading(true);
    try {
      const res = await fetch(`${API}/coach-feedback/suggestion/${studentId}`, { headers: h() });
      if (res.ok) { const data = await res.json(); setDraftMessage(data.suggested_message); }
    } finally { setSuggestionLoading(false); }
  };

  const sendFeedback = async () => {
    if (!viewingStudent || !draftMessage.trim()) return;
    setSending(true);
    setSendNote("");
    try {
      const res = await fetch(`${API}/coach-feedback/send`, {
        method: "POST", headers: hj(),
        body: JSON.stringify({ student_id: viewingStudent.id, message: draftMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSendNote(data.detail || "Could not send this feedback."); return; }
      setSentHistory([data, ...sentHistory]);
      setSendNote("Feedback sent.");
    } catch { setSendNote("Could not reach the server."); }
    finally { setSending(false); }
  };

  const openConversation = async (sessionId) => {
    setConversationLoading(true);
    setConversationError("");
    setViewingConversation(null);
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/conversation`, { headers: h() });
      const data = await res.json();
      if (!res.ok) { setConversationError(data.detail || "Could not load this conversation."); return; }
      setViewingConversation(data);
    } catch { setConversationError("Could not reach the server."); }
    finally { setConversationLoading(false); }
  };

  if (loading) return <div className="dash-loading">LOADING YOUR RHETORIC PROFILE...</div>;

  const score = dash?.average_overall_score || 0;
  const trend = dash?.recent_performance_trend || [];
  const completedCount = dash?.total_debates_completed || 0;
  const roleTabLabel = profile?.role === "Debate Coach" ? "COACH VIEW" : profile?.role === "Educator" ? "EDUCATOR VIEW" : profile?.role === "Administrator" ? "ADMIN VIEW" : null;
  const isAdmin = profile?.role === "Administrator";
  const canEditStudents = profile?.role === "Debate Coach" || profile?.role === "Educator" || isAdmin;

  const tabs = [
    ["overview", "OVERVIEW"],
    ["history", "DEBATE HISTORY"],
    ["coach", "AI COACH"],
    ["feedback", "FEEDBACK"],
    ["profile", "PROFILE"],
    ...(roleTabLabel ? [["role", roleTabLabel]] : []),
  ];

  return (
    <div className="dashboard-shell">
      <div className="dash-top">
        <div>
          <div className="badge-red-pill"><BarChart3 size={14} /> PERSONAL PERFORMANCE COMMAND CENTER</div>
          <h1>WELCOME, <span>{profile?.full_name?.split(" ")[0] || "DEBATER"}.</span></h1>
          <p>{profile?.experience_level || "Intermediate"} • {profile?.role || "Learner"} • {profile?.email}</p>
        </div>
        <button className="logout" onClick={logout}><LogOut size={15} /> LOGOUT</button>
      </div>

      <div className="dash-tabs">
        {tabs.map(([id, label]) => (
          <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="score-hero">
            <div>
              <small>OVERALL RHETORIC SCORE</small>
              <strong>{score.toFixed(1)}%</strong>
              <p>{score >= 85 ? "Elite trajectory. Keep challenging yourself." : score >= 70 ? "Solid progress. Focus on your weakest metric." : "Build your baseline with short, frequent practice sessions."}</p>
            </div>
            <div className="score-ring" style={{ "--score": `${score}%` }}>
              <span>{completedCount}</span>
              <small>COMPLETED</small>
            </div>
          </div>
          <div className="metric-cards">
            <Metric icon={<Brain />} label="LOGICAL CONSISTENCY" value={trend.length ? Math.round(dash?.average_logical_consistency ?? score) : 0} />
            <Metric icon={<Target />} label="ARGUMENT QUALITY" value={trend.length ? Math.round(dash?.average_argument_quality ?? score) : 0} />
            <Metric icon={<Mic />} label="VOICE PRACTICE" value={completedCount} suffix=" sessions" />
            <Metric icon={<Trophy />} label="TOP FALLACY" value={dash?.top_fallacy || "None"} text />
          </div>
          <div className="quick-feedback">
            <MessageSquare size={16} />
            <p><b>Quick feedback:</b> {dash?.quick_feedback || "Complete your first debate session to unlock personalised feedback here."}</p>
          </div>
          {inbox.length > 0 && (
            <div className="coach-inbox">
              <div className="panel-title"><span>MESSAGES FROM YOUR COACH / EDUCATOR</span><small>{inbox.length}</small></div>
              {inbox.slice(0, 3).map(m => (
                <div className="inbox-item" key={m.id}>
                  <b>{m.coach_name}</b><small>{new Date(m.created_at).toLocaleDateString()}</small>
                  <p>{m.message}</p>
                </div>
              ))}
            </div>
          )}
          <div className="dash-grid">
            <section className="panel">
              <div className="panel-title"><span>PERFORMANCE TREND</span><small>LAST {trend.length || 0} SCORES</small></div>
              <div className="bars">
                {trend.length
                  ? trend.map((v, i) => <div className="bar-wrap" key={i}><div className="bar" style={{ height: `${Math.max(8, v)}%` }} /><span>{v}</span></div>)
                  : <div className="empty">Complete your first debate to create your performance trend.</div>}
              </div>
            </section>
            <section className="panel coach-panel">
              <div className="panel-title"><span>AI COACH</span><Brain size={16} /></div>
              <h3>{plan?.progress_status || "Level 0 — Starting"}</h3>
              <p>{plan?.skill_gap_summary || "Your coach will learn from your debate and voice metrics."}</p>
              <ul>{(plan?.targeted_recommendations || dash?.recommended_exercises || []).slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}</ul>
              <button onClick={() => router.push("/simulation")}>START PRACTICE <ArrowUpRight size={15} /></button>
            </section>
          </div>
        </>
      )}

      {tab === "history" && (
        <section className="panel history">
          <div className="panel-title"><span>REAL SESSION HISTORY</span><small>{sessions.length} SESSIONS</small></div>
          {sessions.length
            ? sessions.map(s => (
              <div className="history-row" key={s.id}>
                <div><b>{s.title}</b><small>{s.topic} • {s.format} • {s.assigned_position}</small></div>
                {s.status === "Completed"
                  ? <span className="done">Completed</span>
                  : (
                    <button className="mark-complete-btn" disabled={completingId === s.id} onClick={() => markComplete(s.id)}>
                      <CheckCircle2 size={14} /> {completingId === s.id ? "Completing…" : "Mark Complete"}
                    </button>
                  )}
              </div>
            ))
            : <div className="empty">No sessions yet. Start your first AI debate.</div>}
        </section>
      )}

      {tab === "coach" && (
        <section className="coach-large">
          <div className="badge-red-pill">PERSONALIZED LEARNING PATH</div>
          <h2>{plan?.progress_status || "Your AI coach is ready."}</h2>
          <p>{plan?.skill_gap_summary}</p>
          <div className="coach-steps">
            {(plan?.learning_path_steps || ["Run a debate", "Practice voice delivery", "Review your report"]).map((x, i) => <div key={i}><b>0{i + 1}</b><span>{x}</span></div>)}
          </div>
        </section>
      )}

      {tab === "feedback" && (
        <>
          {inbox.length > 0 && (
            <section className="panel feedback-panel">
              <div className="panel-title"><span>MESSAGES FROM YOUR COACH / EDUCATOR</span><small>{inbox.length}</small></div>
              <div className="feedback-list">
                {inbox.map(m => (
                  <div className="feedback-card" key={m.id}>
                    <div className="feedback-card-top">
                      <div><b>{m.coach_name}</b><small>{m.session_title ? `${m.session_title} • ` : ""}{new Date(m.created_at).toLocaleDateString()}</small></div>
                    </div>
                    <p className="coach-message">{m.message}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="panel feedback-panel">
            <div className="panel-title"><span>AI FEEDBACK REPORT</span><small>{feedback?.count || 0} SESSIONS SCORED</small></div>
            {feedback && feedback.sessions && feedback.sessions.length ? (
              <div className="feedback-list">
                {feedback.sessions.map((s) => (
                  <div className="feedback-card" key={s.session_id}>
                    <div className="feedback-card-top">
                      <div>
                        <b>{s.title}</b>
                        <small>{s.topic || "General"} {s.date ? `• ${new Date(s.date).toLocaleDateString()}` : ""}</small>
                      </div>
                      <div className="feedback-score">{s.overall_weighted_score}%</div>
                    </div>
                    <div className="feedback-bars">
                      <FeedbackBar label="Argument Quality" value={s.argument_quality} />
                      <FeedbackBar label="Evidence Use" value={s.evidence_use} />
                      <FeedbackBar label="Logical Consistency" value={s.logical_consistency} />
                      <FeedbackBar label="Rebuttal Effectiveness" value={s.rebuttal_effectiveness} />
                      <FeedbackBar label="Communication Skills" value={s.communication_skills} />
                    </div>
                    <div className="feedback-cols">
                      <div>
                        <div className="feedback-col-title good">WHAT WENT WELL</div>
                        <ul className="feedback-notes">{(s.strengths || []).map((line, i) => <li key={i}><MessageSquare size={13} /> {line}</li>)}</ul>
                      </div>
                      <div>
                        <div className="feedback-col-title low">WHERE TO IMPROVE</div>
                        <ul className="feedback-notes">{(s.improvements || []).map((line, i) => <li key={i}><MessageSquare size={13} /> {line}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">Complete a debate session to receive your first AI feedback report.</div>
            )}
          </section>
        </>
      )}

      {tab === "profile" && (
        <section className="panel profile">
          <div className="panel-title"><span>PROFILE INTELLIGENCE</span></div>
          {profile && Object.entries({
            "FULL NAME": profile.full_name,
            "EMAIL": profile.email,
            "ROLE": profile.role,
            "EXPERIENCE": profile.experience_level,
            "TOPICS": profile.preferred_topics,
            "GOALS": profile.learning_goals,
            "COACHING": profile.coaching_preferences,
          }).map(([k, v]) => <div className="profile-row" key={k}><small>{k}</small><span>{v || "—"}</span></div>)}
        </section>
      )}

      {tab === "role" && (
        <>
          <section className="panel role-panel">
            <div className="panel-title"><span>{roleTabLabel}</span><small>Extra data only visible to this role</small></div>
            {profile?.role === "Debate Coach" && roleData && (
              <div className="role-stats">
                <div className="role-stat"><small>ASSIGNED STUDENTS</small><strong>{roleData.assigned_students_count}</strong></div>
                <div className="role-stat"><small>EVALUATIONS RECORDED</small><strong>{roleData.evaluations_recorded}</strong></div>
                <div className="role-stat wide"><small>CLASS SKILL GAPS</small><ul>{(roleData.class_skill_gaps || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              </div>
            )}
            {profile?.role === "Educator" && roleData && (
              <div className="role-stats">
                <div className="role-stat"><small>ACTIVE CLASSES</small><strong>{roleData.active_classes}</strong></div>
                <div className="role-stat"><small>TOTAL ENROLLED STUDENTS</small><strong>{roleData.total_enrolled_students}</strong></div>
                <div className="role-stat"><small>AVERAGE CLASS SCORE</small><strong>{roleData.average_class_score}%</strong></div>
                <div className="role-stat wide"><small>DEBATE TOPICS ASSIGNED</small><ul>{(roleData.debate_topics_assigned || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              </div>
            )}
            {profile?.role === "Administrator" && roleData && (
              <div className="role-stats">
                <div className="role-stat"><small>PLATFORM USERS TOTAL</small><strong>{roleData.platform_users_total}</strong></div>
                <div className="role-stat"><small>DEBATE SESSIONS TOTAL</small><strong>{roleData.debate_sessions_total}</strong></div>
                <div className="role-stat"><small>ANALYSES TOTAL</small><strong>{roleData.analyses_total}</strong></div>
                <div className="role-stat wide"><small>AI ENGINE HEALTH</small><span>{roleData.llm_api_health}</span></div>
              </div>
            )}
            {!roleData && <div className="empty">This role-specific data could not be loaded.</div>}
          </section>

          {canEditStudents && (
            <section className="panel students-panel">
              <div className="panel-title">
                <span>{isAdmin ? "MY STUDENTS (ALL LEARNERS)" : "MY STUDENTS"}</span>
                <small>{mentees ? mentees.length : 0} learner{mentees && mentees.length === 1 ? "" : "s"}</small>
              </div>
              <p className="scope-note">
                {isAdmin
                  ? "As Administrator you see every learner on the platform."
                  : "You only see learners who selected you as their coach/educator by email at sign-up."}
              </p>
              {mentees && mentees.length ? (
                <table className="students-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Experience</th><th>Sessions</th><th>Completed</th><th>Avg Score</th><th></th></tr></thead>
                  <tbody>
                    {mentees.map(m => (
                      <tr key={m.id}>
                        {editingId === m.id ? (
                          <>
                            <td><input value={editDraft.full_name} onChange={e => setEditDraft({ ...editDraft, full_name: e.target.value })} /></td>
                            <td className="muted">{m.email}</td>
                            <td><input value={editDraft.experience_level} onChange={e => setEditDraft({ ...editDraft, experience_level: e.target.value })} /></td>
                            <td className="muted">{m.total_sessions}</td>
                            <td className="muted">{m.total_debates_completed}</td>
                            <td className="muted">{m.average_overall_score}%</td>
                            <td className="row-actions">
                              <button className="icon-btn" onClick={() => saveEdit(m.id)}><Save size={14} /></button>
                              <button className="icon-btn" onClick={cancelEdit}><X size={14} /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{m.full_name}</td>
                            <td className="muted">{m.email}</td>
                            <td className="muted">{m.experience_level}</td>
                            <td className="muted">{m.total_sessions}</td>
                            <td className="muted">{m.total_debates_completed}</td>
                            <td className="muted">{m.average_overall_score}%</td>
                            <td className="row-actions">
                              <button className="icon-btn" title="View progress" onClick={() => openStudentProgress(m)}><Eye size={14} /></button>
                              <button className="icon-btn" title="Edit" onClick={() => startEdit(m, false)}><Pencil size={14} /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="empty">No students assigned to you yet.</div>}
              {rowError && <p className="row-error">{rowError}</p>}
            </section>
          )}

          {isAdmin && (
            <section className="panel students-panel">
              <div className="panel-title">
                <span>ALL ACCOUNTS (FULL PLATFORM)</span>
                <div className="title-actions">
                  <small>{allUsers ? allUsers.length : 0} accounts</small>
                  <button className="add-user-btn" onClick={() => setShowAddUser(!showAddUser)}><UserPlus size={14} /> Add User</button>
                </div>
              </div>
              <p className="scope-note">Administrator can view progress, edit, or delete any account here.</p>

              {showAddUser && (
                <div className="add-user-form">
                  <input placeholder="Full name" value={addUserDraft.full_name} onChange={e => setAddUserDraft({ ...addUserDraft, full_name: e.target.value })} />
                  <input placeholder="Email" value={addUserDraft.email} onChange={e => setAddUserDraft({ ...addUserDraft, email: e.target.value })} />
                  <input placeholder="Password (8+ chars)" type="password" value={addUserDraft.password} onChange={e => setAddUserDraft({ ...addUserDraft, password: e.target.value })} />
                  <select value={addUserDraft.role} onChange={e => setAddUserDraft({ ...addUserDraft, role: e.target.value })}>
                    {["Learner", "Debate Coach", "Educator", "Administrator"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button className="save-user-btn" onClick={submitAddUser}><Save size={14} /> Create</button>
                  {addUserError && <p className="row-error">{addUserError}</p>}
                </div>
              )}

              {allUsers && allUsers.length ? (
                <table className="students-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Experience</th><th></th></tr></thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        {editingId === u.id ? (
                          <>
                            <td><input value={editDraft.full_name} onChange={e => setEditDraft({ ...editDraft, full_name: e.target.value })} /></td>
                            <td className="muted">{u.email}</td>
                            <td>
                              <select value={editDraft.role} onChange={e => setEditDraft({ ...editDraft, role: e.target.value })}>
                                {["Learner", "Debate Coach", "Educator", "Administrator"].map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td><input value={editDraft.experience_level} onChange={e => setEditDraft({ ...editDraft, experience_level: e.target.value })} /></td>
                            <td className="row-actions">
                              <button className="icon-btn" onClick={() => saveEdit(u.id)}><Save size={14} /></button>
                              <button className="icon-btn" onClick={cancelEdit}><X size={14} /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{u.full_name}</td>
                            <td className="muted">{u.email}</td>
                            <td className="muted">{u.role}</td>
                            <td className="muted">{u.experience_level}</td>
                            <td className="row-actions">
                              <button className="icon-btn" title="View progress" onClick={() => openStudentProgress(u)}><Eye size={14} /></button>
                              <button className="icon-btn" title="Edit" onClick={() => startEdit(u, true)}><Pencil size={14} /></button>
                              <button className="icon-btn danger" title="Delete" onClick={() => deleteUser(u.id, u.full_name)}><Trash2 size={14} /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="empty">No accounts found.</div>}
              {rowError && <p className="row-error">{rowError}</p>}
            </section>
          )}

          {viewingStudent && (
            <section className="panel student-detail-panel">
              <div className="panel-title">
                <span>PROGRESS: {viewingStudent.full_name.toUpperCase()}</span>
                <button className="icon-btn" onClick={() => setViewingStudent(null)}><X size={14} /></button>
              </div>
              {studentDetailLoading ? (
                <div className="empty">Loading student progress…</div>
              ) : (
                <>
                  <div className="metric-cards small">
                    <Metric icon={<Trophy />} label="OVERALL SCORE" value={studentDash?.average_overall_score ?? 0} />
                    <Metric icon={<CheckCircle2 />} label="COMPLETED SESSIONS" value={studentDash?.total_debates_completed ?? 0} suffix="" />
                    <Metric icon={<Brain />} label="TOP FALLACY" value={studentDash?.top_fallacy || "None"} text />
                  </div>

                  <div className="dash-grid">
                    <section className="panel inner-panel">
                      <div className="panel-title"><span>PERFORMANCE TREND</span></div>
                      <div className="bars small">
                        {(studentDash?.recent_performance_trend || []).length
                          ? studentDash.recent_performance_trend.map((v, i) => <div className="bar-wrap" key={i}><div className="bar" style={{ height: `${Math.max(8, v)}%` }} /><span>{v}</span></div>)
                          : <div className="empty">No scored sessions yet.</div>}
                      </div>
                    </section>
                    <section className="panel inner-panel">
                      <div className="panel-title"><span>DEBATES DONE</span><small>{studentSessions.length}</small></div>
                      <div className="mini-history">
                        {studentSessions.length
                          ? studentSessions.slice(0, 6).map(s => (
                            <div className="mini-history-row" key={s.id}>
                              <span>{s.title}</span>
                              <span className="mini-history-right">
                                <span className={s.status === "Completed" ? "done" : "live"}>{s.status}</span>
                                <button className="icon-btn" title="View conversation" onClick={() => openConversation(s.id)}><MessagesSquare size={13} /></button>
                              </span>
                            </div>
                          ))
                          : <div className="empty">No debates run yet.</div>}
                      </div>
                    </section>
                  </div>

                  {(conversationLoading || conversationError || viewingConversation) && (
                    <div className="conversation-panel">
                      <div className="panel-title">
                        <span><Swords size={14} /> DEBATE CONVERSATION{viewingConversation ? `: ${viewingConversation.title}` : ""}</span>
                        <button className="icon-btn" onClick={() => { setViewingConversation(null); setConversationError(""); }}><X size={14} /></button>
                      </div>
                      {conversationLoading && <div className="empty">Loading conversation…</div>}
                      {conversationError && <div className="empty">{conversationError}</div>}
                      {viewingConversation && !conversationLoading && (
                        viewingConversation.turns.length ? (
                          <div className="transcript">
                            {viewingConversation.turns.map((t) => (
                              <div className="transcript-turn" key={t.turn_index}>
                                <div className="transcript-bubble student">
                                  <small>{viewingConversation.student_name} — Turn {t.turn_index}</small>
                                  <p>{t.user_argument}</p>
                                  {t.fallacies_detected && t.fallacies_detected.length > 0 && (
                                    <div className="fallacy-tags">
                                      {t.fallacies_detected.map((f, i) => (
                                        <span className="fallacy-tag" key={i}>{typeof f === "string" ? f : (f.fallacy_type || f.type || JSON.stringify(f))}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="transcript-bubble ai">
                                  <small>AI Opponent — {t.opponent_persona}</small>
                                  <p>{t.opponent_rebuttal}</p>
                                  {t.coaching_tip && <p className="coaching-tip"><b>Coaching tip:</b> {t.coaching_tip}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <div className="empty">This session has no recorded turns (it may have been marked complete without any arguments submitted).</div>
                      )}
                    </div>
                  )}

                  <div className="feedback-composer">
                    <div className="panel-title"><span>SEND FEEDBACK</span>
                      <button className="icon-btn" title="Regenerate AI suggestion" disabled={suggestionLoading} onClick={() => refreshSuggestion(viewingStudent.id)}>
                        <RefreshCw size={14} className={suggestionLoading ? "spin" : ""} />
                      </button>
                    </div>
                    <p className="scope-note">AI has drafted a message below from this student's latest scored session. Edit it however you like, then send.</p>
                    <textarea value={draftMessage} onChange={e => setDraftMessage(e.target.value)} rows={7} />
                    <div className="composer-actions">
                      <button className="send-btn" disabled={sending || !draftMessage.trim()} onClick={sendFeedback}><Send size={14} /> {sending ? "Sending…" : "Send to Student"}</button>
                      {sendNote && <span className="send-note">{sendNote}</span>}
                    </div>

                    {sentHistory.length > 0 && (
                      <div className="sent-history">
                        <div className="panel-title"><span>PREVIOUSLY SENT</span></div>
                        {sentHistory.map(m => (
                          <div className="inbox-item" key={m.id}>
                            <small>{new Date(m.created_at).toLocaleString()}</small>
                            <p>{m.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      <style jsx>{css}</style>
    </div>
  );
}

function Metric({ icon, label, value, suffix = "%", text }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <small>{label}</small>
      <strong className={text ? "small-value" : ""}>{value}{text ? "" : suffix}</strong>
    </div>
  );
}

function FeedbackBar({ label, value }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const tone = v >= 85 ? "good" : v >= 70 ? "ok" : "low";
  return (
    <div className="feedback-bar-row">
      <div className="feedback-bar-label"><span>{label}</span><span>{v}%</span></div>
      <div className="feedback-bar-track"><div className={`feedback-bar-fill ${tone}`} style={{ width: `${v}%` }} /></div>
    </div>
  );
}

const css = `.dashboard-shell{max-width:1400px;margin:auto;padding:45px 28px 90px}.dash-loading{min-height:70vh;display:grid;place-items:center;font:800 .8rem var(--font-mono);color:#d90429}.dash-top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #ddd;padding-bottom:28px}.dash-top h1{font:900 clamp(3rem,6vw,5.8rem)/.85 var(--font-display);letter-spacing:-4px;margin:12px 0}.dash-top h1 span{color:#d90429}.dash-top p{color:#777}.logout{display:flex;align-items:center;gap:7px;padding:11px 14px;background:#fff;border:1px solid #ddd;font:700 .7rem var(--font-mono);cursor:pointer}.dash-tabs{display:flex;gap:3px;margin:22px 0;border-bottom:1px solid #ddd;flex-wrap:wrap}.dash-tabs button{border:0;background:#f6f6f7;padding:13px 17px;font:700 .68rem var(--font-mono);cursor:pointer}.dash-tabs button.active{background:#111;color:#fff}.score-hero{background:#111;color:#fff;padding:30px;display:flex;justify-content:space-between;align-items:center}.score-hero small{font:700 .68rem var(--font-mono);color:#aaa}.score-hero strong{display:block;font:900 5rem var(--font-display);line-height:1}.score-hero p{color:#bbb;max-width:600px}.score-ring{width:140px;height:140px;border-radius:50%;display:grid;place-items:center;align-content:center;border:10px solid #333;border-top-color:#d90429;text-align:center}.score-ring span{font:900 2.3rem var(--font-display)}.score-ring small{color:#aaa}.metric-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}.metric-cards.small{grid-template-columns:repeat(3,1fr)}.metric{border:1px solid #ddd;padding:18px;background:#fff}.metric-icon{color:#d90429;margin-bottom:12px}.metric small{display:block;font:700 .62rem var(--font-mono);color:#777}.metric strong{display:block;font:900 1.9rem var(--font-display);margin-top:5px}.metric strong.small-value{font-size:1rem;line-height:1.2}.quick-feedback{display:flex;gap:10px;align-items:flex-start;border:1px solid #ffd6dd;background:#fff5f6;padding:14px 16px;margin-bottom:14px;color:#7a1128}.quick-feedback svg{flex-shrink:0;margin-top:2px;color:#d90429}.quick-feedback p{margin:0;font-size:.85rem;line-height:1.5}.coach-inbox{border:1px solid #ddd;background:#fff;padding:20px;margin-bottom:14px}.inbox-item{border-top:1px solid #eee;padding:12px 0}.inbox-item:first-of-type{border-top:0}.inbox-item b{font-size:.85rem}.inbox-item small{display:block;color:#999;font-size:.68rem;margin:2px 0 6px}.inbox-item p{margin:0;color:#444;font-size:.85rem;line-height:1.5;white-space:pre-line}.dash-grid{display:grid;grid-template-columns:1.3fr .7fr;gap:14px}.panel,.coach-large{border:1px solid #ddd;background:#fff;padding:24px}.panel-title{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding-bottom:12px;margin-bottom:20px}.panel-title span{font:800 .7rem var(--font-mono)}.panel-title small{font:600 .62rem var(--font-mono);color:#999}.title-actions{display:flex;align-items:center;gap:12px}.bars{height:280px;display:flex;align-items:flex-end;justify-content:space-around;gap:10px;padding:10px 15px}.bars.small{height:160px}.bar-wrap{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;flex:1}.bar{width:100%;max-width:55px;background:#d90429;min-height:8px}.bar-wrap span{font:700 .65rem var(--font-mono);color:#777}.empty{display:grid;place-items:center;min-height:120px;color:#888;font-size:.9rem;text-align:center}.coach-panel{background:#f8f8fa}.coach-panel h3{font:900 1.8rem var(--font-display)}.coach-panel p{color:#666;line-height:1.6}.coach-panel ul{padding-left:18px;color:#555;line-height:1.7;font-size:.85rem}.coach-panel button{background:#d90429;color:#fff;border:0;padding:12px 15px;font:800 .7rem var(--font-mono);display:flex;gap:7px;align-items:center;cursor:pointer}.history-row,.profile-row{display:flex;justify-content:space-between;gap:20px;padding:17px 0;border-bottom:1px solid #eee;align-items:center}.history-row b{display:block}.history-row small{display:block;color:#888;margin-top:4px}.done,.live{font:700 .65rem var(--font-mono)}.done{color:#047857}.live{color:#d90429}.mark-complete-btn{display:flex;align-items:center;gap:6px;background:#111;color:#fff;border:0;padding:9px 13px;font:700 .65rem var(--font-mono);cursor:pointer;white-space:nowrap}.mark-complete-btn:disabled{opacity:.6;cursor:default}.coach-large h2{font:900 3rem var(--font-display)}.coach-large>p{color:#666;max-width:750px}.coach-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:30px}.coach-steps div{border:1px solid #ddd;padding:22px;display:flex;gap:15px}.coach-steps b{font:900 1.5rem var(--font-display);color:#d90429}.profile-row small{font:700 .65rem var(--font-mono);color:#999;min-width:120px}.profile-row span{flex:1;color:#333}.role-panel{background:#111;color:#fff;margin-bottom:14px}.role-panel .panel-title{border-bottom-color:#333}.role-panel .panel-title span{color:#fff}.role-panel .panel-title small{color:#d90429;font-weight:800}.role-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.role-stat{border:1px solid #333;padding:18px;background:#1a1a1a}.role-stat.wide{grid-column:1/-1}.role-stat small{display:block;font:700 .62rem var(--font-mono);color:#999}.role-stat strong{display:block;font:900 2rem var(--font-display);margin-top:6px;color:#fff}.role-stat ul{margin-top:8px;padding-left:18px;color:#ccc;line-height:1.7;font-size:.85rem}.feedback-list{display:flex;flex-direction:column;gap:16px}.feedback-card{border:1px solid #ddd;padding:20px;background:#fafafa}.feedback-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}.feedback-card-top b{display:block;font-size:1rem}.feedback-card-top small{display:block;color:#888;margin-top:4px;font-size:.75rem}.feedback-score{font:900 1.8rem var(--font-display);color:#d90429}.coach-message{margin:0;color:#444;font-size:.85rem;line-height:1.6;white-space:pre-line}.feedback-bars{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;margin-bottom:16px}.feedback-bar-row{width:100%}.feedback-bar-label{display:flex;justify-content:space-between;font:700 .62rem var(--font-mono);color:#666;margin-bottom:4px}.feedback-bar-track{height:7px;background:#e5e5e5;width:100%}.feedback-bar-fill{height:100%}.feedback-bar-fill.good{background:#047857}.feedback-bar-fill.ok{background:#d97706}.feedback-bar-fill.low{background:#d90429}.feedback-cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:1px solid #e5e5e5;padding-top:14px}.feedback-col-title{font:800 .62rem var(--font-mono);margin-bottom:8px}.feedback-col-title.good{color:#047857}.feedback-col-title.low{color:#d90429}.feedback-notes{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}.feedback-notes li{display:flex;gap:8px;align-items:flex-start;font-size:.82rem;color:#444;line-height:1.5}.feedback-notes li svg{flex-shrink:0;margin-top:2px;color:#d90429}.students-panel{margin-bottom:14px}.scope-note{color:#888;font-size:.8rem;margin:-8px 0 16px}.students-table{width:100%;border-collapse:collapse;font-size:.85rem}.students-table th{text-align:left;font:700 .62rem var(--font-mono);color:#999;padding:8px 10px;border-bottom:1px solid #ddd}.students-table td{padding:10px;border-bottom:1px solid #eee}.students-table td.muted{color:#666}.students-table input,.students-table select{width:100%;padding:6px 8px;border:1px solid #ccc;font-size:.82rem;font-family:inherit}.row-actions{display:flex;gap:6px;white-space:nowrap}.icon-btn{border:1px solid #ddd;background:#fff;padding:6px 8px;cursor:pointer;display:flex}.icon-btn:hover{background:#f6f6f7}.icon-btn.danger{color:#d90429;border-color:#f3c8ce}.icon-btn.danger:hover{background:#fff5f6}.icon-btn:disabled{opacity:.5;cursor:default}.icon-btn svg.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.row-error{color:#d90429;font-size:.8rem;margin-top:10px}.add-user-btn{display:flex;align-items:center;gap:6px;background:#111;color:#fff;border:0;padding:8px 12px;font:700 .65rem var(--font-mono);cursor:pointer}.add-user-form{display:grid;grid-template-columns:1.3fr 1.5fr 1fr 1fr auto;gap:8px;background:#f6f6f7;padding:14px;margin-bottom:16px;align-items:center}.add-user-form input,.add-user-form select{padding:8px;border:1px solid #ccc;font-size:.82rem;font-family:inherit}.save-user-btn{display:flex;align-items:center;gap:6px;background:#047857;color:#fff;border:0;padding:8px 12px;font:700 .65rem var(--font-mono);cursor:pointer;white-space:nowrap}.student-detail-panel{border:2px solid #111;margin-bottom:14px}.inner-panel{border:1px solid #eee;padding:16px}.mini-history{display:flex;flex-direction:column;gap:2px}.mini-history-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;font-size:.82rem}.feedback-composer{border-top:1px solid #eee;margin-top:20px;padding-top:20px}.feedback-composer textarea{width:100%;padding:12px;border:1px solid #ccc;font-family:inherit;font-size:.85rem;line-height:1.6;resize:vertical}.composer-actions{display:flex;align-items:center;gap:14px;margin-top:10px}.send-btn{display:flex;align-items:center;gap:7px;background:#d90429;color:#fff;border:0;padding:11px 16px;font:800 .7rem var(--font-mono);cursor:pointer}.send-btn:disabled{opacity:.5;cursor:default}.send-note{font-size:.8rem;color:#047857}.sent-history{margin-top:20px;border-top:1px solid #eee;padding-top:16px}.mini-history-right{display:flex;align-items:center;gap:8px}.conversation-panel{border:2px solid #111;background:#fafafa;padding:20px;margin-top:14px}.conversation-panel .panel-title span{display:flex;align-items:center;gap:8px}.transcript{display:flex;flex-direction:column;gap:16px;max-height:520px;overflow-y:auto}.transcript-turn{display:flex;flex-direction:column;gap:8px}.transcript-bubble{padding:14px 16px;border:1px solid #ddd;max-width:88%}.transcript-bubble.student{background:#fff;align-self:flex-start}.transcript-bubble.ai{background:#111;color:#eee;align-self:flex-end}.transcript-bubble small{display:block;font:700 .62rem var(--font-mono);color:#999;margin-bottom:6px}.transcript-bubble.ai small{color:#d90429}.transcript-bubble p{margin:0;font-size:.85rem;line-height:1.6;white-space:pre-line}.transcript-bubble .coaching-tip{margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:.78rem;color:#ccc}.fallacy-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.fallacy-tag{background:#fff5f6;color:#d90429;border:1px solid #f3c8ce;padding:3px 8px;font:700 .62rem var(--font-mono)}@media(max-width:850px){.metric-cards,.metric-cards.small,.dash-grid,.coach-steps,.role-stats,.feedback-bars,.feedback-cols{grid-template-columns:1fr 1fr}.score-hero{align-items:flex-start}.score-ring{display:none}.add-user-form{grid-template-columns:1fr 1fr}}@media(max-width:600px){.metric-cards,.metric-cards.small,.dash-grid,.coach-steps,.role-stats,.feedback-bars,.feedback-cols{grid-template-columns:1fr}.dash-top{align-items:flex-start;gap:20px}.dash-top h1{font-size:3.5rem}.students-table{display:block;overflow-x:auto}.add-user-form{grid-template-columns:1fr}}`;
