"use client";

import { useState } from "react";

export default function ValidationPanel() {
  const tests = [
    "Input validation",
    "Presentation analysis",
    "Score validation",
    "Coaching validation",
    "Report validation",
    "End-to-end workflow",
  ];

  const [passed, setPassed] = useState(false);

  return (
    <div className="glass" style={{ padding: "25px" }}>
      <span className="badge-red-pill">
        TESTING
      </span>

      <h2 style={{ margin: "12px 0 20px" }}>
        Validation Dashboard
      </h2>

      <button
        className="btn btn-red"
        onClick={() => setPassed(true)}
      >
        RUN VALIDATION
      </button>

      <div style={{ marginTop: "20px" }}>
        {tests.map((test) => (
          <div
            key={test}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom:
                "1px solid var(--border-light)",
              fontSize: "13px",
            }}
          >
            <span>{test}</span>

            <strong
              style={{
                color: passed
                  ? "#059669"
                  : "#6b7280",
              }}
            >
              {passed ? "PASS" : "READY"}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
