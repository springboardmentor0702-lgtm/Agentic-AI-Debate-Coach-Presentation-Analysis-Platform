export default function ReasoningScore({
  clarity = 0,
  relevance = 0,
  evidenceStrength = 0,
  logicalConsistency = 0,
  persuasiveness = 0
}) {

  const scores = [
    ["Clarity", clarity],
    ["Relevance", relevance],
    ["Evidence Strength", evidenceStrength],
    ["Logical Consistency", logicalConsistency],
    ["Persuasiveness", persuasiveness]
  ];

  return (
    <section className="reasoning-score">

      <h2>
        Reasoning Evaluation
      </h2>

      {scores.map(([name, score]) => (

        <div
          className="reasoning-row"
          key={name}
        >

          <div className="reasoning-label">

            <span>
              {name}
            </span>

            <strong>
              {score}/100
            </strong>

          </div>

          <div className="reasoning-progress">

            <div
              style={{
                width: `${score}%`
              }}
            />

          </div>

        </div>

      ))}

    </section>
  );
}
