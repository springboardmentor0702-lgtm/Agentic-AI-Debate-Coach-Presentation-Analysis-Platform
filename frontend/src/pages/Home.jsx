import { useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileSearch,
  AlertTriangle,
  Swords,
  Bot,
  Mic,
  Sparkles,
  ChevronDown,
  GitBranch,
  Workflow,
  Search,
  MessageCircleQuestion,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import ThemeColorPicker from "../components/ThemeColorPicker";
import Footer from "../components/Footer";
import GlassCard from "../components/ui/GlassCard";
import GlassButton from "../components/ui/GlassButton";

// three.js + @react-three/fiber + drei are a genuinely heavy chunk
// (~1MB) needed only on this page - split them into their own lazy
// chunk so every other route (dashboards, tools) never downloads
// them at all, instead of the whole app paying that weight upfront.
const ClashCore = lazy(() => import("../components/three/ClashCore"));

const FEATURES = [
  {
    icon: FileSearch,
    title: "Argument Analysis",
    desc: "Score any argument on clarity, evidence, and logical consistency.",
  },
  {
    icon: AlertTriangle,
    title: "Fallacy Detection",
    desc: "Catch the 8 classic reasoning traps before your opponent does.",
  },
  {
    icon: Swords,
    title: "Counterarguments",
    desc: "See the strongest rebuttals coming, before they arrive.",
  },
  {
    icon: Bot,
    title: "Debate Simulation",
    desc: "Debate a live AI opponent, judged round by round.",
  },
  {
    icon: Mic,
    title: "Presentation Analysis",
    desc: "Speak out loud. Get pace, filler words, and delivery scored.",
  },
  {
    icon: Sparkles,
    title: "Coaching Plan",
    desc: "A personalized path, grounded in real debate technique.",
  },
];

// The four genuinely distinct AI architectures behind the platform,
// per ClashLab_Project_Report.docx Section 5 - a real technical
// differentiator, not marketing filler, so it earns a section of its
// own instead of being buried in a feature list.
const ARCHITECTURES = [
  {
    icon: Workflow,
    label: "Fixed pipeline",
    used: "Coaching Plan, Full Case Review",
    desc: "The same proven sequence every time - no procedural guesswork where none is needed.",
  },
  {
    icon: GitBranch,
    label: "Multi-agent graph",
    used: "AI Debate Simulation",
    desc: "A distinct Opponent and a distinct Judge, each with one job, running in fixed order.",
  },
  {
    icon: Search,
    label: "Self-directed loop",
    used: "Debate Prep Research",
    desc: "The model decides for itself how many times to search before it's ready to answer.",
  },
  {
    icon: MessageCircleQuestion,
    label: "Tool-calling agent",
    used: "Ask Your Coach",
    desc: "Chooses which tools it needs per question - and never acts without your confirmation.",
  },
];

function StatusLight({ state }) {
  const styles = {
    idle: "bg-faint/40",
    checking: "bg-accent animate-pulse",
    ok: "bg-ok",
    fail: "bg-danger",
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${styles[state]}`} />;
}

function SystemCheck({ title, actionLabel, onRun, state, result }) {
  return (
    <div className="border-b border-glass-border py-5 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusLight state={state} />
          <span className="text-sm">{title}</span>
        </div>
        <button
          onClick={onRun}
          disabled={state === "checking"}
          className="font-mono text-xs uppercase tracking-wide border border-glass-border text-ink px-3 py-1.5 rounded-full hover:border-accent hover:text-accent disabled:opacity-40 transition-colors shrink-0"
        >
          {state === "checking" ? "Running..." : actionLabel}
        </button>
      </div>
      {result && (
        <p className="font-mono text-xs text-faint mt-2 leading-relaxed break-words">{result}</p>
      )}
    </div>
  );
}

export default function Home() {
  const { session } = useAuth();
  const [backend, setBackend] = useState({ state: "idle", result: null });
  const [llm, setLlm] = useState({ state: "idle", result: null });
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  // Identical to the pre-revamp version - same endpoints, same
  // response shape, same error handling. Only the container around
  // it changed.
  const runBackendCheck = async () => {
    setBackend({ state: "checking", result: null });
    try {
      const res = await api.get("/health");
      setBackend({ state: "ok", result: res.data.message });
    } catch {
      setBackend({ state: "fail", result: "No response. Is uvicorn running on port 8000?" });
    }
  };

  const runLlmCheck = async () => {
    setLlm({ state: "checking", result: null });
    try {
      const res = await api.post("/health/llm", { prompt: "Say hello in exactly five words." });
      setLlm({ state: "ok", result: `"${res.data.response}"` });
    } catch (err) {
      setLlm({
        state: "fail",
        result: err.response?.data?.detail || "Check your API keys in backend/.env",
      });
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink relative overflow-x-hidden">
      {/* Ambient aurora wash behind everything - CSS only, cheap */}
      <div
        className="aurora-drift fixed inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, var(--accent-soft), transparent 40%), radial-gradient(circle at 85% 15%, var(--accent-2-soft), transparent 45%), radial-gradient(circle at 50% 90%, var(--accent-soft), transparent 40%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-6 py-8 md:py-10">
        <nav className="flex justify-between items-center mb-12 md:mb-16">
          <span className="font-display text-xl tracking-tight">ClashLab</span>
          <div className="flex items-center gap-3">
            <ThemeToggle
              iconOnly
              className="p-2.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl text-ink hover:border-accent transition-colors"
            />
            <ThemeColorPicker className="p-2.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl hover:border-accent transition-colors" />
            {session ? (
              <GlassButton as={Link} to="/dashboard" variant="primary">
                Continue to dashboard
              </GlassButton>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-mono text-xs uppercase tracking-wide text-faint hover:text-ink transition-colors px-2"
                >
                  Log in
                </Link>
                <GlassButton as={Link} to="/register" variant="primary">
                  Get started free
                </GlassButton>
              </>
            )}
          </div>
        </nav>

        {/* Hero */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center mb-28 md:mb-36">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="font-mono text-xs tracking-widest text-accent uppercase mb-6">
              Free, forever · every AI tool included · no credit card
            </p>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05] mb-6">
              Every argument
              <br />
              has a fracture line.
              <br />
              <span className="text-accent">Find yours first.</span>
            </h1>
            <p className="text-faint text-lg leading-relaxed max-w-lg mb-9">
              Argument scoring, fallacy detection, rebuttal generation, and a live AI
              debate opponent that judges you round by round — the practice tools a real
              debate program uses, built to run on nothing but free infrastructure.
            </p>
            {!session && (
              <div className="flex items-center gap-5">
                <GlassButton as={Link} to="/register" variant="primary" className="px-8 py-4 text-sm">
                  Open your case file
                </GlassButton>
                <Link
                  to="/login"
                  className="font-mono text-sm uppercase tracking-wide text-faint hover:text-ink transition-colors"
                >
                  Log in
                </Link>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            className="relative h-[300px] md:h-[420px]"
          >
            <Suspense fallback={null}>
              <ClashCore className="absolute inset-0" />
            </Suspense>
          </motion.div>
        </div>

        {/* Feature grid */}
        <div className="mb-28 md:mb-36">
          <p className="font-mono text-xs tracking-widest text-faint uppercase mb-8">
            Six tools, one case file
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <GlassCard
                key={title}
                hover
                className="p-6"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Icon size={22} className="text-accent mb-4" strokeWidth={1.75} />
                <h3 className="font-display text-lg mb-2">{title}</h3>
                <p className="text-sm text-faint leading-relaxed">{desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Four AI architectures */}
        <div className="mb-28 md:mb-36">
          <p className="font-mono text-xs tracking-widest text-faint uppercase mb-2">
            Under the hood
          </p>
          <h2 className="font-display text-3xl mb-8 max-w-xl">
            Four different kinds of AI reasoning, each used only where it earns its keep.
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {ARCHITECTURES.map(({ icon: Icon, label, used, desc }, i) => (
              <GlassCard
                key={label}
                className="p-6"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-xl bg-accent-soft p-2.5">
                    <Icon size={18} className="text-accent" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base mb-1">{label}</h3>
                    <p className="font-mono text-[11px] text-accent-2 uppercase tracking-wide mb-2">
                      {used}
                    </p>
                    <p className="text-sm text-faint leading-relaxed">{desc}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        {!session && (
          <GlassCard className="p-10 md:p-14 text-center mb-16 md:mb-20">
            <h2 className="font-display text-3xl md:text-4xl mb-4">Ready to find your fracture line?</h2>
            <p className="text-faint mb-8 max-w-md mx-auto">
              Free, no credit card, ever. Pick a role, and start with any of the six tools.
            </p>
            <GlassButton as={Link} to="/register" variant="primary" className="px-8 py-4 text-sm">
              Open your case file
            </GlassButton>
          </GlassCard>
        )}

        {/* System status - dev utility, tucked away and collapsed by
            default so it doesn't compete with the marketing content
            above, but every check below is the exact same call as
            before the revamp. */}
        <div className="max-w-xl">
          <button
            onClick={() => setDiagnosticsOpen((v) => !v)}
            className="flex items-center gap-2 font-mono text-xs tracking-widest text-faint uppercase hover:text-ink transition-colors mb-3"
          >
            <ChevronDown size={14} className={`transition-transform ${diagnosticsOpen ? "rotate-180" : ""}`} />
            Diagnostics
          </button>
          {diagnosticsOpen && (
            <GlassCard className="p-6">
              <p className="text-xs text-faint mb-4">
                For local setup verification — confirms the backend and AI reasoning engine
                are wired correctly.
              </p>
              <SystemCheck
                title="Backend connection"
                actionLabel="Test"
                onRun={runBackendCheck}
                state={backend.state}
                result={backend.result}
              />
              <SystemCheck
                title="Reasoning engine (Gemini → Groq)"
                actionLabel="Test"
                onRun={runLlmCheck}
                state={llm.state}
                result={llm.result}
              />
            </GlassCard>
          )}
        </div>

        <Footer variant="full" />
      </div>
    </div>
  );
}
