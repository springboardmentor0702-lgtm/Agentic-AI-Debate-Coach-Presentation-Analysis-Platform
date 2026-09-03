"use client";

/**
 * Skeleton Loading Component
 * Animated placeholder for content loading
 */
export default function Skeleton({ type = 'card', width = '100%', height = '20px', count = 1, className = '' }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div style={{
            background: '#f0f0f0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1rem',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{
              height: '20px',
              background: '#e0e1e6',
              borderRadius: '4px',
              marginBottom: '0.75rem',
              animation: 'pulse 2s infinite'
            }}></div>
            <div style={{
              height: '16px',
              background: '#e0e1e6',
              borderRadius: '4px',
              width: '80%',
              animation: 'pulse 2s infinite'
            }}></div>
          </div>
        );

      case 'circle':
        return (
          <div style={{
            width: height,
            height: height,
            borderRadius: '50%',
            background: '#e0e1e6',
            animation: 'pulse 2s infinite'
          }}></div>
        );

      case 'text':
        return Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            style={{
              height: height,
              background: '#e0e1e6',
              borderRadius: '4px',
              marginBottom: '0.5rem',
              animation: 'pulse 2s infinite'
            }}
          ></div>
        ));

      case 'table-row':
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  height: '40px',
                  background: '#e0e1e6',
                  borderRadius: '4px',
                  animation: 'pulse 2s infinite'
                }}
              ></div>
            ))}
          </div>
        );

      default:
        return (
          <div
            style={{
              width,
              height,
              background: '#e0e1e6',
              borderRadius: '4px',
              animation: 'pulse 2s infinite'
            }}
          ></div>
        );
    }
  };

  return (
    <>
      <div className={className}>
        {renderSkeleton()}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}
