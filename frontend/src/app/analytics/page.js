"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const authHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("logos_ai_jwt") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const pct = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
};

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const token = localStorage.getItem("logos_ai_jwt");
        if (!token) {
          setError("Please log in to view analytics.");
          return;
        }

        const response = await fetch(`${API}/api/v1/sessions/user/me`, {
          headers: authHeaders(),
        });
        if (!response.ok) throw new Error("Unable to load your debate sessions.");

        const data = await response.json();
        const completed = data.filter((session) => session.status === "Completed");

        const results = await Promise.all(
          completed.map(async (session) => {
            try {
              const res = await fetch(`${API}/api/v1/reports/export/summary/${session.id}`, {
                headers: authHeaders(),
              });
              if (!res.ok) return { session, weighted_performance_score: null };
              return { session, ...(await res.json()) };
            } catch (_) {
              return { session, weighted_performance_score: null };
            }
          })
        );

        if (!cancelled) {
          setSessions(data);
          setSummaries(results);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();
    return () => { cancelled = true; };
  }, []);

  const scored = useMemo(
    () => summaries.filter((item) => Number.isFinite(Number(item.weighted_performance_score))),
    [summaries]
  );

  const average = scored.length
    ? scored.reduce((sum, item) => sum + Number(item.weighted_performance_score), 0) / scored.length
    : 0;
  const best = scored.length
    ? Math.max(...scored.map((item) => Number(item.weighted_performance_score)))
    : 0;
  const latest = scored.length ? Number(scored[0].weighted_performance_score) : 0;

  return (
    <div className="section-container">
      <div className="badge-red-pill">PERFORMANCE INTELLIGENCE ENGINE</div>
      <h1 className="font-display" style={{ fontSize: "3rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>
        ANALYTICS
      </h1>
      <p style={{ color: "var(--text-secondary)", maxWidth: 760, marginBottom: "2rem" }}>
        Track your real debate performance across completed practice sessions. Scores below are loaded from your saved session records.
      </p>

      {loading && <p>Loading your analytics...</p>}
      {error && <p style={{ color: "#e4002b", marginBottom: "1.5rem" }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginBottom: "2rem" }}>
            {[
              ["COMPLETED SESSIONS", scored.length],
              ["LATEST SCORE", pct(latest)],
              ["AVERAGE SCORE", pct(average)],
              ["BEST SCORE", pct(best)],
            ].map(([label, value]) => (
              <div key={label} style={{ border: "1px solid var(--border-light)", background: "#fff", padding: "1.5rem" }}>
                <div className="font-mono text-red" style={{ fontSize: ".7rem", marginBottom: ".6rem" }}>{label}</div>
                <div className="font-display" style={{ fontSize: "2rem", fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ border: "1px solid var(--border-light)", background: "#fff", padding: "1.5rem", marginBottom: "2rem" }}>
            <div className="font-mono text-red" style={{ fontSize: ".75rem", marginBottom: ".75rem" }}>PERFORMANCE TREND</div>
            {scored.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>Complete a practice session to start building your analytics history.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "end", gap: "1rem", minHeight: 180 }}>
                {[...scored].reverse().map((item) => {
                  const score = Number(item.weighted_performance_score);
                  return (
                    <div key={item.session_id} style={{ flex: 1, minWidth: 60, textAlign: "center" }}>
                      <div style={{ height: 130, display: "flex", alignItems: "end", justifyContent: "center", borderBottom: "1px solid #111" }}>
                        <div title={`${score.toFixed(1)}%`} style={{ width: "70%", maxWidth: 70, height: `${Math.max(8, score)}%`, background: "#e4002b" }} />
                      </div>
                      <div style={{ fontWeight: 800, marginTop: ".5rem" }}>{score.toFixed(1)}%</div>
                      <div className="font-mono" style={{ fontSize: ".65rem", color: "#6B7280" }}>S{item.session_id}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ border: "1px solid var(--border-light)", background: "#fff", padding: "1.5rem" }}>
            <div className="font-mono text-red" style={{ fontSize: ".75rem", marginBottom: "1rem" }}>COMPLETED DEBATE HISTORY</div>
            {scored.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>No scored sessions yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #111" }}>
                      <th style={{ textAlign: "left", padding: ".75rem 0" }}>SESSION</th>
                      <th style={{ textAlign: "left", padding: ".75rem 0" }}>TOPIC</th>
                      <th style={{ textAlign: "left", padding: ".75rem 0" }}>FORMAT</th>
                      <th style={{ textAlign: "right", padding: ".75rem 0" }}>SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scored.map((item) => (
                      <tr key={item.session_id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                        <td style={{ padding: ".8rem 0", fontWeight: 800 }}>#{item.session_id}</td>
                        <td style={{ padding: ".8rem 0" }}>{item.session?.topic || item.title || "Debate"}</td>
                        <td style={{ padding: ".8rem 0" }}>{item.session?.format || "—"}</td>
                        <td style={{ padding: ".8rem 0", textAlign: "right", fontWeight: 900, color: "#e4002b" }}>{pct(item.weighted_performance_score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
