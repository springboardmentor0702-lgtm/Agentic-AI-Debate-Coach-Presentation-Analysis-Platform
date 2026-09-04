"use client";

export default function PresentationAnalytics({
  metrics = {},
}) {
  const values = [
    ["Confidence", metrics.confidence_score ?? 0],
    ["Clarity", metrics.clarity_score ?? 0],
    ["Engagement", metrics.engagement_score ?? 0],
    ["Delivery", metrics.delivery_score ?? 0],
    ["Structure", metrics.structure_score ?? 0],
  ];

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
          marginBottom: "25px",
        }}
      >
        <div>
          <span className="badge-red-pill">
            PRESENTATION ANALYSIS ENGINE
          </span>

          <h2
            className="font-display"
            style={{
              fontSize: "1.5rem",
              marginTop: "12px",
            }}
          >
            Presentation Intelligence
          </h2>
        </div>

        <strong
          style={{
            fontSize: "2.5rem",
          }}
        >
          {metrics.overall_score ?? 0}%
        </strong>
      </div>

      {values.map(([name, value]) => (
        <div
          key={name}
          style={{
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13px",
              marginBottom: "7px",
            }}
          >
            <span>{name}</span>
            <strong>{value}%</strong>
          </div>

          <div
            style={{
              height: "9px",
              background: "#e5e7eb",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(value, 100)}%`,
                background: "var(--accent-red)",
                borderRadius: "10px",
              }}
            />
          </div>
        </div>
      ))}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3,1fr)",
          gap: "12px",
          marginTop: "25px",
          paddingTop: "20px",
          borderTop:
            "1px solid var(--border-light)",
        }}
      >
        <div>
          <small>WPM</small>
          <strong
            style={{
              display: "block",
              fontSize: "1.5rem",
            }}
          >
            {metrics.speech_pace_wpm ?? 0}
          </strong>
        </div>

        <div>
          <small>FILLERS</small>
          <strong
            style={{
              display: "block",
              fontSize: "1.5rem",
            }}
          >
            {metrics.filler_words_count ?? 0}
          </strong>
        </div>

        <div>
          <small>PAUSES</small>
          <strong
            style={{
              display: "block",
              fontSize: "1.5rem",
            }}
          >
            {metrics.pause_count ?? 0}
          </strong>
        </div>
      </div>
    </section>
  );
}
