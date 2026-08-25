"use client";

import { useState } from "react";


export default function DebateFeedback({
  scores,
  debateCompleted,
}) {

  const [showPlan, setShowPlan] =
    useState(false);

  const [completedTasks, setCompletedTasks] =
    useState([]);


  const skills = [
    {
      name:
        "Argument Quality",

      score:
        scores.argumentQuality,
    },

    {
      name:
        "Evidence",

      score:
        scores.evidence,
    },

    {
      name:
        "Logical Consistency",

      score:
        scores.logicalConsistency,
    },

    {
      name:
        "Rebuttal",

      score:
        scores.rebuttal,
    },

    {
      name:
        "Communication",

      score:
        scores.communication,
    },
  ];


  const weakest =
    [...skills].sort(
      (a, b) =>
        a.score - b.score
    )[0];


  const recommendations = [

    {
      title:
        "Strengthen Evidence",

      description:
        "Support important claims with relevant evidence and examples.",

      priority:
        scores.evidence < 70
          ? "HIGH"
          : "MEDIUM",
    },

    {
      title:
        "Improve Rebuttals",

      description:
        "Directly address the strongest point made by the opposing speaker.",

      priority:
        scores.rebuttal < 70
          ? "HIGH"
          : "MEDIUM",
    },

    {
      title:
        "Improve Logical Connections",

      description:
        "Make the relationship between your evidence, claims and conclusion clearer.",

      priority:
        scores.logicalConsistency < 70
          ? "HIGH"
          : "MEDIUM",
    },

  ];


  const learningPlan = [

    {
      week:
        "Week 1",

      title:
        "Evidence Training",

      task:
        "Practice supporting three claims with relevant evidence.",

      target:
        "Evidence",
    },

    {
      week:
        "Week 2",

      title:
        "Counterargument Practice",

      task:
        "Write responses to three strong opposing arguments.",

      target:
        "Rebuttal",
    },

    {
      week:
        "Week 3",

      title:
        "Logical Reasoning",

      task:
        "Practice connecting claims, evidence and conclusions.",

      target:
        "Logical Consistency",
    },

    {
      week:
        "Week 4",

      title:
        "Full AI Debate",

      task:
        "Complete a multi-round debate and compare your new score.",

      target:
        "Overall",
    },

  ];


  const toggleTask = (
    index
  ) => {

    setCompletedTasks(
      (previous) => {

        if (
          previous.includes(
            index
          )
        ) {

          return previous.filter(
            (item) =>
              item !== index
          );
        }

        return [
          ...previous,
          index,
        ];

      }
    );
  };


  return (
    <div>

      {/* HEADER */}

      <div>

        <small
          style={{
            color:
              "#6b7280",
          }}
        >
          COACHING ENGINE
        </small>

        <h2>
          AI Coaching & Personalized Learning
        </h2>

        <p
          style={{
            color:
              "#6b7280",
          }}
        >
          Recommendations are generated from
          your current debate performance.
        </p>

      </div>


      {/* DEBATE STATUS */}

      <div
        style={{
          padding:
            "12px",

          background:
            debateCompleted
              ? "#f0fdf4"
              : "#fff1f3",

          borderRadius:
            "7px",

          marginTop:
            "15px",
        }}
      >

        <strong>
          {debateCompleted
            ? "✓ Debate Analysis Completed"
            : "Complete a debate to update coaching"}
        </strong>

      </div>


      {/* SKILL GAP */}

      <div
        style={{
          marginTop:
            "20px",
        }}
      >

        <h3>
          Skill Gap Analysis
        </h3>

        <div
          style={{
            display:
              "grid",

            gap:
              "10px",
          }}
        >

          {skills.map(
            (skill) => (

              <div
                key={
                  skill.name
                }
              >

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",
                  }}
                >

                  <span>
                    {skill.name}
                  </span>

                  <strong>
                    {skill.score}%
                  </strong>

                </div>


                <div
                  style={{
                    height:
                      "7px",

                    background:
                      "#e5e7eb",

                    borderRadius:
                      "10px",

                    marginTop:
                      "4px",

                    overflow:
                      "hidden",
                  }}
                >

                  <div
                    style={{
                      width:
                        `${skill.score}%`,

                      height:
                        "100%",

                      background:
                        "#d90429",
                    }}
                  />

                </div>

              </div>

            )
          )}

        </div>

      </div>


      {/* RECOMMENDATIONS */}

      <div
        style={{
          marginTop:
            "25px",
        }}
      >

        <h3>
          Coaching Recommendations
        </h3>


        <div
          style={{
            display:
              "grid",

            gap:
              "10px",
          }}
        >

          {recommendations.map(
            (
              recommendation,
              index
            ) => (

              <div
                key={
                  index
                }

                style={{
                  padding:
                    "15px",

                  border:
                    "1px solid #e5e7eb",

                  borderRadius:
                    "7px",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",
                  }}
                >

                  <strong>
                    {recommendation.title}
                  </strong>

                  <span
                    style={{
                      color:
                        recommendation.priority ===
                        "HIGH"
                          ? "#d90429"
                          : "#6b7280",

                      fontSize:
                        "11px",

                      fontWeight:
                        "bold",
                    }}
                  >
                    {recommendation.priority}
                  </span>

                </div>

                <p
                  style={{
                    marginBottom:
                      "0",

                    color:
                      "#6b7280",

                    fontSize:
                      "13px",
                  }}
                >
                  {
                    recommendation.description
                  }
                </p>

              </div>

            )
          )}

        </div>

      </div>


      {/* PERSONALIZED LEARNING */}

      <div
        style={{
          marginTop:
            "25px",
        }}
      >

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",
          }}
        >

          <div>

            <small
              style={{
                color:
                  "#6b7280",
              }}
            >
              PERSONALIZED WORKFLOW
            </small>

            <h3>
              Personalized Learning Plan
            </h3>

          </div>


          <button
            type="button"

            onClick={() =>
              setShowPlan(
                (previous) =>
                  !previous
              )
            }

            style={{
              padding:
                "9px 14px",

              background:
                "#d90429",

              color:
                "#fff",

              border:
                "0",

              borderRadius:
                "6px",

              fontWeight:
                "bold",
            }}
          >
            {showPlan
              ? "Hide Plan"
              : "Generate Plan"}
          </button>

        </div>


        {showPlan && (

          <div
            style={{
              display:
                "grid",

              gap:
                "10px",

              marginTop:
                "12px",
            }}
          >

            {learningPlan.map(
              (
                item,
                index
              ) => {

                const completed =
                  completedTasks.includes(
                    index
                  );

                return (

                  <div
                    key={
                      item.week
                    }

                    style={{
                      padding:
                        "15px",

                      border:
                        "1px solid #e5e7eb",

                      borderRadius:
                        "7px",

                      background:
                        completed
                          ? "#f0fdf4"
                          : "#fff",
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          "10px",
                      }}
                    >

                      <strong>
                        {item.week}:{" "}
                        {item.title}
                      </strong>


                      <button
                        type="button"

                        onClick={() =>
                          toggleTask(
                            index
                          )
                        }

                        style={{
                          border:
                            "0",

                          background:
                            "transparent",

                          color:
                            "#d90429",

                          fontWeight:
                            "bold",
                        }}
                      >
                        {completed
                          ? "✓ Completed"
                          : "Complete"}
                      </button>

                    </div>


                    <p
                      style={{
                        color:
                          "#6b7280",

                        fontSize:
                          "13px",
                      }}
                    >
                      {item.task}
                    </p>


                    <small
                      style={{
                        color:
                          "#d90429",
                      }}
                    >
                      Target skill:{" "}
                      {item.target}
                    </small>

                  </div>

                );
              }
            )}

          </div>

        )}

      </div>


      {/* NEXT ACTION */}

      <div
        style={{
          marginTop:
            "20px",

          padding:
            "18px",

          background:
            "#111827",

          color:
            "#fff",

          borderRadius:
            "8px",
        }}
      >

        <small
          style={{
            opacity:
              "0.65",
          }}
        >
          NEXT BEST ACTION
        </small>

        <h3>
          Practice {weakest.name}
        </h3>

        <p
          style={{
            opacity:
              "0.75",

            fontSize:
              "13px",

            marginBottom:
              "0",
          }}
        >
          Complete the recommended learning
          activity and then run another AI
          debate to measure improvement.
        </p>

      </div>

    </div>
  );
}
