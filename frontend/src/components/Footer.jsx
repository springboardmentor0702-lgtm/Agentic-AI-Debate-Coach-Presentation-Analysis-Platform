import { Link } from "react-router-dom";

const YEAR = new Date().getFullYear();

function CreditLine() {
  return (
    <p>
      Developed by{" "}
      <a
        href="https://www.linkedin.com/in/madhusuthanan-g-maddy0001/"
        target="_blank"
        rel="noreferrer"
        className="text-accent hover:underline"
      >
        Madhusuthanan G
      </a>
    </p>
  );
}

/**
 * `variant="full"` (default) - the complete footer with brand blurb,
 * quick links, and the about-this-build note. Meant for the public
 * Home page.
 *
 * `variant="minimal"` - just the copyright + developer credit line,
 * for auth pages (Login/Register) and inside the authenticated app
 * shell, where a full multi-column footer would be out of place on
 * every single screen.
 */
export default function Footer({ variant = "full", className = "" }) {
  if (variant === "minimal") {
    return (
      <footer className={`border-t border-glass-border mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-faint ${className}`}>
        <p>© {YEAR} ClashLab.</p>
        <CreditLine />
      </footer>
    );
  }

  return (
    <footer className={`border-t border-glass-border mt-20 pt-10 pb-4 ${className}`}>
      <div className="grid sm:grid-cols-3 gap-8 mb-10">
        <div>
          <p className="font-display text-lg mb-2">ClashLab</p>
          <p className="text-sm text-faint leading-relaxed max-w-xs">
            Free AI-powered debate coaching and presentation analysis — argument
            scoring, fallacy detection, rebuttal prep, and a live AI opponent that
            judges you round by round.
          </p>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-faint mb-3">
            Get started
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/register" className="hover:text-accent transition-colors w-fit">
              Create an account
            </Link>
            <Link to="/login" className="hover:text-accent transition-colors w-fit">
              Log in
            </Link>
            <Link to="/topics" className="hover:text-accent transition-colors w-fit">
              Browse debate topics
            </Link>
          </div>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-faint mb-3">
            About this build
          </p>
          <p className="text-sm text-faint leading-relaxed max-w-xs">
            Runs entirely on free-tier infrastructure — four distinct AI reasoning
            architectures, real-time human-vs-human debate, and a full coaching and
            analytics layer, built as a solo project.
          </p>
        </div>
      </div>

      <div className="border-t border-glass-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-faint">
        <p>© {YEAR} ClashLab. Built for practice, not profit.</p>
        <CreditLine />
      </div>
    </footer>
  );
}
