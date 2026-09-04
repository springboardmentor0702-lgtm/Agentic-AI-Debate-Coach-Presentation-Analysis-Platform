export default function ArgumentAnalysis({
  claims = [],
  evidence = [],
  reasoning = []
}) {
  return (
    <div className="argument-analysis">

      <h2>Argument Analysis</h2>

      <section>
        <h3>Claims</h3>

        {claims.length === 0 ? (
          <p>No claims identified.</p>
        ) : (
          claims.map((claim, index) => (
            <div className="analysis-item" key={index}>
              <span>{index + 1}</span>
              <p>{claim}</p>
            </div>
          ))
        )}
      </section>

      <section>
        <h3>Evidence Evaluation</h3>

        {evidence.map((item, index) => (
          <div className="analysis-item" key={index}>
            <span>✓</span>
            <p>{item}</p>
          </div>
        ))}
      </section>

      <section>
        <h3>Reasoning Quality</h3>

        {reasoning.map((item, index) => (
          <div className="analysis-item" key={index}>
            <span>→</span>
            <p>{item}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
