function FallacyDetection({
  fallacies = []
}) {

  return (
    <div className="fallacy-detection">

      <h2>
        Logical Fallacy Detection
      </h2>

      {fallacies.length === 0 ? (

        <p>
          ✓ No logical fallacies detected.
        </p>

      ) : (

        fallacies.map((fallacy, index) => (

          <div
            key={index}
            className="fallacy-card"
          >

            <div>
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

            <div>
              <strong>
                Correction:
              </strong>

              <p>
                {fallacy.correction}
              </p>
            </div>

          </div>

        ))

      )}

    </div>
  );
}

export default FallacyDetection;
