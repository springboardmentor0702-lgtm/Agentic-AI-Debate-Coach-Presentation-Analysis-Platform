import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const fmt = d => { const x = new Date(d); const today = new Date().toDateString();
  const t = x.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (x.toDateString() === today) return "Today, " + t;
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (x.toDateString() === y.toDateString()) return "Yesterday, " + t;
  return x.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) + ", " + t; };

const fmtLabel = f => ({ ai_simulation: "AI simulation", one_on_one: "One-on-one", oxford: "Oxford", parliamentary: "Parliamentary", policy: "Policy", public_forum: "Public forum" }[f] || f);
const scoreColor = s => (s >= 75 ? "teal" : "orange");

export default function History() {
  const nav = useNavigate();
  const [filter, setFilter] = useState("all");
  const [sessions, setSessions] = useState([]);
  const [analyses, setAnalyses] = useState(() => JSON.parse(localStorage.getItem("analysisLog") || "[]"));
  useEffect(() => { api.get("/sessions").then(r => setSessions(r.data)).catch(() => {}); }, []);

  const debates = sessions.map(s => ({ id: s.id, kind: "debate", title: s.topic, meta: `Debate · ${fmtLabel(s.format)} · ${fmt(s.created_at)}`, status: s.status, score: s.score }));
  const pres = analyses.map(a => ({ id: a.id, kind: "presentation", title: a.title, meta: `Presentation · Analysis · ${a.date}`, status: "ready", score: a.score }));
  const all = [...debates, ...pres];
  const rows = all.filter(r => filter === "all" || r.kind === filter);

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <p className="kicker"><span className="dot" /> Practice archive</p>
          <h1 className="display">Your work, <span className="accent">in context.</span></h1>
          <p className="sub">Review the moments that made your thinking stronger.</p>
        </div>
        <button className="btn primary big" onClick={() => nav("/analyze")}>⚙ Analyze something</button>
      </div>

      <div className="card">
        <div className="filterrow">
          <span className="kicker muted">Show</span>
          {["all", "debate", "presentation"].map(k => (
            <button key={k} className={"filterpill" + (filter === k ? " sel" : "")} onClick={() => setFilter(k)}>
              {k === "all" ? "All" : k === "debate" ? "Debates" : "Presentations"}
            </button>
          ))}
          <span className="kicker muted" style={{ marginLeft: "auto" }}>{rows.length} records</span>
        </div>
        {rows.length === 0 && <p className="muted pad">Nothing here yet. Your practice runs will appear in this archive.</p>}
        {rows.map(r => (
          <div key={r.id} className="hrow">
            <div>
              <b>{r.title}</b>
              <p className="muted mono">{r.meta}</p>
            </div>
            <span className={"chip " + (r.status === "completed" ? "green" : r.status === "ready" ? "orange" : "gray")}>
              {r.status === "completed" ? "Completed" : r.status === "ready" ? "Analysis ready" : r.status === "active" ? "In progress" : "Scheduled"}
            </span>
            <span className={"hscore " + scoreColor(r.score ?? 0)}>{r.score ?? "—"}/100</span>
            <Link className="chevbtn" to={r.kind === "presentation" ? "/analyze" : (r.status === "completed" ? `/report/${r.id}` : `/session/${r.id}`)}>›</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
