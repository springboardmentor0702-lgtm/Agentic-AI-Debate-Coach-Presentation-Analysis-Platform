"use client";

import { useState } from "react";
import Link from "next/link";

export default function AnalyzePage() {

  const [topic, setTopic] = useState("");

  const [argument, setArgument] = useState("");

  const [analysis, setAnalysis] = useState(null);

  const [loading, setLoading] = useState(false);


  function analyzeArgument() {

    if (!argument.trim()) {
      alert("Please enter an argument.");
      return;
    }

    setLoading(true);

    setTimeout(() => {

      setAnalysis({
        overallScore: 82,

        clarity: 86,

        relevance: 88,

        evidenceStrength: 76,

        logicalConsistency: 84,

        persuasiveness: 79,

        claims: [
          "The central claim is clearly identifiable.",
          "The argument takes a definite position on the topic."
        ],

        evidence: [
          "Supporting evidence is present.",
          "Additional reliable evidence would strengthen the argument."
        ],

        reasoning: [
          "The conclusion generally follows from the presented claims.",
          "Some connections between evidence and conclusion need clarification."
        ],

        fallacies: [
          {
            name: "Hasty Generalization",
            severity: "Medium",
            explanation:
              "A broad conclusion appears to be based on limited examples.",
            correction:
              "Use a broader and more representative evidence base."
          }
        ],

        feedback:
          "Strengthen the supporting evidence, make the reasoning between claims and conclusions more explicit, and address opposing viewpoints more carefully."
      });

      setLoading(false);

    }, 1000);
  }


  return (
    <main className="page">

      <header className="navbar">

        <div className="logo">
          LOGOS<span>.AI</span>
        </div>

        <nav>
          <Link href="/">Dashboard</Link>
          <Link href="/analyze" className="active">
            Analyze
          </Link>
        </nav>

      </header>


      <section className="analysis-page">

        <div className="eyebrow">
          MILESTONE 02 · ARGUMENT ANALYSIS
        </div>

        <h1>
          Argument <span>Analysis</span>
        </h1>

        <p className="intro">
          Submit a debate argument to evaluate its claims,
          evidence, reasoning quality and logical fallacies.
        </p>


        <div className="analysis-grid">

          {/* INPUT */}

          <section className="input-card">

            <h2>Argument Input</h2>

            <label>
              Debate Topic
            </label>

            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Example: Should AI be used in education?"
            />


            <label>
              Argument
            </label>

            <textarea
              value={argument}
              onChange={(e) => setArgument(e.target.value)}
              placeholder="Enter your debate argument here..."
              rows="15"
            />


            <button
              className="primary-button analyze-button"
              onClick={analyzeArgument}
              disabled={loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyze Argument →"}
            </button>

          </section>


          {/* RESULTS */}

          <section className="results-card">

            {!analysis && (
              <div className="empty-state">

                <div className="empty-icon">
                  AI
                </div>

                <h2>
                  Analysis Results
                </h2>

                <p>
                  Submit an argument to see your
                  Milestone 2 evaluation.
                </p>

              </div>
            )}


            {analysis && (
              <>

                <div className="result-header">

                  <div>
                    <span>
                      ANALYSIS COMPLETE
                    </span>

                    <h2>
                      {topic || "Debate Argument"}
                    </h2>
                  </div>

                  <div className="score-circle">
                    <strong>
                      {analysis.overallScore}
                    </strong>

                    <small>
                      /100
                    </small>
                  </div>

                </div>


                {/* SCORE */}

                <h3 className="result-title">
                  Reasoning Evaluation
                </h3>

                <div className="scores">

                  <Score
                    title="Clarity"
                    value={analysis.clarity}
                  />

                  <Score
                    title="Relevance"
                    value={analysis.relevance}
                  />

                  <Score
                    title="Evidence Strength"
                    value={analysis.evidenceStrength}
                  />

                  <Score
                    title="Logical Consistency"
                    value={analysis.logicalConsistency}
                  />

                  <Score
                    title="Persuasiveness"
                    value={analysis.persuasiveness}
                  />

                </div>


                {/* CLAIMS */}

                <ResultSection
                  title="Claims"
                  items={analysis.claims}
                />


                {/* EVIDENCE */}

                <ResultSection
                  title="Evidence Evaluation"
                  items={analysis.evidence}
                />


                {/* REASONING */}

                <ResultSection
                  title="Reasoning Analysis"
                  items={analysis.reasoning}
                />


                {/* FALLACIES */}

                <div className="result-block">

                  <h3>
                    Logical Fallacy Detection
                  </h3>

                  {analysis.fallacies.map(
                    (fallacy, index) => (

                      <div
                        className="fallacy"
                        key={index}
                      >

                        <div className="fallacy-top">

                          <strong>
                            {fallacy.name}
                          </strong>

                          <span>
                            {fallacy.severity}
                          </span>

                        </div>

                        <p>
                          {fallacy.explanation}
                        </p>

                        <div className="correction">

                          <b>
                            Correction:
                          </b>

                          {fallacy.correction}

                        </div>

                      </div>

                    )
                  )}

                </div>


                {/* FEEDBACK */}

                <div className="feedback">

                  <h3>
                    Debate Coaching Feedback
                  </h3>

                  <p>
                    {analysis.feedback}
                  </p>

                </div>

              </>
            )}

          </section>

        </div>

      </section>

    </main>
  );
}


function Score({ title, value }) {

  return (
    <div className="score">

      <div className="score-top">

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

      </div>

      <div className="progress">

        <div
          style={{
            width: `${value}%`
          }}
        />

      </div>

    </div>
  );
}


function ResultSection({ title, items }) {

  return (
    <div className="result-block">

      <h3>{title}</h3>

      {items.map((item, index) => (

        <div
          className="finding"
          key={index}
        >

          <span>
            {index + 1}
          </span>

          <p>
            {item}
          </p>

        </div>

      ))}

    </div>
  );
}
