import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import api from "../api";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const PROMPTS = [
  "What principle connects your example to your conclusion?",
  "Which of your claims would survive without its evidence?",
  "Where is the cheapest place your opponent can attack you?",
  "What is the strongest version of the argument you disagree with?",
  "If the room remembers one sentence from you, what is it?",
];

export default function Progress() {
  const [stats, setStats] = useState(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    api
      .get("/dashboards/learner")
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  // --------------------------------
  // SESSION PROGRESS
  // --------------------------------

  const trend = stats?.improvement_trend || [];

  // Last 6 sessions
  const last6 = trend.slice(-6);

  // Improvement from first session to latest session
  const base = last6.length ? last6[0].overall : 0;

  const delta =
    last6.length > 1
      ? Math.round(
          (last6[last6.length - 1].overall - base) * 10
        ) / 10
      : null;

  // --------------------------------
  // MILESTONES
  // --------------------------------

  const done80 = trend.some(
    (t) => t.overall >= 80
  );

  const reps = Math.min(
    trend.length,
    5
  );

  const clarity =
    stats?.average_scores?.clarity ??
    stats?.average_scores?.communication_skills ??
    0;

  const milestones = [
    {
      icon: "✓",
      title: "First 80+ session",
      note: done80
        ? "Reached"
        : "Not yet",
    },
    {
      icon: "◎",
      title: "Five sessions practiced",
      note: `${reps} of 5 complete`,
    },
    {
      icon: "🖊",
      title: "Clear speaker",
      note: clarity
        ? `Now at ${Math.round(
            clarity
          )} — next up at 85`
        : "Run a session",
    },
  ];

  // --------------------------------
  // WEEKLY ACTIVITY
  // --------------------------------

  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();

    d.setDate(
      d.getDate() - i
    );

    days.push(
      d.toISOString().slice(0, 10)
    );
  }

  const doneDays = new Set(
    trend.map((t) =>
      t.date.slice(0, 10)
    )
  );

  const week = days.map((d) => ({
    label: new Date(
      d + "T00:00:00"
    ).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
      }
    ),

    done: doneDays.has(d),
  }));

  const doneCount = week.filter(
    (w) => w.done
  ).length;

  return (
    <div className="content">

      {/* =================================
          PAGE HEADER
      ================================= */}

      <div className="pagehead">

        <div>
          <p className="kicker">
            <span className="dot" />
            Your progression
          </p>

          <h1 className="display">
            See the{" "}
            <span className="accent">
              compounding.
            </span>
          </h1>

          <p className="sub">
            Progress is not a single score.
            It is the set of moves you can
            make under pressure.
          </p>
        </div>

        <button
          className="btn primary big"
          onClick={() =>
            setP(
              (x) =>
                (x + 1) %
                PROMPTS.length
            )
          }
        >
          ✦ Generate next prompt
        </button>

      </div>

      {/* =================================
          FIRST ROW
      ================================= */}

      <div className="rowGrid">

        {/* ---------------------------------
            SKILL GROWTH
        ---------------------------------- */}

        <div className="card">

          <div className="cardhead">

            <div>
              <h3>
                Skill growth
              </h3>

              <p className="muted">
                Your session-by-session
                overall score.
              </p>
            </div>

            {delta !== null && (
              <span className="delta">
                {delta >= 0
                  ? "↗ +"
                  : "↘ "}
                {delta} overall
              </span>
            )}

          </div>

          {last6.length >= 2 ? (

            <div
              style={{
                height: "125px",
                marginTop: "4px",
              }}
            >

              <Line
                options={{
                  responsive: true,

                  maintainAspectRatio: false,

                  plugins: {
                    legend: {
                      display: false,
                    },

                    tooltip: {
                      callbacks: {
                        label: function (
                          context
                        ) {
                          return ` Score: ${context.parsed.y}`;
                        },
                      },
                    },
                  },

                  scales: {
                    y: {
                      min: 0,
                      max: 100,

                      ticks: {
                        stepSize: 20,
                        font: {
                          size: 10,
                        },
                      },

                      grid: {
                        drawTicks: false,
                      },
                    },

                    x: {
                      ticks: {
                        font: {
                          size: 10,
                        },

                        maxRotation: 0,
                      },

                      grid: {
                        display: false,
                      },
                    },
                  },
                }}

                data={{
                  labels: last6.map(
                    (_, i) =>
                      `S${i + 1}`
                  ),

                  datasets: [
                    {
                      label:
                        "Overall Score",

                      data: last6.map(
                        (t) =>
                          t.overall
                      ),

                      borderColor:
                        "#0B6B63",

                      backgroundColor:
                        "#0B6B63",

                      tension: 0.35,

                      pointRadius: 4,

                      pointHoverRadius: 6,

                      borderWidth: 2.5,

                      fill: false,
                    },
                  ],
                }}
              />

            </div>

          ) : (

            <p className="muted pad">
              Complete 2+ sessions to
              unlock the session growth
              chart.
            </p>

          )}

        </div>

        {/* ---------------------------------
            MILESTONES
        ---------------------------------- */}

        <div className="card">

          <div className="cardhead">

            <div>
              <h3>
                Milestones
              </h3>

              <p className="muted">
                Quiet wins worth noticing.
              </p>
            </div>

            <span>
              🎓
            </span>

          </div>

          {milestones.map(
            (m, i) => (

              <div
                key={i}
                className="milestone"
              >

                <span className="check done">
                  {m.icon}
                </span>

                <div>
                  <b>
                    {m.title}
                  </b>

                  <p className="muted">
                    {m.note}
                  </p>
                </div>

              </div>

            )
          )}

        </div>

      </div>

      {/* =================================
          SECOND ROW
      ================================= */}

      <div className="rowGrid">

        {/* ---------------------------------
            PERSONAL COACHING
        ---------------------------------- */}

        <div className="card">

          <div className="cardhead">

            <div>
              <h3>
                Personal coaching prompt
              </h3>

              <p className="muted">
                A question to carry into
                your next rep.
              </p>
            </div>

            <span>
              💡
            </span>

          </div>

          <div className="quotecard">
            “{PROMPTS[p]}”
          </div>

          <button
            className="linkbtn"
            onClick={() =>
              setP(
                (x) =>
                  (x + 1) %
                  PROMPTS.length
              )
            }
          >
            ↻ Refresh prompt
          </button>

        </div>

        {/* ---------------------------------
            WEEKLY ACTIVITY
        ---------------------------------- */}

        <div className="card">

          <div className="cardhead">

            <div>
              <h3>
                Weekly activity
              </h3>

              <p className="muted">
                This week
              </p>
            </div>

            <span className="kicker muted">
              {doneCount} / 4 reps
            </span>

          </div>

          {week.map(
            (w, i) => (

              <div
                key={i}
                className="weekrow"
              >

                <span className="muted mono">
                  {w.label}
                </span>

                <div
                  className={
                    "weekbar dark" +
                    (w.done
                      ? " filled"
                      : "")
                  }
                >

                  <div
                    className="weekfill"
                    style={{
                      width:
                        w.done
                          ? "100%"
                          : "0%",
                    }}
                  />

                </div>

                <span
                  className={
                    "kicker " +
                    (w.done
                      ? "tealtxt"
                      : "muted")
                  }
                >
                  {w.done
                    ? "Done"
                    : "Rest"}
                </span>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  );
}