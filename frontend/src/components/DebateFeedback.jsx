function DebateFeedback({
  feedback = "",
  suggestions = []
}) {

  return (
    <div className="debate-feedback">

      <h2>
        Debate Feedback Report
      </h2>

      <div>
        <h3>
          Coaching Feedback
        </h3>

        <p>
          {feedback ||
            "Continue improving your argument structure, evidence usage and reasoning."}
        </p>
      </div>


      <div>

        <h3>
          Recommended Improvements
        </h3>

        {suggestions.length === 0 ? (

          <ul>
            <li>
              Improve evidence quality.
            </li>

            <li>
              Make reasoning connections clearer.
            </li>

            <li>
              Address opposing arguments.
            </li>

            <li>
              Avoid logical fallacies.
            </li>
          </ul>

        ) : (

          <ul>
            {suggestions.map(
              (suggestion, index) => (
                <li key={index}>
                  {suggestion}
                </li>
              )
            )}
          </ul>

        )}

      </div>

    </div>
  );
}

export default DebateFeedback;
