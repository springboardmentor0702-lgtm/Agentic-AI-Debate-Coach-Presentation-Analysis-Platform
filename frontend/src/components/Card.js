"use client";

/**
 * Card Component
 * Flexible container for content with header, body, and footer sections
 */
export default function Card({
  children,
  header,
  footer,
  className = '',
  variant = 'default',
}) {
  const variantClass = `card-${variant}`;

  return (
    <>
      <div className={`card ${variantClass} ${className}`}>
        {header && (
          <div className="card-header">
            {typeof header === 'string' ? <h3>{header}</h3> : header}
          </div>
        )}
        <div className="card-body">
          {children}
        </div>
        {footer && (
          <div className="card-footer">
            {typeof footer === 'string' ? <p>{footer}</p> : footer}
          </div>
        )}
      </div>

      <style jsx>{`
        .card {
          background: white;
          border: 1px solid #e0e1e6;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .card-default {
          background: white;
        }

        .card-elevated {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .card-highlighted {
          border-color: #d90429;
          background: #fff9fa;
        }

        .card-header {
          padding: 1.25rem;
          border-bottom: 1px solid #e0e1e6;
          background: #fafbfc;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #212529;
        }

        .card-body {
          padding: 1.25rem;
        }

        .card-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid #e0e1e6;
          background: #fafbfc;
          color: #6c757d;
          font-size: 0.875rem;
        }

        .card-footer p {
          margin: 0;
        }
      `}</style>
    </>
  );
}
