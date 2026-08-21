"use client";

/**
 * PersonaSelector
 * ---------------
 * Visual selector for the 3 AI debate opponent personas used in
 * /simulation (Simulation Engine module). Replaces a plain <select>
 * with cards that explain *how* each persona argues, so the user
 * makes an informed choice instead of picking a label blind.
 *
 * Controlled component — same pattern as a native <select>:
 *   const [persona, setPersona] = useState("The Contrarian");
 *   <PersonaSelector value={persona} onChange={setPersona} />
 *
 * `value` / the strings passed to onChange match exactly what the
 * rest of simulation/page.js already expects ("The Contrarian",
 * "The Academic", "The Strategist"), so it's a drop-in swap for the
 * existing <select> — no changes needed anywhere else in the page.
 */

const PERSONAS = [
  {
    id: "The Contrarian",
    label: "The Contrarian",
    tagline: "Challenges every claim",
    description:
      "Pushes back on nearly every point you make, forcing you to defend even well-supported claims. Good for stress-testing argument strength.",
    icon: "⚡",
  },
  {
    id: "The Academic",
    label: "The Academic",
    tagline: "Evidence-first, formal",
    description:
      "Leans on citations, studies, and precise definitions. Rewards well-sourced arguments and penalizes vague claims.",
    icon: "📚",
  },
  {
    id: "The Strategist",
    label: "The Strategist",
    tagline: "Plays the long game",
    description:
      "Builds toward a larger framework across turns rather than attacking single points. Good practice for policy/Oxford-style formats.",
    icon: "♟",
  },
];

export default function PersonaSelector({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Opponent Persona"
      style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
    >
      {PERSONAS.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(p.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              width: "100%",
              textAlign: "left",
              padding: "0.75rem 0.9rem",
              borderRadius: "6px",
              border: selected
                ? "1.5px solid var(--accent-red, #D90429)"
                : "1px solid var(--border-light, #e5e5eb)",
              background: selected ? "rgba(217, 4, 41, 0.04)" : "#ffffff",
              cursor: "pointer",
              transition: "border-color 0.15s ease, background 0.15s ease",
            }}
          >
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{p.icon}</span>
            <span style={{ flex: 1 }}>
              <span
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display, 'Outfit', sans-serif)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "#0a0a0a",
                  }}
                >
                  {p.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    color: selected ? "var(--accent-red, #D90429)" : "#9CA3AF",
                    fontWeight: 700,
                  }}
                >
                  {p.tagline}
                </span>
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  color: "#55555e",
                  marginTop: "0.2rem",
                  lineHeight: 1.4,
                }}
              >
                {p.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
