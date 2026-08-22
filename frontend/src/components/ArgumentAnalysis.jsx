function ArgumentAnalysis({
  claims = [],
  evidence = [],
  reasoning = []
}) {

  return (
    <div className="argument-analysis">

      <h2>Argument Analysis</h2>

      <div>
        <h3>Claims</h3>

        {claims.map((claim, index) => (
          <div key={index}>
            <strong>
              Claim {index + 1}
            </strong>

            <p>{claim}</p>
          </div>
        ))}
      </div>


      <div>
        <h3>Evidence Evaluation</h3>

        {evidence.map((item, index) => (
          <div key={index}>
            <strong>
              Evidence {index + 1}
            </strong>

            <p>{item}</p>
          </div>
        ))}
      </div>


      <div>
        <h3>Reasoning Quality</h3>

        {reasoning.map((item, index) => (
          <div key={index}>
            <strong>
              Reasoning {index + 1}
            </strong>

            <p>{item}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

export default ArgumentAnalysis;
