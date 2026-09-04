/**
 * Small branded spinner - replaces plain "Loading..." text throughout
 * the app. Pure CSS animation (Tailwind's built-in animate-spin), no
 * new dependency.
 */
export default function Spinner({ size = 16, className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-line border-t-accent ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Centered spinner + label for a section/panel that's loading -
 * the standard replacement for `<p>Loading...</p>` everywhere.
 */
export function LoadingBlock({ label = "Loading...", className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 text-sm text-faint ${className}`}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
