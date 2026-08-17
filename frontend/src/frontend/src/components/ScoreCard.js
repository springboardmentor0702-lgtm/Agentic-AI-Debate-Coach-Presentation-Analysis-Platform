"use client";

/**
 * ScoreCard
 * ---------
 * Reusable display for LOGOS.AI's 5-part weighted performance model:
 *   Argument Quality   30%
 *   Evidence           20%
 *   Consistency        20%
 *   Rebuttal           15%
 *   Communication      15%
 *
 * Usage:
 *   <ScoreCard
 *     scores={{
 *       argQuality: 88,
 *       evidence: 74,
 *       consistency: 91,
 *       rebuttal: 70,
 *       communication: 82,
 *     }}
 *     title="Overall Debate Score"
 *   />
 *
 * Each value is 0-100. The component computes the weighted overall
 * score itself, so callers never have to duplicate the weighting math.
 */

const WEIGHTS = [
  { key: "argQuality", label: "Argument Quality", weight: 0.3, color: "#D90429" },
  { key: "evidence", label: "Evidence", weight: 0.2, color: "#111827" },
  { key: "consistency", label: "Consistency", weight: 0.2, color: "#4B5563" },
  { key: "rebuttal", label: "Rebuttal", weight: 0.15, color: "#3B82F6" },
  { key: "communication", label: "Communication", weight: 0.15, color: "#10B981" },
];

function clamp(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export default function ScoreCard({ scores = {}, title = "Performance Score", compact = false }) {
  const rows = WEIGHTS.map((w) => ({
    ...w,
    value: clamp(scores[w.key]),
  }));

  const overall = rows.reduce((sum, r) => sum + r.value * r.weight, 0);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e5eb",
        borderRadius: "6px",
        padding: compact ? "1rem" : "1.5rem",
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "1rem",
          borderBottom: "1px solid #e5e5eb",
          paddingBottom: "0.75rem",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#55555e",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display, 'Outfit', sans-serif)",
            fontSize: compact ? "1.5rem" : "2rem",
            fontWeight: 800,
            color: "var(--accent-red, #D90429)",
          }}
        >
          {overall.toFixed(1)}%
        </span>
      </div>

      {/* Breakdown bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {rows.map((r) => (
          <div key={r.key}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                marginBottom: "0.25rem",
              }}
            >
              <span style={{ color: "#111827", fontWeight: 600 }}>
                {r.label}{" "}
                <span style={{ color: "#9CA3AF", fontWeight: 400 }}>
                  ({Math.round(r.weight * 100)}%)
                </span>
              </span>
              <span style={{ color: r.color, fontWeight: 700 }}>{r.value}</span>
            </div>
            <div
              style={{
                height: "6px",
                background: "#f0f0f3",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${r.value}%`,
                  height: "100%",
                  background: r.color,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
