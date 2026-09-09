"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportsPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("logos_ai_jwt");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const token = localStorage.getItem("logos_ai_jwt");
        if (!token) {
          setError("Please log in to access your reports.");
          return;
        }

        const response = await fetch(`${API}/api/v1/sessions/user/me`, {
          headers: authHeaders()
        });
        if (!response.ok) throw new Error("Unable to load your debate sessions.");

        const data = await response.json();
        setSessions(data);
        const completed = data.find((session) => session.status === "Completed");
        setSelectedSession(completed || data[0] || null);
      } catch (err) {
        setError(err.message || "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  const openExport = (path) => {
    if (!selectedSession) return;
    const token = localStorage.getItem("logos_ai_jwt");
    if (!token) {
      setError("Please log in again before exporting a report.");
      return;
    }

    // Browser downloads need the Authorization header, so fetch the file first.
    fetch(`${API}${path}`, { headers: authHeaders() })
      .then(async (response) => {
        if (!response.ok) {
          let detail = "Export failed.";
          try {
            const body = await response.json();
            detail = body.detail || detail;
          } catch (_) {}
          throw new Error(detail);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1] || "logos_ai_report";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => setError(err.message || "Export failed."));
  };

  const sessionId = selectedSession?.id;

  return (
    <div className="section-container">
      <div className="badge-red-pill">EXPORT & COMPLIANCE ENGINE</div>
      <h1 className="font-display" style={{ fontSize: "3rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "1rem" }}>
        REPORTS & CERTIFICATES
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", maxWidth: "700px" }}>
        Download verified performance scorecards, argument logic audit logs, and official debate improvement certificates in CSV / PDF / Excel formats.
      </p>

      {loading && <p>Loading your sessions...</p>}
      {error && <p style={{ color: "#e4002b", marginBottom: "1.5rem" }}>{error}</p>}

      {!loading && !error && sessions.length > 0 && (
        <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid var(--border-light)", background: "#fff" }}>
          <div className="font-mono text-red" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>REPORT SESSION</div>
          <select
            value={sessionId || ""}
            onChange={(e) => setSelectedSession(sessions.find((s) => String(s.id) === e.target.value) || null)}
            style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border-light)", background: "#fff" }}
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                Session {session.id} — {session.topic} [{session.status}]
              </option>
            ))}
          </select>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <p style={{ marginBottom: "2rem" }}>No debate sessions have been recorded yet. Complete a practice session first.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem" }}>
        <div style={{ border: "1px solid var(--border-light)", padding: "2rem", background: "#fff" }}>
          <div className="font-mono text-red" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>DEBATE & SPEECH ANALYSIS REPORT</div>
          <h3 className="font-display" style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "1rem" }}>ASSESSMENT PDF REPORT</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Comprehensive analysis of your debate arguments, prosody metrics (WPM, filler word density), and rhetorical scores.
          </p>
          <button disabled={!selectedSession} onClick={() => openExport(`/api/v1/reports/export/pdf/${sessionId}`)} className="btn btn-red" style={{ width: "100%" }}>
            DOWNLOAD ASSESSMENT PDF
          </button>
        </div>

        <div style={{ border: "1px solid var(--border-light)", padding: "2rem", background: "#fff" }}>
          <div className="font-mono text-red" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>5-WEIGHTED PERFORMANCE MATRIX</div>
          <h3 className="font-display" style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "1rem" }}>EXCEL & CSV METRIC EXPORT</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Excel-compatible grid mapping your exact performance metrics (Argument Quality, Evidence, Logic, Rebuttal, Comms).
          </p>
          <button disabled={!selectedSession} onClick={() => openExport(`/api/v1/reports/export/excel/${sessionId}`)} className="btn btn-dark" style={{ width: "100%" }}>
            EXPORT EXCEL / CSV DATA
          </button>
        </div>

        <div style={{ border: "1px solid var(--border-light)", padding: "2rem", background: "#fff" }}>
          <div className="font-mono text-red" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>COACHING & LEARNING PROGRESS</div>
          <h3 className="font-display" style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "1rem" }}>COACHING & PLANS (PDF)</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Personalized learning path, skill milestones, and custom recommendations compiled dynamically from your history.
          </p>
          <button onClick={() => {
            const token = localStorage.getItem("logos_ai_jwt");
            if (!token) return setError("Please log in again before exporting a coaching plan.");
            try {
              const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
              openExport(`/api/v1/reports/export/coaching/pdf/${payload.user_id}`);
            } catch (_) {
              setError("Your login session is invalid. Please log in again.");
            }
          }} className="btn btn-dark" style={{ width: "100%" }}>
            EXPORT COACHING PLAN (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
