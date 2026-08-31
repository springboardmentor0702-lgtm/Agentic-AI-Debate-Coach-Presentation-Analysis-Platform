"use client";

export default function PresentationAnalytics({
  metrics = {},
}) {
  const metricsList = [
    ["Confidence", metrics.confidence_score ?? 0],
    ["Clarity", metrics.clarity_score ?? 0],
    ["Engagement", metrics.engagement_score ?? 0],
    ["Delivery", metrics.delivery_score ?? 0],
    ["Structure", metrics.structure_score ?? 0],
  ];

  return (
    <div className="glass" style={{ padding: "25px" }}>
      <span className="badge-red-pill">
        PRESENTATION ANALYTICS
      </span>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          margin: "15px 0 25px",
        }}
      >
        <h2>Presentation Quality</h2>

        <strong style={{ fontSize: "2rem" }}>
          {metrics.overall_score ?? 0}%
        </strong>
      </div>

      {metricsList.map(([label, value]) => (
        <div key={label} style={{ marginBottom: "18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13px",
            }}
          >
            <span>{label}</span>
            <strong>{value}%</strong>
          </div>

          <div
            style={{
              height: "8px",
              background: "#e5e7eb",
              marginTop: "7px",
            }}
          >
            <div
              style={{
                width: `${value}%`,
                height: "100%",
                background: "var(--accent-red)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
