import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCog } from "lucide-react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import PasswordChecklist, { isPasswordValid } from "../components/PasswordChecklist";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";

const selectClass =
  "w-full bg-glass border border-glass-border backdrop-blur-xl rounded-xl px-4 py-3 text-base text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block font-mono text-xs text-faint uppercase tracking-wide mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-faint mt-1">{hint}</span>}
    </label>
  );
}

export default function EditProfile() {
  const { profile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    experience_level: profile?.experience_level || "Beginner",
    preferred_debate_topics: (profile?.preferred_debate_topics || []).join(", "),
    presentation_domains: (profile?.presentation_domains || []).join(", "),
    learning_goals: profile?.learning_goals || "",
    coaching_preferences: profile?.coaching_preferences || "",
    participate_in_comparison: profile?.participate_in_comparison || false,
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const update = (field) => (e) => {
    setSaveSuccess(false);
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await api.patch("/profiles/me", {
        full_name: form.full_name,
        username: form.username || null,
        experience_level: form.experience_level,
        preferred_debate_topics: form.preferred_debate_topics
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        presentation_domains: form.presentation_domains
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        learning_goals: form.learning_goals,
        coaching_preferences: form.coaching_preferences,
        participate_in_comparison: form.participate_in_comparison,
      });
      await refreshProfile();
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err.response?.data?.detail || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  // Password change section - separate form/action from profile
  // fields, since it's a different kind of update (Supabase Auth
  // itself, not the profiles table).
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    // Checked directly against the real password rules at submit
    // time - PasswordChecklist is just the visual display, it
    // doesn't report validity back via any callback prop.
    if (!isPasswordValid(newPassword)) {
      setPasswordError("Password doesn't meet the requirements above.");
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(err.message || "Could not change your password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="rounded-xl bg-accent-soft p-2.5">
          <UserCog size={20} className="text-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-4xl">Your profile, your terms.</h1>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-10">
        <GlassCard className="p-6 h-fit">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase">
              Profile
            </h2>

            <Field label="Full name">
              <GlassField required value={form.full_name} onChange={update("full_name")} />
            </Field>

            <Field
              label="Username"
              hint="3-20 characters, letters/numbers/underscore, must start with a letter. Used so other people can find and invite you - optional."
            >
              <GlassField value={form.username} onChange={update("username")} placeholder="e.g. alex_chen" />
            </Field>

            <Field label="Experience level">
              <select value={form.experience_level} onChange={update("experience_level")} className={selectClass}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </Field>

            <Field label="Preferred debate topics" hint="Comma-separated">
              <GlassField value={form.preferred_debate_topics} onChange={update("preferred_debate_topics")} />
            </Field>

            <Field label="Presentation domains" hint="Comma-separated">
              <GlassField value={form.presentation_domains} onChange={update("presentation_domains")} />
            </Field>

            <Field label="Learning goals">
              <GlassField multiline value={form.learning_goals} onChange={update("learning_goals")} rows={2} />
            </Field>

            <Field label="Coaching preferences">
              <GlassField multiline value={form.coaching_preferences} onChange={update("coaching_preferences")} rows={2} />
            </Field>

            {profile.role === "learner" && (
              <label className="flex items-start gap-3 border border-glass-border rounded-xl bg-glass backdrop-blur-xl px-3 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.participate_in_comparison}
                  onChange={(e) => {
                    setSaveSuccess(false);
                    setForm((f) => ({ ...f, participate_in_comparison: e.target.checked }));
                  }}
                  className="mt-0.5 accent-accent"
                />
                <span>
                  <span className="block text-sm">Join anonymous peer comparison</span>
                  <span className="block text-xs text-faint mt-0.5">
                    See how your scores compare to other opted-in learners as a percentile —
                    your name and exact scores are never shown to anyone else. See{" "}
                    <Link to="/comparison" className="text-accent hover:underline">
                      Peer Comparison
                    </Link>{" "}
                    once enabled.
                  </span>
                </span>
              </label>
            )}

            {saveError && <p className="text-sm text-danger">{saveError}</p>}
            {saveSuccess && <p className="text-sm text-ok">Saved.</p>}

            <GlassButton type="submit" variant="primary" disabled={saving}>
              {saving ? <Spinner size={12} className="border-surface/40 border-t-surface" /> : "Save profile"}
            </GlassButton>
          </form>
        </GlassCard>

        <GlassCard className="p-6 h-fit">
          <form onSubmit={handleChangePassword} className="space-y-5">
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase">
              Change password
            </h2>

            <Field label="New password">
              <GlassField type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Field>

            <PasswordChecklist password={newPassword} />

            <Field label="Confirm new password">
              <GlassField type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </Field>

            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-ok">Password changed.</p>}

            <GlassButton type="submit" variant="glass" disabled={passwordSaving}>
              {passwordSaving ? <Spinner size={12} /> : "Change password"}
            </GlassButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
