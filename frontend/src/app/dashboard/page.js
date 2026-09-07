"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import useAnalytics from '../../lib/useAnalytics';
import AnalyticsPanel from '../../components/AnalyticsPanel';
import Modal from '../../components/Modal';

/**
 * One dashboard for all four roles.
 *
 * Every role renders the same live analytics panel, fed by
 * GET /dashboards/overview, which returns a role-appropriate payload in a
 * single shared shape. Role-specific extras live in tabs beside it:
 * - Learner: coaching plan + profile settings
 * - Debate Coach / Educator: learner roster with drill-down
 * - Administrator: roster plus the ability to preview any role's analytics
 *
 * No fabricated rows, no placeholder percentages. Anything with no data yet
 * says so.
 */

const STAFF_ROLES = ['Debate Coach', 'Educator', 'Administrator'];

function tabsForRole(role) {
  const tabs = [{ id: 'analytics', label: 'LIVE ANALYTICS' }];
  if (role === 'Learner') {
    tabs.push({ id: 'coaching', label: 'COACHING PLAN' });
  }
  if (STAFF_ROLES.includes(role)) {
    tabs.push({ id: 'roster', label: 'LEARNER ROSTER' });
  }
  tabs.push({ id: 'settings', label: 'PROFILE SETTINGS' });
  return tabs;
}

export default function DashboardPage() {
  const router = useRouter();

  const [booted, setBooted] = useState(false);
  const [userRole, setUserRole] = useState('Learner');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');

  // Administrator-only: preview another role's analytics without switching account.
  const [previewRole, setPreviewRole] = useState('');

  // Staff-only roster + drill-down
  const [roster, setRoster] = useState([]);
  const [rosterError, setRosterError] = useState('');
  const [drillLearner, setDrillLearner] = useState(null);
  const [recommendationModal, setRecommendationModal] = useState(null);
  const [recText, setRecText] = useState('');

  // Learner coaching plan
  const [coachingPlan, setCoachingPlan] = useState(null);
  const [coachingError, setCoachingError] = useState('');
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);
  const [coachingMessage, setCoachingMessage] = useState('');

  // Profile form
  const [profile, setProfile] = useState({
    full_name: '',
    experience_level: 'Intermediate',
    preferred_topics: '',
    presentation_domains: '',
    learning_goals: '',
    coaching_preferences: '',
  });
  const [profileMsg, setProfileMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const analyticsPath = drillLearner
    ? `/dashboards/learner/${drillLearner.user_id}/overview`
    : previewRole
      ? `/dashboards/overview?as_role=${encodeURIComponent(previewRole)}`
      : '/dashboards/overview';

  const analytics = useAnalytics({ path: analyticsPath, enabled: booted });

  useEffect(() => {
    const token = localStorage.getItem('logos_ai_jwt');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const claims = JSON.parse(atob(token.split('.')[1]));
      setUserRole(claims.role || 'Learner');
      setUserEmail(claims.sub || '');
      setBooted(true);
    } catch {
      localStorage.removeItem('logos_ai_jwt');
      router.push('/login');
    }
  }, [router]);

  const loadProfile = useCallback(async () => {
    try {
      const data = await (await apiFetch('/auth/profile/me')).json();
      setProfile({
        full_name: data.full_name || '',
        experience_level: data.experience_level || 'Intermediate',
        preferred_topics: data.preferred_topics || '',
        presentation_domains: data.presentation_domains || '',
        learning_goals: data.learning_goals || '',
        coaching_preferences: data.coaching_preferences || '',
      });
      setUserName(data.full_name || '');
      setUserRole(data.role || 'Learner');
    } catch {
      // The analytics panel surfaces connectivity problems; no need to duplicate.
    }
  }, []);

  const loadCoachingPlan = useCallback(async () => {
    const userId = localStorage.getItem('logos_ai_user_id');
    if (!userId) return;
    try {
      setCoachingPlan(await (await apiFetch(`/coaching/plan/${userId}`)).json());
      setCoachingError('');
    } catch (err) {
      setCoachingPlan(null);
      setCoachingError(err.message || 'No coaching data is available yet.');
    }
  }, []);

  const regenerateCoachingPlan = async () => {
    const userId = localStorage.getItem('logos_ai_user_id');
    if (!userId) return;
    setRegeneratingPlan(true);
    setCoachingMessage('');
    setCoachingError('');
    try {
      const response = await apiFetch(`/coaching/plan/${userId}/regenerate`, { method: 'POST' });
      setCoachingPlan(await response.json());
      setCoachingMessage('Plan regenerated from your latest session data.');
      analytics.refresh();
    } catch (err) {
      setCoachingError(err.message || 'Could not regenerate the coaching plan.');
    } finally {
      setRegeneratingPlan(false);
    }
  };

  const loadRoster = useCallback(async () => {
    try {
      const data = await (await apiFetch('/dashboards/roster')).json();
      setRoster(data.learners || []);
      setRosterError('');
    } catch (err) {
      setRoster([]);
      setRosterError(err.message || 'Could not load the learner roster.');
    }
  }, []);

  useEffect(() => {
    if (!booted) return;
    loadProfile();
    if (userRole === 'Learner') loadCoachingPlan();
    if (STAFF_ROLES.includes(userRole)) loadRoster();
  }, [booted, userRole, loadProfile, loadCoachingPlan, loadRoster]);

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const query = new URLSearchParams({
      full_name: profile.full_name,
      experience_level: profile.experience_level,
      preferred_topics: profile.preferred_topics,
      presentation_domains: profile.presentation_domains,
      learning_goals: profile.learning_goals,
      coaching_preferences: profile.coaching_preferences,
    }).toString();

    try {
      await apiFetch(`/auth/profile/me?${query}`, { method: 'PUT' });
      setUserName(profile.full_name);
      setProfileMsg({ type: 'success', text: 'Profile saved.' });
      if (userRole === 'Learner') loadCoachingPlan();
      analytics.refresh();
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Could not save the profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendRecommendation = async () => {
    if (!recommendationModal || !recText.trim()) return;
    try {
      await apiFetch(`/coaching/recommend/${recommendationModal.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_text: recText }),
      });
      setRecText('');
      setRecommendationModal(null);
      alert('Recommendation sent.');
    } catch (err) {
      alert(err.message || 'Error sending recommendation.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('logos_ai_jwt');
    localStorage.removeItem('logos_ai_user_id');
    localStorage.removeItem('logos_ai_session_id');
    router.push('/login');
  };

  if (!booted) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-pulse font-mono" style={{ fontSize: '0.95rem', color: 'var(--accent-red)' }}>
          VERIFYING SESSION...
        </div>
      </div>
    );
  }

  const tabs = tabsForRole(userRole);
  const setInput = (field) => (event) => setProfile((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="section-container" style={{ paddingTop: '2.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem' }}>
        <div>
          <div className="badge-red-pill" style={{ marginBottom: '0.75rem' }}>
            SESSION ACTIVE · ROLE: {userRole.toUpperCase()}
          </div>
          <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1 }}>
            Welcome, {userName || 'User'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>{userEmail}</p>
        </div>
        <button type="button" onClick={handleLogout} className="btn btn-login" style={{ padding: '0.6rem 1.4rem', fontSize: '0.78rem' }}>
          LOGOUT
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#fff', border: '1px solid var(--border-light)', padding: '6px', marginBottom: '2.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.4rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: activeTab === tab.id ? 'var(--text-primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Live analytics - identical for every role                           */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {(drillLearner || userRole === 'Administrator') && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem', border: '1px solid var(--border-light)', background: '#fff' }}>
              {drillLearner ? (
                <>
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    VIEWING LEARNER: <strong>{drillLearner.full_name}</strong>
                  </span>
                  <button type="button" onClick={() => setDrillLearner(null)} className="btn btn-red" style={{ padding: '0.4rem 1rem', fontSize: '0.7rem' }}>
                    BACK TO MY ANALYTICS
                  </button>
                </>
              ) : (
                <>
                  <label className="font-mono" htmlFor="role-preview" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    PREVIEW ROLE VIEW:
                  </label>
                  <select
                    id="role-preview"
                    value={previewRole}
                    onChange={(event) => setPreviewRole(event.target.value)}
                    className="font-mono"
                    style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', background: '#fff', fontSize: '0.78rem' }}
                  >
                    <option value="">Administrator (my own)</option>
                    <option value="Learner">Learner</option>
                    <option value="Debate Coach">Debate Coach</option>
                    <option value="Educator">Educator</option>
                  </select>
                </>
              )}
            </div>
          )}

          <AnalyticsPanel
            data={analytics.data}
            error={analytics.error}
            lastUpdated={analytics.lastUpdated}
            refreshing={analytics.refreshing}
            onRefresh={analytics.refresh}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Learner: coaching plan                                             */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'coaching' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
          <div style={{ background: 'var(--dark-bg)', color: '#fff', padding: '2rem' }}>
            <div className="font-mono text-red" style={{ fontSize: '0.72rem', marginBottom: '0.5rem' }}>COACHING ENGINE</div>
            <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>
              Active Plan: {coachingPlan?.progress_status || 'Not started'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#ccc', lineHeight: 1.55 }}>
              {coachingPlan?.skill_gap_summary || coachingError || 'Complete a debate session to generate a coaching plan.'}
            </p>
            {coachingPlan?.learning_path_steps?.length ? (
              <>
                <div className="font-mono text-red" style={{ fontSize: '0.72rem', margin: '1.5rem 0 0.5rem' }}>LEARNING PATH</div>
                <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: '#fff' }}>
                  {coachingPlan.learning_path_steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </>
            ) : null}

            {coachingPlan?.coach_recommendations?.length ? (
                <>
                    <div className="font-mono text-red" style={{ fontSize: '0.72rem', margin: '1.5rem 0 0.5rem' }}>RECOMMENDATIONS FROM COACH</div>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: '#fff' }}>
                        {coachingPlan.coach_recommendations.map((rec) => (
                            <li key={rec.id}>{rec.recommendation_text}</li>
                        ))}
                    </ul>
                </>
            ) : null}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border-light)', padding: '2rem' }}>
            <h4 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>
              Recommended Practice Drills
            </h4>
            {coachingPlan?.targeted_recommendations?.length ? (
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {coachingPlan.targeted_recommendations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No recommendations yet. They are generated from your scored sessions.
              </p>
            )}
            <button type="button" onClick={regenerateCoachingPlan} disabled={regeneratingPlan} className="btn btn-dark" style={{ marginTop: '1.5rem', padding: '0.55rem 1.25rem', fontSize: '0.75rem' }}>
              {regeneratingPlan ? 'REGENERATING...' : 'REGENERATE PLAN'}
            </button>
            {coachingMessage && <div role="status" style={{ marginTop: '0.75rem', color: '#059669', fontSize: '0.8rem' }}>{coachingMessage}</div>}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Staff: learner roster with drill-down                              */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'roster' && (
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', padding: '2rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
              Learner Roster
            </h3>
            <button type="button" onClick={loadRoster} className="btn btn-dark" style={{ padding: '0.45rem 1.1rem', fontSize: '0.7rem' }}>
              RELOAD
            </button>
          </div>

          {rosterError ? (
            <div role="alert" style={{ padding: '1rem', background: '#fef2f2', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', fontSize: '0.85rem' }}>
              {rosterError}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th scope="col" style={{ padding: '0.7rem 0.9rem' }}>Student</th>
                    <th scope="col" style={{ padding: '0.7rem 0.9rem' }}>Email</th>
                    <th scope="col" style={{ padding: '0.7rem 0.9rem' }}>Sessions</th>
                    <th scope="col" style={{ padding: '0.7rem 0.9rem' }}>Average</th>
                    <th scope="col" style={{ padding: '0.7rem 0.9rem' }}>Grade</th>
                    <th scope="col" style={{ padding: '0.7rem 0.9rem' }}>Top Logic Gap</th>
                    <th scope="col" style={{ padding: '0.7rem 0.9rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((learner) => (
                    <tr key={learner.user_id} style={{ borderBottom: '1px solid #f3f3f6' }}>
                      <td style={{ padding: '0.8rem 0.9rem', fontWeight: 600 }}>{learner.full_name}</td>
                      <td style={{ padding: '0.8rem 0.9rem', color: 'var(--text-secondary)' }}>{learner.email}</td>
                      <td style={{ padding: '0.8rem 0.9rem' }}>{learner.sessions_completed}/{learner.sessions_total}</td>
                      <td style={{ padding: '0.8rem 0.9rem', color: 'var(--accent-red)', fontWeight: 700 }}>
                        {learner.average_score == null ? '—' : `${learner.average_score}%`}
                      </td>
                      <td style={{ padding: '0.8rem 0.9rem', fontWeight: 700 }}>{learner.grade}</td>
                      <td style={{ padding: '0.8rem 0.9rem' }}>
                        {learner.top_logic_gap ? (
                          <span style={{ background: '#fee2e2', color: 'var(--accent-red)', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
                            {learner.top_logic_gap}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>None flagged</span>
                        )}
                      </td>
                      <td style={{ padding: '0.8rem 0.9rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setDrillLearner(learner);
                            setPreviewRole('');
                            setActiveTab('analytics');
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                        >
                          View
                        </button>
                        {userRole === 'Debate Coach' && (
                            <button
                                type="button"
                                onClick={() => setRecommendationModal(learner)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                            >
                                Recommend
                            </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No learners have registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Recommendation Modal */}
              <Modal
                isOpen={!!recommendationModal}
                onClose={() => setRecommendationModal(null)}
                title={`Send Recommendation to ${recommendationModal?.full_name}`}
                primaryActionText="Send"
                onPrimaryAction={handleSendRecommendation}
              >
                  <label htmlFor="rec-text" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Recommendation</label>
                  <textarea id="rec-text" rows={4} value={recText} onChange={(e) => setRecText(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-light)' }} placeholder="E.g., Great improvement on pacing!" />
              </Modal>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Profile settings                                                    */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'settings' && (
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', padding: '2.5rem 2rem' }}>
          <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Profile Settings
          </h3>

          {profileMsg && (
            <div
              role="status"
              style={{
                padding: '0.8rem 1.2rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                background: profileMsg.type === 'error' ? '#fef2f2' : '#ecfdf5',
                color: profileMsg.type === 'error' ? 'var(--accent-red)' : '#059669',
                border: `1px solid ${profileMsg.type === 'error' ? 'var(--accent-red)' : '#6ee7b7'}`,
              }}
            >
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label htmlFor="full-name" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Full Name</label>
                <input id="full-name" type="text" value={profile.full_name} onChange={setInput('full_name')} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', outline: 'none' }} />
              </div>
              <div>
                <label htmlFor="experience" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Experience Level</label>
                <select id="experience" value={profile.experience_level} onChange={setInput('experience_level')} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', background: '#fff' }}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div>
                <label htmlFor="topics" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Preferred Debate Topics</label>
                <input id="topics" type="text" value={profile.preferred_topics} onChange={setInput('preferred_topics')} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', outline: 'none' }} />
              </div>
              <div>
                <label htmlFor="domains" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Presentation Domains</label>
                <input id="domains" type="text" value={profile.presentation_domains} onChange={setInput('presentation_domains')} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label htmlFor="goals" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Learning Goals</label>
                <textarea id="goals" rows={3} value={profile.learning_goals} onChange={setInput('learning_goals')} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', outline: 'none' }} />
              </div>
              <div>
                <label htmlFor="coaching-pref" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Coaching Style Preference</label>
                <textarea id="coaching-pref" rows={3} value={profile.coaching_preferences} onChange={setInput('coaching_preferences')} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={() => setActiveTab('analytics')} className="btn btn-login" style={{ padding: '0.75rem 1.5rem' }}>
                Cancel
              </button>
              <button type="submit" disabled={savingProfile} className="btn btn-dark" style={{ padding: '0.75rem 2rem' }}>
                {savingProfile ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
