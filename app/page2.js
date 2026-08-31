"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const modules = [
  {
    id: "01",
    title: "AI Debate Simulation",
    description:
      "Practice arguments against an AI opponent with real-time feedback.",
    route: "/simulation",
  },
  {
    id: "02",
    title: "Presentation Analysis",
    description:
      "Measure confidence, clarity, engagement, pace and delivery.",
    route: "/presentation",
  },
  {
    id: "03",
    title: "Coaching Intelligence",
    description:
      "Convert performance weaknesses into personalized coaching actions.",
    route: "/dashboard",
  },
  {
    id: "04",
    title: "Performance Reports",
    description:
      "Track performance history and generate detailed reports.",
    route: "/reports",
  },
];

export default function HomePage() {
  const [backend, setBackend] = useState("CHECKING");

  useEffect(() => {
    fetch(`${API}/health`)
      .then((res) => {
        if (res.ok) setBackend("ONLINE");
        else setBackend("OFFLINE");
      })
      .catch(() => setBackend("OFFLINE"));
  }, []);

  return (
    <main className="section-container">
      <section
        style={{
          paddingTop: "70px",
          paddingBottom: "60px",
        }}
      >
        <span className="badge-red-pill">
          MILESTONE 4 // WEEK 8
        </span>

        <h1
          className="font-display"
          style={{
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.95,
            fontWeight: 900,
            margin: "20px 0",
          }}
        >
          DEBATE COACH
          <br />
          INTELLIGENCE PLATFORM
        </h1>

        <p
          style={{
            maxWidth: "760px",
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            fontSize: "1.05rem",
          }}
        >
          AI-powered debate practice, presentation analytics,
          personalized coaching and performance reporting in one
          end-to-end learning workflow.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "25px",
          }}
        >
          <a href="/simulation" className="btn btn-red">
            START DEBATE
          </a>

          <a
            href="/presentation"
            className="btn"
            style={{
              border: "1px solid var(--border-light)",
              padding: "12px 20px",
            }}
          >
            ANALYZE PRESENTATION
          </a>

          <a
            href="/reports"
            className="btn"
            style={{
              border: "1px solid var(--border-light)",
              padding: "12px 20px",
            }}
          >
            VIEW REPORTS
          </a>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "18px",
          marginBottom: "60px",
        }}
      >
        {modules.map((module) => (
          <a
            key={module.id}
            href={module.route}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="glass"
              style={{
                padding: "24px",
                minHeight: "190px",
                borderRadius: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--accent-red)",
                  fontWeight: 900,
                  fontSize: "12px",
                }}
              >
                {module.id}
              </span>

              <h2
                className="font-display"
                style={{
                  fontSize: "1.4rem",
                  margin: "14px 0 8px",
                }}
              >
                {module.title}
              </h2>

              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                {module.description}
              </p>
            </div>
          </a>
        ))}
      </section>

      <section
        className="glass"
        style={{
          padding: "28px",
          marginBottom: "70px",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <div>
            <span className="badge-red-pill">
              PRODUCTION STATUS
            </span>

            <h2
              className="font-display"
              style={{
                fontSize: "1.8rem",
                margin: "12px 0",
              }}
            >
              PLATFORM HEALTH
            </h2>
          </div>

          <div
            style={{
              fontWeight: 900,
              fontSize: "14px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background:
                  backend === "ONLINE"
                    ? "#10b981"
                    : backend === "CHECKING"
                    ? "#f59e0b"
                    : "#ef4444",
                marginRight: "7px",
              }}
            />
            BACKEND {backend}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "15px",
            marginTop: "25px",
          }}
        >
          {[
            "AI Debate Engine",
            "Presentation Analytics",
            "Coaching Engine",
            "Reporting System",
          ].map((item) => (
            <div
              key={item}
              style={{
                padding: "15px",
                border: "1px solid var(--border-light)",
              }}
            >
              <strong style={{ fontSize: "13px" }}>
                {item}
              </strong>

              <div
                style={{
                  color: "#059669",
                  fontSize: "11px",
                  marginTop: "8px",
                  fontWeight: 800,
                }}
              >
                ● OPERATIONAL
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
