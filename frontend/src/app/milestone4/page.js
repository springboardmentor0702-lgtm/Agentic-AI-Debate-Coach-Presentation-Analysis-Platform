"use client";

import PresentationAnalytics from "../../components/PresentationAnalytics";
import ValidationPanel from "../../components/ValidationPanel";
import ImprovementWorkflow from "../../components/ImprovementWorkflow";

const metrics = {
  overall_score: 88,
  confidence_score: 91,
  clarity_score: 86,
  engagement_score: 89,
  delivery_score: 84,
  structure_score: 90,
  speech_pace_wpm: 142,
  filler_words_count: 4,
  pause_count: 7,
};

export default function Milestone4Page() {
  return (
    <main
      className="section-container"
      style={{
        paddingTop: "40px",
        paddingBottom: "80px",
      }}
    >
      <header style={{ marginBottom: "35px" }}>
        <span className="badge-red-pill">
          MILESTONE 4 // WEEK 7–8
        </span>

        <h1
          className="font-display"
          style={{
            fontSize: "3rem",
            fontWeight: 900,
            margin: "15px 0",
          }}
        >
          ANALYTICS & DEPLOYMENT
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            maxWidth: "720px",
          }}
        >
          Production-ready presentation analytics,
          validation, reporting and end-to-end coaching
          workflow.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(320px,1fr))",
          gap: "25px",
        }}
      >
        <PresentationAnalytics metrics={metrics} />

        <ValidationPanel />

        <ImprovementWorkflow />
      </div>

      <section
        className="glass"
        style={{
          marginTop: "25px",
          padding: "25px",
        }}
      >
        <span className="badge-red-pill">
          DEPLOYMENT CHECKLIST
        </span>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(200px,1fr))",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          {[
            "Frontend Build",
            "Backend API",
            "Analytics Engine",
            "Reporting",
            "Validation",
            "Docker Ready",
            "Cloud Ready",
            "Documentation",
          ].map((item) => (
            <div
              key={item}
              style={{
                padding: "15px",
                border:
                  "1px solid var(--border-light)",
              }}
            >
              <strong>✓ {item}</strong>

              <div
                style={{
                  color: "#059669",
                  fontSize: "10px",
                  marginTop: "6px",
                }}
              >
                READY
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
