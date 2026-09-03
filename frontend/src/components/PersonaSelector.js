"use client";

import { useState } from 'react';

/**
 * PersonaSelector Component
 * Displays debate persona options with descriptions
 */
export default function PersonaSelector({ value, onChange, disabled = false }) {
  const personas = [
    {
      id: 'The Contrarian',
      name: 'The Contrarian',
      emoji: '🤔',
      description: 'Questions every assumption; demands rigorous proof; challenges conventional wisdom.',
      color: '#d90429'
    },
    {
      id: 'The Academic',
      name: 'The Academic',
      emoji: '📚',
      description: 'Data-driven and theoretical; cites studies; focuses on nuance and complexity.',
      color: '#4f46e5'
    },
    {
      id: 'The Strategist',
      name: 'The Strategist',
      emoji: '♟️',
      description: 'Pragmatic and tactical; finds rhetorical weak points; adapts to your arguments.',
      color: '#10b981'
    }
  ];

  return (
    <>
      <div className="persona-selector">
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            SELECT OPPONENT PERSONA
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => onChange(persona.id)}
              disabled={disabled}
              style={{
                padding: '1.25rem',
                border: '2px solid ' + (value === persona.id ? persona.color : '#e0e1e6'),
                background: value === persona.id ? '#f8f9fa' : '#ffffff',
                borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                opacity: disabled ? 0.6 : 1
              }}
              className="persona-option"
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {persona.emoji}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem', color: '#212529' }}>
                {persona.name}
              </div>
              <div style={{ fontSize: '0.75rem', lineHeight: '1.4', color: '#6c757d' }}>
                {persona.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .persona-selector {
          margin: 1rem 0;
        }

        .persona-option:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .persona-option:active:not(:disabled) {
          transform: translateY(0);
        }

        @media (max-width: 600px) {
          .persona-selector {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
