"use client";

import React from 'react';

/**
 * Reusable Button Component
 * Supports multiple variants and states
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-size-${size}`;
  const stateClass = loading ? 'btn-loading' : disabled ? 'btn-disabled' : '';

  return (
    <>
      <button
        type={type}
        className={`btn ${variantClass} ${sizeClass} ${stateClass} ${className}`}
        disabled={disabled || loading}
        onClick={onClick}
        {...props}
      >
        {loading && <span className="btn-spinner">⟳</span>}
        <span className="btn-content">{children}</span>
      </button>

      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 1rem;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn:disabled,
        .btn-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Variants */
        .btn-primary {
          background: #d90429;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #b70321;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #218838;
        }

        .btn-outline {
          background: transparent;
          border: 2px solid #d90429;
          color: #d90429;
        }

        .btn-outline:hover:not(:disabled) {
          background: #d90429;
          color: white;
        }

        /* Sizes */
        .btn-size-small {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }

        .btn-size-medium {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
        }

        .btn-size-large {
          padding: 1rem 2rem;
          font-size: 1.125rem;
        }

        /* Loading state */
        .btn-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
          font-size: 1.2em;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .btn-content {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
      `}</style>
    </>
  );
}
