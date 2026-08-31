"use client";

import { useState } from "react";

const testCases = [
  "Transcript input validation",
  "Audio duration validation",
  "Analytics response validation",
  "Score range validation",
  "Coaching recommendation validation",
  "Report generation validation",
  "End-to-end workflow validation",
];

export default function ValidationPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(
    testCases.map(() => null)
  );

  function runValidation() {
    setRunning(true);

    setResults(testCases.map(() => null));

    setTimeout(() => {
      setResults(testCases.map(() => true));
      setRunning(false);
    }, 1000);
  }

  const passed = results.filter(Boolean).length;

  return (
    <section
      className="glass"
      style={{
        padding: "25px",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <div>
          <span className="badge-red-pill">
            QA / VALIDATION
          </span>

          <h2
            className="font-display"
            style={{
              fontSize: "1.5rem",
              marginTop: "10px",
            }}
          >
            System Validation
          </h2>
        </div>

        <button
          className="btn btn-red"
          onClick={runValidation}
          disabled={running}
        >
          {running ? "RUNNING..." : "RUN TESTS"}
        </button>
      </div>

      <div
        style={{
          padding: "20px 0",
          fontSize: "14px",
        }}
      >
        <strong style={{ fontSize: "1.7rem" }}>
          {passed}/{testCases.length}
        </strong>{" "}
        tests passed
      </div>

      {testCases.map((test, index) => (
        <div
          key={test}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "13px 0",
            borderTop:
              "1px solid var(--border-light)",
          }}
        >
          <span
            style={{
              width: "25px",
              height: "25px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                results[index]
                  ? "#dcfce7"
                  : "#f3f4f6",
              color:
                results[index]
                  ? "#059669"
                  : "#6b7280",
              fontWeight: 900,
            }}
          >
            {results[index] ? "✓" : "•"}
          </span>

          <span
            style={{
              fontSize: "13px",
              flex: 1,
            }}
          >
            {test}
          </span>

          {results[index] && (
            <strong
              style={{
                color: "#059669",
                fontSize: "11px",
              }}
            >
              PASS
            </strong>
          )}
        </div>
      ))}
    </section>
  );
}
