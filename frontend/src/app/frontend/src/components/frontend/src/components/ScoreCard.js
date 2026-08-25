"use client";

const METRICS = [
  {
    key: "argQuality",
    name: "Argument Quality",
    weight: 30,
  },
  {
    key: "evidence",
    name: "Evidence",
    weight: 20,
  },
  {
    key: "consistency",
    name: "Logical Consistency",
    weight: 20,
  },
  {
    key: "rebuttal",
    name: "Rebuttal",
    weight: 15,
  },
  {
    key: "communication",
    name: "Communication",
    weight: 15,
  },
];

export default function ScoreCard({
  scores = {
    argQuality: 78,
    evidence: 68,
    consistency: 74,
    rebuttal: 65,
    communication: 82,
  },
}) {

  const overall =
    METRICS.reduce(
      (total, metric) =>
        total +
        (scores[metric.key] || 0) *
          (metric.weight / 100),
      0
    );

  const sorted = [...METRICS].sort(
    (a, b) =>
      (scores[a.key] || 0) -
      (scores[b.key] || 0)
  );

  const weakest = sorted[0];
  const strongest =
    sorted[sorted.length - 1];

  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        border:
          "1px solid #e5e7eb",
        borderRadius: "10px",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >

        <div>

          <small
            style={{
              color: "#6b7280",
            }}
          >
            PERFORMANCE DASHBOARD
          </small>

          <h2>
            Debate Score
          </h2>

        </div>


        <div
          style={{
            textAlign: "right",
          }}
        >

          <strong
            style={{
              fontSize: "32px",
              color: "#d90429",
            }}
          >
            {overall.toFixed(1)}
          </strong>

          <div>
            / 100
          </div>

        </div>

      </div>


      {/* METRICS */}

      <div
        style={{
          marginTop: "20px",
          display: "grid",
          gap: "15px",
        }}
      >

        {METRICS.map((metric) => {

          const value =
            scores[metric.key] || 0;

          return (
            <div key={metric.key}>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginBottom: "5px",
                }}
              >

                <span>
                  {metric.name}
                </span>

                <strong>
                  {value}
                </strong>

              </div>


              <div
                style={{
                  height: "8px",
                  background:
                    "#e5e7eb",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >

                <div
                  style={{
                    width:
                      `${value}%`,
                    height: "100%",
                    background:
                      "#d90429",
                  }}
                />

              </div>


              <small
                style={{
                  color: "#9ca3af",
                }}
              >
                Weight: {metric.weight}%
              </small>

            </div>
          );

        })}

      </div>


      {/* INSIGHTS */}

      <div
        style={{
          marginTop: "20px",
          display: "grid",
          gap: "10px",
        }}
      >

        <div
          style={{
            padding: "12px",
            background: "#fff1f3",
            borderRadius: "6px",
          }}
        >

          <small>
            Priority Skill
          </small>

          <strong
            style={{
              display: "block",
              marginTop: "4px",
            }}
          >
            {weakest.name}
          </strong>

        </div>


        <div
          style={{
            padding: "12px",
            background: "#f3f4f6",
            borderRadius: "6px",
          }}
        >

          <small>
            Strongest Skill
          </small>

          <strong
            style={{
              display: "block",
              marginTop: "4px",
            }}
          >
            {strongest.name}
          </strong>

        </div>

      </div>

    </div>
  );
}
