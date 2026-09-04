import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, Check, X, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { LoadingBlock } from "../components/Spinner";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";

const ROLE_LABELS = {
  learner: "Learner",
  debate_coach: "Debate Coach",
  educator: "Educator",
  admin: "Administrator",
};

const ROLE_OPTIONS = ["learner", "debate_coach", "educator", "admin"];

const ACTIVITY_LABELS = {
  argument_analyses: "Argument Analyses",
  fallacy_detections: "Fallacy Checks",
  counterarguments: "Counterargument Runs",
  case_reviews: "Full Case Reviews",
  debate_sessions: "Debate Sessions",
  debate_rounds: "Debate Rounds",
  presentation_analyses: "Presentation Analyses",
  coaching_plans: "Coaching Plans",
};

const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

const selectClass =
  "w-full bg-glass border border-glass-border backdrop-blur-xl rounded-xl px-4 py-3 text-base text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

function StatBox({ label, value, tone, index = 0 }) {
  return (
    <GlassCard
      className="p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03 }}
    >
      <p className="font-mono text-xs text-faint uppercase mb-1">{label}</p>
      <p className={`font-display text-2xl ${tone || ""}`}>{value}</p>
    </GlassCard>
  );
}

function EditUserRow({ user: u, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    full_name: u.full_name || "",
    experience_level: u.experience_level || "Beginner",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(u.id, draft);
    setSaving(false);
  };

  return (
    <div className="px-4 py-3 bg-glass-strong">
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <GlassField
          value={draft.full_name}
          onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
          placeholder="Full name"
        />
        <select
          value={draft.experience_level}
          onChange={(e) => setDraft((d) => ({ ...d, experience_level: e.target.value }))}
          className={selectClass}
        >
          {EXPERIENCE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          aria-label="Save"
          className="text-ok hover:opacity-80 disabled:opacity-40 transition-opacity"
        >
          {saving ? <Spinner size={16} /> : <Check size={18} />}
        </button>
        <button onClick={onCancel} aria-label="Cancel" className="text-faint hover:text-ink transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { profile: currentProfile } = useAuth();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [llmStats, setLlmStats] = useState(null);
  const [error, setError] = useState(null);
  const [roleError, setRoleError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Comparison pool-size setting
  const [poolSize, setPoolSize] = useState(null);
  const [poolSizeDraft, setPoolSizeDraft] = useState("");
  const [savingPoolSize, setSavingPoolSize] = useState(false);
  const [poolSizeError, setPoolSizeError] = useState(null);
  const [poolSizeSaved, setPoolSizeSaved] = useState(false);

  // Create user
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "learner" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState(null);
  const [createUserSuccess, setCreateUserSuccess] = useState(false);

  // Edit user
  const [editingUserId, setEditingUserId] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.get("/dashboards/admin/overview"),
      api.get("/dashboards/admin/users"),
      api.get("/dashboards/admin/llm-stats"),
      api.get("/dashboards/admin/settings"),
    ])
      .then(([overviewRes, usersRes, llmRes, settingsRes]) => {
        setOverview(overviewRes.data);
        setUsers(usersRes.data);
        setLlmStats(llmRes.data);
        setPoolSize(settingsRes.data.comparison_min_pool_size);
        setPoolSizeDraft(String(settingsRes.data.comparison_min_pool_size));
      })
      .catch((err) => setError(err.response?.data?.detail || "Could not load platform data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setRoleError(null);
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    try {
      await api.patch(`/dashboards/admin/users/${userId}/role`, { role: newRole });
    } catch (err) {
      setUsers(previous);
      setRoleError(err.response?.data?.detail || "Could not update that user's role.");
    }
  };

  const handleSavePoolSize = async (e) => {
    e.preventDefault();
    setPoolSizeError(null);
    setPoolSizeSaved(false);
    setSavingPoolSize(true);
    try {
      const res = await api.patch("/dashboards/admin/settings", {
        comparison_min_pool_size: parseInt(poolSizeDraft, 10),
      });
      setPoolSize(res.data.comparison_min_pool_size);
      setPoolSizeSaved(true);
    } catch (err) {
      setPoolSizeError(err.response?.data?.detail || "Could not save that setting.");
    } finally {
      setSavingPoolSize(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateUserError(null);
    setCreateUserSuccess(false);
    setCreatingUser(true);
    try {
      const res = await api.post("/dashboards/admin/users", newUser);
      setUsers((prev) => [res.data, ...prev]);
      setNewUser({ email: "", password: "", full_name: "", role: "learner" });
      setCreateUserSuccess(true);
    } catch (err) {
      setCreateUserError(err.response?.data?.detail || "Could not create that account.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveEdit = async (userId, changes) => {
    try {
      const res = await api.patch(`/dashboards/admin/users/${userId}`, changes);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...res.data } : u)));
      setEditingUserId(null);
    } catch {
      loadAll();
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Permanently delete ${u.full_name}'s account? This cannot be undone.`)) {
      return;
    }
    const previous = users;
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    try {
      await api.delete(`/dashboards/admin/users/${u.id}`);
    } catch (err) {
      setUsers(previous);
      setRoleError(err.response?.data?.detail || "Could not delete that account.");
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="rounded-xl bg-accent-soft p-2.5">
          <ShieldCheck size={20} className="text-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-4xl">The whole platform, at a glance.</h1>
      </motion.div>

      {loading && <LoadingBlock />}
      {error && <p className="text-sm text-danger">{error}</p>}

      {overview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <StatBox label="Total Users" value={overview.total_users} />
            {Object.entries(overview.users_by_role).map(([role, count], i) => (
              <StatBox key={role} label={`${ROLE_LABELS[role] || role}s`} value={count} index={i + 1} />
            ))}
          </div>

          <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
            Platform activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {Object.entries(overview.activity_counts).map(([key, count], i) => (
              <StatBox key={key} label={ACTIVITY_LABELS[key] || key} value={count} index={i} />
            ))}
          </div>
        </>
      )}

      {llmStats && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
            AI model health
          </h2>
          <p className="text-xs text-faint mb-4">
            Since the backend was last restarted — how often each provider has actually
            served a request, and how often it's had to fall back or fail.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Gemini — Success" value={llmStats.gemini_success} tone="text-ok" />
            <StatBox label="Gemini — Failed" value={llmStats.gemini_failure} tone={llmStats.gemini_failure > 0 ? "text-danger" : ""} index={1} />
            <StatBox label="Groq — Success" value={llmStats.groq_success} tone="text-ok" index={2} />
            <StatBox label="Groq — Failed" value={llmStats.groq_failure} tone={llmStats.groq_failure > 0 ? "text-danger" : ""} index={3} />
          </div>
        </motion.div>
      )}

      {poolSize !== null && (
        <div className="mb-10 max-w-md">
          <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
            Peer Comparison settings
          </h2>
          <form onSubmit={handleSavePoolSize} className="flex items-end gap-3">
            <GlassField
              label="Minimum opted-in pool size"
              type="number"
              min="2"
              value={poolSizeDraft}
              onChange={(e) => {
                setPoolSizeSaved(false);
                setPoolSizeDraft(e.target.value);
              }}
              className="flex-1"
            />
            <GlassButton type="submit" variant="primary" disabled={savingPoolSize}>
              {savingPoolSize ? <Spinner size={14} className="border-surface/40 border-t-surface" /> : "Save"}
            </GlassButton>
          </form>
          <p className="text-xs text-faint mt-2">
            Lower values mean less anonymity protection — with a pool of 2, a learner's
            percentile reveals whether they scored above or below that one other person.
          </p>
          {poolSizeError && <p className="text-sm text-danger mt-2">{poolSizeError}</p>}
          {poolSizeSaved && <p className="text-sm text-ok mt-2">Saved.</p>}
        </div>
      )}

      <div className="mb-10 max-w-2xl">
        <h2 className="font-mono text-xs tracking-widest text-faint uppercase mb-4">
          Create a user account
        </h2>
        <p className="text-xs text-faint mb-4">
          There's no email sending set up in this project — share the password with the
          person yourself after creating their account. There's no invite email.
        </p>
        <GlassCard className="p-5">
          <form onSubmit={handleCreateUser} className="grid sm:grid-cols-2 gap-4">
            <GlassField
              required
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
              placeholder="Email"
            />
            <GlassField
              required
              type="text"
              value={newUser.password}
              onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
              placeholder="Temporary password (8+ characters)"
            />
            <GlassField
              required
              value={newUser.full_name}
              onChange={(e) => setNewUser((u) => ({ ...u, full_name: e.target.value }))}
              placeholder="Full name"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
              className={selectClass}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>

            {createUserError && <p className="text-sm text-danger sm:col-span-2">{createUserError}</p>}
            {createUserSuccess && <p className="text-sm text-ok sm:col-span-2">Account created.</p>}

            <GlassButton type="submit" variant="primary" disabled={creatingUser} className="sm:col-span-2">
              {creatingUser ? (
                <>
                  <Spinner size={12} className="border-surface/40 border-t-surface" />
                  Creating...
                </>
              ) : (
                "Create account"
              )}
            </GlassButton>
          </form>
        </GlassCard>
      </div>

      {users.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs tracking-widest text-faint uppercase">All users</h2>
            {roleError && <span className="font-mono text-xs text-danger">{roleError}</span>}
          </div>
          <div className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border overflow-hidden">
            {users.map((u) =>
              editingUserId === u.id ? (
                <EditUserRow
                  key={u.id}
                  user={u}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingUserId(null)}
                />
              ) : (
                <div key={u.id} className="group flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{u.full_name}</p>
                    <p className="font-mono text-xs text-faint uppercase">
                      {u.experience_level || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {u.id === currentProfile?.id ? (
                      <span className="font-mono text-xs text-faint uppercase">
                        {ROLE_LABELS[u.role] || u.role} (you)
                      </span>
                    ) : (
                      <>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="font-mono text-xs uppercase bg-glass border border-glass-border rounded-full px-2 py-1 text-accent focus:outline-none focus:border-accent"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingUserId(u.id)}
                          aria-label="Edit user"
                          className="opacity-0 group-hover:opacity-100 text-faint hover:text-accent transition-opacity"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          aria-label="Delete user"
                          className="opacity-0 group-hover:opacity-100 text-faint hover:text-danger transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
