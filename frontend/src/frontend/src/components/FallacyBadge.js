"use client";

import { useState } from "react";

/**
 * FallacyBadge
 * ------------
 * Small pill/badge for displaying one of LOGOS.AI's 8 tracked
 * logical fallacies (Logic Audit module). Hovering shows a short
 * definition so learners understand *why* something was flagged,
 * not just that it was.
 *
 * Usage:
 *   <FallacyBadge type="Straw Man" />
 *   <FallacyBadge type="ad hominem" size="sm" />   // case-insensitive
 *
 * Unknown fallacy names still render (as a neutral gray badge)
 * instead of crashing, in case the backend adds new types later.
 */

const FALLACIES = {
  "ad hominem": {
    label: "Ad Hominem",
    description: "Attacking the person instead of addressing their argument.",
    color: "#D90429",
  },
  "straw man": {
    label: "Straw Man",
    description: "Misrepresenting an opponent's argument to make it easier to attack.",
    color: "#B90220",
  },
  "false dilemma": {
    label: "False Dilemma",
    description: "Presenting only two options when more actually exist.",
    color: "#EA580C",
  },
  "slippery slope": {
    label: "Slippery Slope",
    description: "Claiming one step will inevitably lead to an extreme outcome, without evidence.",
    color: "#CA8A04",
  },
  "appeal to authority": {
    label: "Appeal to Authority",
    description: "Using an authority's opinion as proof, regardless of actual evidence.",
    color: "#7C3AED",
  },
  "circular reasoning": {
    label: "Circular Reasoning",
    description: "The conclusion is just a restatement of the premise.",
    color: "#2563EB",
  },
  "hasty generalization": {
    label: "Hasty Generalization",
    description: "Drawing a broad conclusion from a small or unrepresentative sample.",
    color: "#0891B2",
  },
  "red herring": {
    label: "Red Herring",
    description: "Introducing an irrelevant point to distract from the actual issue.",
    color: "#4B5563",
  },
};

const SIZES = {
  sm: { padding: "0.15rem 0.5rem", fontSize: "0.65rem" },
  md: { padding: "0.25rem 0.7rem", fontSize: "0.75rem" },
};

export default function FallacyBadge({ type, size = "md" }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const key = (type || "").trim().toLowerCase();
  const info = FALLACIES[key] || {
    label: type || "Unknown Fallacy",
    description: "No description available for this fallacy type.",
    color: "#9CA3AF",
  };

  const sizeStyle = SIZES[size] || SIZES.md;

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          ...sizeStyle,
          borderRadius: "999px",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          color: "#ffffff",
          background: info.color,
          cursor: "default",
          whiteSpace: "nowrap",
        }}
      >
        ⚠ {info.label}
      </span>

      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "220px",
            background: "#09090b",
            color: "#f3f3f6",
            fontSize: "0.7rem",
            lineHeight: 1.4,
            padding: "0.5rem 0.65rem",
            borderRadius: "4px",
            zIndex: 50,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {info.description}
        </div>
      )}
    </span>
  );
}
