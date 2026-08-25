"use client";

import { useState } from "react";

const PERSONAS = [
  {
    id: "contrarian",
    name: "The Contrarian",
    icon: "⚡",
    description:
      "Challenges assumptions and attacks weak points in your argument.",
  },
  {
    id: "academic",
    name: "The Academic",
    icon: "📚",
    description:
      "Focuses on evidence, facts, definitions and logical reasoning.",
  },
  {
    id: "strategist",
    name: "The Strategist",
    icon: "♟",
    description:
      "Focuses on consequences, alternatives and practical strategy.",
  },
];

const CHALLENGES = {
  contrarian: [
    "What evidence directly supports your claim?",
    "What is the biggest weakness in your argument?",
    "Can you provide a counterexample?",
  ],

  academic: [
    "What reliable evidence supports your claim?",
    "What assumptions are behind your conclusion?",
    "How can you distinguish correlation from causation?",
  ],

  strategist: [
    "What happens if this proposal is implemented at scale?",
    "What are the practical costs?",
    "What alternative strategy could work better?",
  ],
};

export default function PersonaSelector() {
  const [persona, setPersona] =
    useState("contrarian");

  const [topic, setTopic] = useState(
    "Should AI be used in education?"
  );

  const [position, setPosition] =
    useState("FOR");

  const [argument, setArgument] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  const [round, setRound] =
    useState(1);

  const [running, setRunning] =
    useState(false);

  const startDebate = () => {
    setRunning(true);
    setRound(1);

    setMessages([
      {
        type: "ai",
        text:
          `Debate started. You are arguing ${position}. ` +
          CHALLENGES[persona][0],
      },
    ]);
  };

  const submitArgument = () => {
    if (!argument.trim()) return;

    const challenges =
      CHALLENGES[persona];

    const response =
      challenges[
        (round - 1) %
          challenges.length
      ];

    setMessages((previous) => [
      ...previous,

      {
        type: "user",
        text: argument,
      },

      {
        type: "ai",
        text: response,
      },
    ]);

    setArgument("");

    setRound(
      (previous) => previous + 1
    );
  };

  const stopDebate = () => {
    setRunning(false);
    setMessages([]);
    setArgument("");
    setRound(1);
  };

  return (
    <div>

      <h2>
        AI Debate Simulation
      </h2>

      <p className="description">
        Select an AI opponent and practice
        defending your position.
      </p>


      {/* PERSONAS */}

      <h3>
        Select AI Opponent
      </h3>

      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >

        {PERSONAS.map((item) => {

          const selected =
            persona === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setPersona(item.id)
              }
              style={{
                textAlign: "left",
                padding: "14px",
                borderRadius: "8px",

                border: selected
                  ? "2px solid #d90429"
                  : "1px solid #e5e7eb",

                background: selected
                  ? "#fff1f3"
                  : "#fff",
              }}
            >

              <strong>
                {item.icon} {item.name}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "5px",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                {item.description}
              </span>

            </button>
          );
        })}

      </div>


      {/* TOPIC */}

      <div style={{ marginTop: "20px" }}>

        <label>
          Debate Topic
        </label>

        <input
          value={topic}
          onChange={(e) =>
            setTopic(e.target.value)
          }
          style={{
            width: "100%",
            padding: "11px",
            marginTop: "6px",
          }}
        />

      </div>


      {/* POSITION */}

      <div style={{ marginTop: "16px" }}>

        <label>
          Your Position
        </label>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "7px",
          }}
        >

          {["FOR", "AGAINST"].map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setPosition(item)
                }
                style={{
                  padding:
                    "9px 18px",

                  borderRadius: "6px",

                  border:
                    position === item
                      ? "2px solid #d90429"
                      : "1px solid #ddd",

                  background:
                    position === item
                      ? "#fff1f3"
                      : "#fff",
                }}
              >
                {item}
              </button>
            )
          )}

        </div>

      </div>


      {/* START */}

      {!running && (
        <button
          type="button"
          onClick={startDebate}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "12px",

            background: "#d90429",
            color: "#fff",

            border: 0,
            borderRadius: "6px",

            fontWeight: 700,
          }}
        >
          Start AI Debate
        </button>
      )}


      {/* SIMULATION */}

      {running && (

        <div style={{ marginTop: "20px" }}>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
            }}
          >

            <strong>
              Round {round}
            </strong>

            <span>
              {PERSONAS.find(
                (item) =>
                  item.id === persona
              )?.name}
            </span>

          </div>


          {/* CHAT */}

          <div
            style={{
              marginTop: "10px",
              padding: "12px",

              background: "#f7f7f8",

              borderRadius: "8px",

              maxHeight: "300px",
              overflowY: "auto",
            }}
          >

            {messages.map(
              (message, index) => (

                <div
                  key={index}
                  style={{
                    marginBottom: "10px",
                    padding: "10px",

                    background:
                      message.type === "ai"
                        ? "#ffffff"
                        : "#fff1f3",

                    borderRadius: "6px",
                  }}
                >

                  <strong>
                    {message.type === "ai"
                      ? "AI"
                      : "You"}
                  </strong>

                  <div
                    style={{
                      marginTop: "5px",
                    }}
                  >
                    {message.text}
                  </div>

                </div>

              )
            )}

          </div>


          {/* ARGUMENT */}

          <textarea
            value={argument}
            onChange={(e) =>
              setArgument(
                e.target.value
              )
            }
            placeholder="Write your argument..."
            style={{
              width: "100%",
              minHeight: "100px",
              padding: "12px",
              marginTop: "12px",
            }}
          />


          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >

            <button
              type="button"
              onClick={submitArgument}
              style={{
                flex: 1,
                marginTop: "8px",
                padding: "11px",

                background:
                  "#111827",
                color: "#fff",

                border: 0,
                borderRadius: "6px",
              }}
            >
              Submit Argument
            </button>


            <button
              type="button"
              onClick={stopDebate}
              style={{
                marginTop: "8px",
                padding: "11px",

                background: "#fff",
                color: "#d90429",

                border:
                  "1px solid #d90429",
                borderRadius: "6px",
              }}
            >
              End
            </button>

          </div>


          {/* COUNTERARGUMENT */}

          {messages.length > 0 && (
            <div
              style={{
                marginTop: "15px",
                padding: "12px",

                borderLeft:
                  "3px solid #d90429",

                background: "#fff",
              }}
            >

              <strong>
                Counterargument Workflow
              </strong>

              <p
                style={{
                  color: "#555",
                  fontSize: "13px",
                }}
              >
                The AI challenges your latest
                claim and asks you to provide
                stronger reasoning or evidence.
              </p>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
