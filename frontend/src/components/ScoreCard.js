"use client";

/**
 * ScoreCard Component
 * Display a score with visual indicator, sub-scores, and feedback
 */
export default function ScoreCard({
  title,
  score,
  maxScore = 100,
  color = '#d90429',
  subScores = [],
  description,
  benchmark,
  feedback,
  variant = 'default',
}) {
  const percentage = (score / maxScore) * 100;
  const isGood = percentage >= 70;
  const isExcellent = percentage >= 90;

  const getColor = () => {
    if (isExcellent) return '#10b981';
    if (isGood) return '#f59e0b';
    return '#dc3545';
  };

  const finalColor = isExcellent || isGood || isGood ? getColor() : color;

  return (
    <>
      <div className={`score-card score-card-${variant}`}>
        {title && <h3 className="score-card-title">{title}</h3>}

        <div className="score-display">
          <div className="score-circle" style={{ borderColor: finalColor }}>
            <span className="score-value" style={{ color: finalColor }}>
              {Math.round(score)}
            </span>
            <span className="score-max">/ {maxScore}</span>
          </div>

          <div className="score-info">
            {description && <p className="score-description">{description}</p>}
            {benchmark && (
              <div className="score-benchmark">
                <strong>Benchmark:</strong> {benchmark}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="score-progress">
          <div
            className="score-progress-bar"
            style={{
              width: `${percentage}%`,
              backgroundColor: finalColor,
            }}
          ></div>
        </div>

        {/* Sub-scores */}
        {subScores && subScores.length > 0 && (
          <div className="score-subscores">
            <h4 className="subscores-title">Breakdown</h4>
            {subScores.map((subscore, idx) => (
              <div key={idx} className="subscore-row">
                <span className="subscore-label">{subscore.label}</span>
                <div className="subscore-bar">
                  <div
                    className="subscore-fill"
                    style={{
                      width: `${(subscore.value / maxScore) * 100}%`,
                      backgroundColor: subscore.color || '#6c757d',
                    }}
                  ></div>
                </div>
                <span className="subscore-value">{Math.round(subscore.value)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="score-feedback" style={{ borderLeftColor: finalColor }}>
            <strong>💡 Tip:</strong> {feedback}
          </div>
        )}

        {/* Status badge */}
        <div className="score-status">
          {isExcellent && (
            <span className="status-badge excellent">🌟 Excellent</span>
          )}
          {isGood && !isExcellent && (
            <span className="status-badge good">✓ Good</span>
          )}
          {!isGood && (
            <span className="status-badge needswork">⚠️ Needs Work</span>
          )}
        </div>
      </div>

      <style jsx>{`
        .score-card {
          background: white;
          border: 1px solid #e0e1e6;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .score-card-highlighted {
          border-color: #d90429;
          background: #fff9fa;
        }

        .score-card-title {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #212529;
        }

        .score-display {
          display: flex;
          gap: 1.5rem;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .score-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #f8f9fa;
        }

        .score-value {
          font-size: 2rem;
          font-weight: bold;
        }

        .score-max {
          font-size: 0.75rem;
          color: #6c757d;
          margin-top: -0.25rem;
        }

        .score-info {
          flex: 1;
        }

        .score-description {
          margin: 0 0 0.5rem 0;
          color: #495057;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .score-benchmark {
          font-size: 0.875rem;
          color: #6c757d;
          background: #f8f9fa;
          padding: 0.5rem 0.75rem;
          border-radius: 3px;
          border-left: 3px solid #6c757d;
        }

        .score-progress {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .score-progress-bar {
          height: 100%;
          transition: width 0.3s ease;
        }

        .score-subscores {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .subscores-title {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #495057;
          text-transform: uppercase;
        }

        .subscore-row {
          display: grid;
          grid-template-columns: 120px 1fr 50px;
          gap: 1rem;
          align-items: center;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
        }

        .subscore-label {
          color: #495057;
          font-weight: 500;
        }

        .subscore-bar {
          height: 6px;
          background: #dee2e6;
          border-radius: 3px;
          overflow: hidden;
        }

        .subscore-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .subscore-value {
          text-align: right;
          font-weight: 600;
          color: #212529;
        }

        .score-feedback {
          padding: 0.75rem;
          background: #e8f4f8;
          border-left: 3px solid;
          border-radius: 3px;
          font-size: 0.85rem;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .score-status {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .status-badge {
          display: inline-block;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.excellent {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.good {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.needswork {
          background: #fee2e2;
          color: #991b1b;
        }

        @media (max-width: 600px) {
          .score-display {
            flex-direction: column;
            gap: 1rem;
          }

          .subscore-row {
            grid-template-columns: 80px 1fr 40px;
          }
        }
      `}</style>
    </>
  );
}
