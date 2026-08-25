"use client";

import { useState } from "react";

import PersonaSelector from "../components/PersonaSelector";
import ScoreCard from "../components/ScoreCard";
import DebateFeedback from "../components/DebateFeedback";

export default function Home() {
  const [scores] = useState({
    argQuality: 78,
    evidence: 68,
    consistency: 74,
    rebuttal: 65,
    communication: 82,
  });

  const [feedback] = useState(
    "Your arguments are generally clear and well structured. Focus on stronger evidence and more effective rebuttals."
  );

  const [recommendations] = useState([
    "Use stronger evidence to support important claims.",
    "Practice responding directly to opposing arguments.",
    "Improve logical connections between claims and conclusions.",
    "Practice concise evidence-based rebuttals.",
  ]);

  return (
    <main className="app">

      {/* HEADER */}

      <header className="header">

        <div>
          <div className="brand">
            AI DEBATE COACH
          </div>

          <h1>
            Debate Simulation & Coaching
          </h1>

          <p>
            Practice debates with AI opponents,
            analyze your performance and build
            personalized skills.
          </p>
        </div>

        <div className="milestone">
          MILESTONE 3
        </div>

      </header>


      {/* MAIN CONTENT */}

      <section className="dashboard">

        {/* LEFT */}

        <div className="main-column">

          <div className="card">

            <PersonaSelector />

          </div>

        </div>


        {/* RIGHT */}

        <aside className="side-column">

          <ScoreCard
            scores={scores}
          />

        </aside>

      </section>


      {/* COACHING */}

      <section className="feedback-section">

        <DebateFeedback
          feedback={feedback}
          suggestions={recommendations}
          scores={scores}
        />

      </section>

    </main>
  );
}
