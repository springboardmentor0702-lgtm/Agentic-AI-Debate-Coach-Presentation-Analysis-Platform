import { useState, lazy, Suspense } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Swords, BookOpen, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import ThemeColorPicker from "../components/ThemeColorPicker";
import Footer from "../components/Footer";
import Spinner from "../components/Spinner";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";
// Same lazy-chunk reasoning as Home.jsx - keeps three.js out of every
// authenticated page's bundle.
const ShardField = lazy(() => import("../components/three/ShardField"));

// Purely a "who are you" cosmetic selector - login itself is just
// email + password regardless of role (the backend determines the
// real role from the profile after auth, never from anything picked
// here). Selecting one only changes the headline/icon shown; the
// actual signIn() call below never reads `selectedRole` at all.
const ROLE_OPTIONS = [
  { key: "learner", label: "Learner", icon: GraduationCap },
  { key: "debate_coach", label: "Debate Coach", icon: Swords },
  { key: "educator", label: "Educator", icon: BookOpen },
  { key: "admin", label: "Admin", icon: ShieldCheck },
];

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState("learner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const infoMessage = location.state?.message;
  const activeRole = ROLE_OPTIONS.find((r) => r.key === selectedRole);

  // Identical to the pre-revamp version: same signIn() call, same
  // navigation target, same error surfacing. `selectedRole` never
  // factors into this - it's cosmetic only.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Could not log you in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink relative overflow-hidden flex flex-col justify-center px-6 py-12">
      <div
        className="aurora-drift fixed inset-0 pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, var(--accent-soft), transparent 45%), radial-gradient(circle at 80% 70%, var(--accent-2-soft), transparent 45%)",
        }}
        aria-hidden="true"
      />
      <Suspense fallback={null}>
        <ShardField className="absolute inset-0 pointer-events-none opacity-70" />
      </Suspense>

      <Link
        to="/"
        className="absolute top-6 left-6 font-display text-lg tracking-tight z-10 hover:text-accent transition-colors"
      >
        ClashLab
      </Link>
      <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
        <ThemeToggle
          iconOnly
          className="p-2.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl text-ink hover:border-accent transition-colors"
        />
        <ThemeColorPicker className="p-2.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl hover:border-accent transition-colors" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative max-w-sm mx-auto w-full"
      >
        <p className="font-mono text-xs tracking-widest text-faint uppercase text-center mb-3">
          I'm logging in as...
        </p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {ROLE_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedRole(key)}
              title={label}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-colors ${
                selectedRole === key
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-glass-border bg-glass text-faint hover:text-ink hover:border-accent/40"
              }`}
            >
              <Icon size={17} strokeWidth={1.75} />
              <span className="font-mono text-[9px] uppercase tracking-wide leading-tight text-center px-0.5">
                {label}
              </span>
            </button>
          ))}
        </div>

        <GlassCard className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-mono text-xs tracking-widest text-accent uppercase mb-4">
                {activeRole.label} Login
              </p>
              <h1 className="font-display text-4xl mb-2">Welcome back.</h1>
              <p className="text-faint mb-8">Log in to pick up where you left off.</p>
            </motion.div>
          </AnimatePresence>

          {infoMessage && (
            <p className="text-sm text-ok border border-ok/30 bg-ok/10 rounded-xl px-3 py-2.5 mb-6">
              {infoMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <GlassField
              label="Email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <GlassField
              label="Password"
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <GlassButton type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size={14} className="border-surface/40 border-t-surface" />
                  Verifying...
                </span>
              ) : (
                "Log in"
              )}
            </GlassButton>
          </form>

          <p className="text-sm text-faint mt-6">
            No file yet?{" "}
            <Link to="/register" className="text-accent hover:underline">
              Open one
            </Link>
          </p>
        </GlassCard>
      </motion.div>

      <Footer variant="minimal" className="max-w-sm mx-auto w-full" />
    </div>
  );
}
