"use client";

import { useState } from "react";

const steps = [
  {
    title: "AI Debate",
    description: "Practice against an AI opponent.",
  },
  {
    title: "Presentation",
    description: "Deliver your argument.",
  },
  {
    title: "Analytics",
    description: "Measure presentation performance.",
  },
  {
    title: "Coaching",
    description: "Generate personalized recommendations.",
  },
  {
    title: "Report",
    description: "Review measurable progress.",
  },
];

export default function ImprovementWorkflow() {
  const [active, setActive] = useState(0);

  return (
    <section
      className="glass"
      style={{
        padding: "25px",
        borderRadius: "8px",
      }}
    >
      <span className="badge-red-pill">
        END-TO-END COACHING
      </span>

      <h2
        className="font-display"
        style={{
          fontSize: "1.7rem",
          margin: "12px 0",
        }}
      >
        Debate Improvement Workflow
      </h2>

      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "14px",
        }}
      >
        Complete workflow from debate practice to
        personalized performance improvement.
      </p>

      <div
        style={{
          display: "grid",
          gap: "8px",
          marginTop: "25px",
        }}
      >
        {steps.map((step, index) => {
          const complete = index <= active;

          return (
            <button
              key={step.title}
              onClick={() => setActive(index)}
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "center",
                border: 0,
                background: "transparent",
                padding: "12px 0",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: complete
                    ? "var(--accent-red)"
                    : "#e5e7eb",
                  color: complete
                    ? "#fff"
                    : "#111827",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {complete ? "✓" : index + 1}
              </span>

              <span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "14px",
                  }}
                >
                  {step.title}
                </strong>

                <small
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  {step.description}
                </small>
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#f8fafc",
          fontSize: "13px",
        }}
      >
        Current stage:{" "}
        <strong>{steps[active].title}</strong>
      </div>
    </section>
  );
}
