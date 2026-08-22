function ReasoningScore({
  clarity = 0,
  relevance = 0,
  evidenceStrength = 0,
  logicalConsistency = 0,
  persuasiveness = 0
}) {

  const scores = [
    {
      name: "Clarity",
      value: clarity
    },
    {
      name: "Relevance",
      value: relevance
    },
    {
      name: "Evidence Strength",
      value: evidenceStrength
    },
    {
      name: "Logical Consistency",
      value: logicalConsistency
    },
    {
      name: "Persuasiveness",
      value: persuasiveness
    }
  ];

  return (
    <div className="reasoning-score">

      <h2>
        Reasoning Evaluation
      </h2>

      {scores.map((score) => (

        <div
          className="score-row"
          key={score.name}
        >

          <div>
            <span>
              {score.name}
            </span>

            <strong>
              {score.value}/100
            </strong>
          </div>

          <progress
            value={score.value}
            max="100"
          />

        </div>

      ))}

    </div>
  );
}

export default ReasoningScore;
