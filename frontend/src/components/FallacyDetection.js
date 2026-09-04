export default function FallacyDetection({
  fallacies = []
}) {

  return (
    <section className="fallacy-detection">

      <h2>
        Logical Fallacy Detection
      </h2>

      {fallacies.length === 0 ? (

        <div className="no-fallacy">
          ✓ No logical fallacies detected.
        </div>

      ) : (

        fallacies.map((fallacy, index) => (

          <article
            className="fallacy-card"
            key={index}
          >

            <div className="fallacy-heading">

              <h3>
                {fallacy.name}
              </h3>

              <span className={`severity-${fallacy.severity?.toLowerCase()}`}>
                {fallacy.severity}
              </span>

            </div>

            <p>
              {fallacy.explanation}
            </p>

            <div className="fallacy-correction">

              <strong>
                Correction
              </strong>

              <p>
                {fallacy.correction}
              </p>

            </div>

          </article>

        ))

      )}

    </section>
  );
}
