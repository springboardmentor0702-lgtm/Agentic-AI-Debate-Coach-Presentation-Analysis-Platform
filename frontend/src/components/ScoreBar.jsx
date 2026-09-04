/**
 * Reusable labeled progress bar for any 0-10 score. Used by the
 * argument analysis results now, and reused by every later scoring
 * feature (fallacy credibility, presentation metrics, the final
 * weighted performance score in Segment 7) instead of rebuilding this.
 */
export default function ScoreBar({ label, value, max = 10 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-mono text-xs text-faint uppercase tracking-wide">
          {label}
        </span>
        <span className="font-mono text-xs text-ink">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-line rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
