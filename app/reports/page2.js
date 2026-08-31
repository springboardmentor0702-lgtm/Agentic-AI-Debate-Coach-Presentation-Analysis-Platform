"use client";

import { useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const demoReport = {
  overall_score: 88,
  confidence_score: 91,
  clarity_score: 86,
  engagement_score: 89,
  delivery_score: 84,
  structure_score: 90,
  speech_pace_wpm: 142,
  filler_words_count: 4,
  pause_count: 7,
  strengths: [
    "Clear opening argument",
    "Strong confidence",
    "Logical structure",
  ],
  improvements: [
    "Reduce filler words",
    "Improve transitions",
    "Use deliberate pauses",
  ],
};

export default function ReportsPage() {
  const [report, setReport] = useState(demoReport);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);

    try {
      const response = await fetch(
        `${API}/api/v1/reports/latest`
      );

      if (!response.ok) {
        throw new Error("Report API unavailable");
      }

      const data = await response.json();

      setReport({
        ...demoReport,
        ...data,
      });
    } catch {
      setReport(demoReport);
    } finally {
      setLoading(false);
    }
  }

  function exportReport() {
    const reportText = `
DEBATE COACH PERFORMANCE REPORT

Overall Score: ${report.overall_score}%
Confidence: ${report.confidence_score}%
Clarity: ${report.clarity_score}%
Engagement: ${report.engagement_score}%
Delivery: ${report.delivery_score}%
Structure: ${report.structure_score}%

Speech Pace: ${report.speech_pace_wpm} WPM
Filler Words: ${report.filler_words_count}
Pauses: ${report.pause_count}

STRENGTHS
${report.strengths.map((x) => "- " + x).join("\n")}

COACHING PRIORITIES
${report.improvements
  .map((x) => "- " + x)
  .join("\n")}
`;

    const blob = new Blob([reportText], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "debate-coach-performance-report.txt";

    link.click();

    URL.revokeObjectURL(url);
  }

  const metrics = [
    ["Overall", report.overall_score],
    ["Confidence", report.confidence_score],
    ["Clarity", report.clarity_score],
    ["Engagement", report.engagement_score],
    ["Delivery", report.delivery_score],
    ["Structure", report.structure_score],
  ];

  return (
    <main
      className="section-container"
      style={{
        paddingTop: "45px",
        paddingBottom: "80px",
      }}
    >
      <header style={{ marginBottom: "35px" }}>
        <span className="badge-red-pill">
          MILESTONE 4 // REPORTING
        </span>

        <h1
          className="font-display"
          style={{
            fontSize: "3rem",
            fontWeight: 900,
            margin: "15px 0",
          }}
        >
          PERFORMANCE REPORT
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            maxWidth: "700px",
          }}
        >
          Unified presentation and debate coaching performance
          report.
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <button
            className="btn btn-red"
            onClick={loadReport}
          >
            {loading ? "LOADING..." : "REFRESH REPORT"}
          </button>

          <button
            className="btn"
            onClick={exportReport}
            style={{
              border: "1px solid var(--border-light)",
            }}
          >
            EXPORT REPORT
          </button>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: "15px",
          marginBottom: "25px",
        }}
      >
        {metrics.map(([label, value]) => (
          <div
            className="glass"
            key={label}
            style={{
              padding: "22px",
              borderRadius: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: 800,
              }}
            >
              {label.toUpperCase()}
            </span>

            <div
              className="font-display"
              style={{
                fontSize: "2.2rem",
                fontWeight: 900,
                marginTop: "8px",
              }}
            >
              {value}%
            </div>

            <div
              style={{
                height: "7px",
                background: "#e5e7eb",
                marginTop: "12px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${value}%`,
                  background: "var(--accent-red)",
                }}
              />
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(320px,1fr))",
          gap: "25px",
          marginBottom: "25px",
        }}
      >
        <div
          className="glass"
          style={{
            padding: "25px",
            borderRadius: "8px",
          }}
        >
          <h2
            className="font-display"
            style={{ fontSize: "1.4rem" }}
          >
            SPEECH ANALYTICS
          </h2>

          {[
            ["Speech Pace", `${report.speech_pace_wpm} WPM`],
            ["Filler Words", report.filler_words_count],
            ["Pause Count", report.pause_count],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "16px 0",
                borderBottom:
                  "1px solid var(--border-light)",
              }}
            >
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div
          className="glass"
          style={{
            padding: "25px",
            borderRadius: "8px",
          }}
        >
          <h2
            className="font-display"
            style={{ fontSize: "1.4rem" }}
          >
            STRENGTHS
          </h2>

          {report.strengths.map((item) => (
            <div
              key={item}
              style={{
                padding: "13px 0",
                borderBottom:
                  "1px solid var(--border-light)",
                fontSize: "14px",
              }}
            >
              <span
                style={{
                  color: "#059669",
                  fontWeight: 900,
                  marginRight: "10px",
                }}
              >
                ✓
              </span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section
        className="glass"
        style={{
          padding: "25px",
          borderRadius: "8px",
        }}
      >
        <h2
          className="font-display"
          style={{ fontSize: "1.4rem" }}
        >
          COACHING PRIORITIES
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          {report.improvements.map((item, index) => (
            <div
              key={item}
              style={{
                padding: "20px",
                border: "1px solid var(--border-light)",
              }}
            >
              <strong
                style={{
                  color: "var(--accent-red)",
                }}
              >
                0{index + 1}
              </strong>

              <p style={{ fontSize: "14px" }}>
                {item}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
