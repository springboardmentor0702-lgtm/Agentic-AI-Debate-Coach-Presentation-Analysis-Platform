"use client";

import { useEffect, useState } from 'react';

export default function ReportsPage() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const token = localStorage.getItem("logos_ai_jwt");
        if (!token) return;

        const response = await fetch("http://localhost:8000/api/v1/sessions/user/me", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) return;

        const data = await response.json();
        const allSessions = Array.isArray(data) ? data : (data.sessions || []);

        const completedSessions = allSessions
          .filter((session) => session.status === "Completed")
          .sort((a, b) => b.id - a.id);

        setSessions(completedSessions);

        if (completedSessions.length > 0) {
          setSessionId(String(completedSessions[0].id));
        }
      } catch (error) {
        console.error("Failed to load debate sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  const openReport = (type) => {
    if (!sessionId) {
      alert("Please select a completed debate session first.");
      return;
    }

    window.open(
      `http://localhost:8000/api/v1/reports/export/${type}/${sessionId}`,
      "_blank"
    );
  };

  const getSessionLabel = (session) => {
    const format = session.format || "Debate";
    const position = session.assigned_position || session.position || "";
    const date = session.created_at
      ? new Date(session.created_at).toLocaleDateString()
      : "";

    return `Session ${session.id} | ${format}${position ? ` | ${position}` : ""}${date ? ` | ${date}` : ""}`;
  };

  return (
    <div className="section-container">
      <div className="badge-red-pill">EXPORT & COMPLIANCE ENGINE</div>

      <h1
        className="font-display"
        style={{
          fontSize: '3rem',
          fontWeight: '900',
          textTransform: 'uppercase',
          marginBottom: '1rem'
        }}
      >
        REPORTS & CERTIFICATES
      </h1>

      <p
        style={{
          color: 'var(--text-secondary)',
          marginBottom: '2rem',
          maxWidth: '700px'
        }}
      >
        Select any completed debate session and download its verified
        performance scorecard, logic audit report, or rhetorical mastery
        certificate.
      </p>

      <div
        style={{
          border: '1px solid var(--border-light)',
          padding: '1.5rem',
          background: '#fff',
          marginBottom: '2rem',
          maxWidth: '900px'
        }}
      >
        <div
          className="font-mono text-red"
          style={{ fontSize: '0.75rem', marginBottom: '0.6rem' }}
        >
          SELECT DEBATE SESSION
        </div>

        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          disabled={loading || sessions.length === 0}
          style={{
            width: '100%',
            padding: '0.9rem',
            border: '1px solid var(--border-light)',
            background: '#fff',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            cursor: loading || sessions.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {loading && <option>Loading completed debates...</option>}

          {!loading && sessions.length === 0 && (
            <option>No completed debate sessions available</option>
          )}

          {!loading &&
            sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {getSessionLabel(session)}
              </option>
            ))}
        </select>

        {!loading && sessions.length > 0 && (
          <div
            className="font-mono"
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              marginTop: '0.6rem'
            }}
          >
            {sessions.length} completed debate{sessions.length !== 1 ? 's' : ''} available
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem'
        }}
      >
        <div
          style={{
            border: '1px solid var(--border-light)',
            padding: '2rem',
            background: '#fff'
          }}
        >
          <div
            className="font-mono text-red"
            style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}
          >
            SESSION PERFORMANCE SCORECARD
          </div>

          <h3
            className="font-display"
            style={{
              fontSize: '1.4rem',
              fontWeight: '800',
              marginBottom: '1rem'
            }}
          >
            5-WEIGHTED METRIC EXPORT
          </h3>

          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem'
            }}
          >
            Includes 30% Arg Quality, 20% Evidence, 20% Consistency,
            15% Rebuttal, 15% Communication breakdowns.
          </p>

          <button
            onClick={() => openReport("csv")}
            className="btn btn-dark"
            style={{ width: '100%' }}
            disabled={!sessionId}
          >
            EXPORT CSV DATA
          </button>
        </div>

        <div
          style={{
            border: '1px solid var(--border-light)',
            padding: '2rem',
            background: '#fff'
          }}
        >
          <div
            className="font-mono text-red"
            style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}
          >
            LOGIC AUDIT LOG
          </div>

          <h3
            className="font-display"
            style={{
              fontSize: '1.4rem',
              fontWeight: '800',
              marginBottom: '1rem'
            }}
          >
            FALLACY & REBUTTAL AUDIT
          </h3>

          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem'
            }}
          >
            Turn-by-turn analysis of fallacies detected, corrections applied,
            and counterargument options.
          </p>

          <button
            onClick={() => openReport("audit")}
            className="btn btn-dark"
            style={{ width: '100%' }}
            disabled={!sessionId}
          >
            EXPORT AUDIT REPORT
          </button>
        </div>

        <div
          style={{
            border: '1px solid var(--border-light)',
            padding: '2rem',
            background: '#fff'
          }}
        >
          <div
            className="font-mono text-red"
            style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}
          >
            VERIFIED CERTIFICATE
          </div>

          <h3
            className="font-display"
            style={{
              fontSize: '1.4rem',
              fontWeight: '800',
              marginBottom: '1rem'
            }}
          >
            RHETORICAL MASTERY CERTIFICATE
          </h3>

          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem'
            }}
          >
            Generate an official certificate using the selected debate
            session's verified performance score.
          </p>

          <button
            onClick={() => openReport("certificate")}
            className="btn btn-red"
            style={{ width: '100%' }}
            disabled={!sessionId}
          >
            GENERATE CERTIFICATE
          </button>
        </div>
      </div>
    </div>
  );
}

