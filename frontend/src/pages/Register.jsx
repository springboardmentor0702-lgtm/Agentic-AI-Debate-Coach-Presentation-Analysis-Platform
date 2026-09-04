import { useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import PasswordChecklist, { isPasswordValid } from "../components/PasswordChecklist";
import ThemeToggle from "../components/ThemeToggle";
import ThemeColorPicker from "../components/ThemeColorPicker";
import Footer from "../components/Footer";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";

// Same lazy-chunk reasoning as Home.jsx - keeps three.js out of every
// authenticated page's bundle.
const ShardField = lazy(() => import("../components/three/ShardField"));

const selectClass =
  "w-full bg-glass border border-glass-border backdrop-blur-xl rounded-xl px-4 py-3 text-base text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors";

const ROLE_OPTIONS = [
  { value: "learner", label: "Learner" },
  { value: "debate_coach", label: "Debate Coach" },
  { value: "educator", label: "Educator" },
];

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("learner");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Uses AuthContext's signUp() - which already correctly does
  // signup -> create profile -> sign back out - instead of
  // reimplementing that sequence here and staying signed in.
  // Registering and logging in are kept as two distinct, explicit
  // steps: creating an account lands you on the login page, not
  // straight into the app.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError("Password doesn't meet the requirements below.");
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        email,
        password,
        full_name: fullName,
        username: username || null,
        role,
      });
      navigate("/login", { state: { message: "Account created — log in to get started." } });
    } catch (err) {
      setError(
        err.response?.data?.detail || err.message || "Could not create your account."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink relative overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      <div
        className="aurora-drift fixed inset-0 pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, var(--accent-soft), transparent 45%), radial-gradient(circle at 20% 80%, var(--accent-2-soft), transparent 45%)",
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
        className="relative w-full max-w-md"
      >
        <GlassCard className="p-8">
          <p className="font-mono text-xs tracking-widest text-accent uppercase mb-4">Open a case file</p>
          <h1 className="font-display text-3xl mb-1">Create your account.</h1>
          <p className="text-faint mb-8">Free, no credit card, ever.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassField
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />

            <GlassField
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (optional — lets others find and invite you)"
            />

            <GlassField
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />

            <GlassField
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />

            <PasswordChecklist password={password} />

            <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {error && <p className="text-sm text-danger">{error}</p>}

            <GlassButton type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Spinner size={12} className="border-surface/40 border-t-surface" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </GlassButton>
          </form>

          <p className="text-sm text-faint mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </p>
        </GlassCard>
      </motion.div>

      <Footer variant="minimal" className="w-full max-w-md" />
    </div>
  );
}
