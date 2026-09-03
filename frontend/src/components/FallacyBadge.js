"use client";

/**
 * FallacyBadge Component
 * Visual indicator for detected logical fallacies
 * Displays fallacy type, explanation, and correction
 */
import { useState } from 'react';

export default function FallacyBadge({
  fallacyType,
  explanation,
  correctionSuggestion,
  severity = 'medium',
  confidence = 85,
}) {
  const [showDetails, setShowDetails] = useState(false);

  const getSeverityColor = () => {
    switch (severity) {
      case 'high':
        return { bg: '#fee2e2', border: '#dc3545', text: '#991b1b' };
      case 'medium':
        return { bg: '#fef3c7', border: '#ffc107', text: '#92400e' };
      case 'low':
        return { bg: '#d1f2eb', border: '#17a2b8', text: '#0c5460' };
      default:
        return { bg: '#f0f0f0', border: '#6c757d', text: '#212529' };
    }
  };

  const colors = getSeverityColor();

  return (
    <>
      <div className="fallacy-badge" style={{ borderColor: colors.border }}>
        <button
          className="fallacy-toggle"
          onClick={() => setShowDetails(!showDetails)}
          style={{ color: colors.text }}
        >
          <span className="fallacy-type">
            ⚠️ {fallacyType}
          </span>
          <span className="fallacy-confidence">
            {Math.round(confidence)}%
          </span>
          <span className="fallacy-arrow">
            {showDetails ? '▼' : '▶'}
          </span>
        </button>

        {showDetails && (
          <div className="fallacy-details">
            {explanation && (
              <div className="detail-section">
                <h4>What is this fallacy?</h4>
                <p>{explanation}</p>
              </div>
            )}

            {correctionSuggestion && (
              <div className="detail-section">
                <h4>How to correct it</h4>
                <p>{correctionSuggestion}</p>
              </div>
            )}

            <div className="detail-actions">
              <a href="#" className="learn-more">
                Learn more →
              </a>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .fallacy-badge {
          background: ${colors.bg};
          border: 1px solid ${colors.border};
          border-radius: 4px;
          margin-bottom: 0.75rem;
          overflow: hidden;
        }

        .fallacy-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          text-align: left;
          transition: all 0.2s ease;
        }

        .fallacy-toggle:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .fallacy-type {
          flex: 1;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .fallacy-confidence {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
          font-weight: 600;
        }

        .fallacy-arrow {
          font-size: 0.7rem;
          transition: transform 0.2s ease;
        }

        .fallacy-details {
          padding: 1rem;
          border-top: 1px solid ${colors.border};
          background: rgba(0, 0, 0, 0.02);
        }

        .detail-section {
          margin-bottom: 1rem;
        }

        .detail-section:last-child {
          margin-bottom: 0.75rem;
        }

        .detail-section h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          color: ${colors.text};
        }

        .detail-section p {
          margin: 0;
          font-size: 0.85rem;
          line-height: 1.5;
          color: #495057;
        }

        .detail-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .learn-more {
          font-size: 0.8rem;
          color: #0066cc;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .learn-more:hover {
          color: #0052a3;
          text-decoration: underline;
        }
      `}</style>
    </>
  );
}
