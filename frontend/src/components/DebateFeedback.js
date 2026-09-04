export default function DebateFeedback({
  feedback,
  suggestions = []
}) {

  return (
    <section className="debate-feedback">

      <h2>
        Debate Feedback Report
      </h2>

      {feedback && (
        <div className="feedback-summary">
          <h3>
            Overall Feedback
          </h3>

          <p>
            {feedback}
          </p>
        </div>
      )}

      <div className="feedback-suggestions">

        <h3>
          Improvement Suggestions
        </h3>

        {suggestions.length === 0 ? (
          <p>
            Continue practising clear claims,
            strong evidence and logical reasoning.
          </p>
        ) : (

          suggestions.map(
            (suggestion, index) => (

              <div
                className="suggestion"
                key={index}
              >

                <span>
                  {index + 1}
                </span>

                <p>
                  {suggestion}
                </p>

              </div>

            )
          )

        )}

      </div>

    </section>
  );
}
