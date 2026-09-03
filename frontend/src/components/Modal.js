"use client";

import { useEffect } from 'react';
import Button from './Button';

/**
 * Modal/Dialog Component
 * Centered overlay with title, content, and action buttons
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  primaryActionText = 'Confirm',
  secondaryActionText = 'Cancel',
  onPrimaryAction,
  onSecondaryAction,
  variant = 'default',
  size = 'medium',
  closeable = true,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleEsc = (e) => {
      if (e.key === 'Escape' && closeable) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeable]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeable && e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClass = `modal-size-${size}`;
  const variantClass = `modal-${variant}`;

  return (
    <>
      <div className={`modal-backdrop ${isOpen ? 'open' : ''}`} onClick={handleBackdropClick}>
        <div className={`modal ${sizeClass} ${variantClass}`}>
          <div className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            {closeable && (
              <button
                className="modal-close-btn"
                onClick={onClose}
                title="Close modal (ESC)"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>

          <div className="modal-body">
            {children}
          </div>

          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => {
                if (onSecondaryAction) onSecondaryAction();
                onClose();
              }}
            >
              {secondaryActionText}
            </Button>
            {onPrimaryAction && (
              <Button
                variant="primary"
                onClick={() => {
                  onPrimaryAction();
                  onClose();
                }}
              >
                {primaryActionText}
              </Button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease;
        }

        .modal-backdrop.open {
          opacity: 1;
          visibility: visible;
        }

        .modal {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-size-small {
          width: 90vw;
          max-width: 400px;
        }

        .modal-size-medium {
          width: 90vw;
          max-width: 600px;
        }

        .modal-size-large {
          width: 90vw;
          max-width: 900px;
        }

        .modal-default {
          border: 1px solid #e0e1e6;
        }

        .modal-danger {
          border: 1px solid #dc3545;
        }

        .modal-success {
          border: 1px solid #28a745;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e0e1e6;
          background: #fafbfc;
        }

        .modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #212529;
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6c757d;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .modal-close-btn:hover {
          color: #212529;
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .modal-footer {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding: 1.5rem;
          border-top: 1px solid #e0e1e6;
          background: #fafbfc;
        }

        @media (max-width: 768px) {
          .modal-size-small {
            width: 95vw;
            max-width: none;
          }

          .modal-size-medium {
            width: 95vw;
            max-width: none;
          }

          .modal-size-large {
            width: 95vw;
            max-width: none;
          }
        }
      `}</style>
    </>
  );
}
