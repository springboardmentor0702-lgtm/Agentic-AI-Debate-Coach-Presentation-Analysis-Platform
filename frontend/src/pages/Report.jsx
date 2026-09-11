import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement } from "chart.js";
import api from "../api";
Chart.register(CategoryScale, LinearScale, BarElement);

export default function Report() {
  const { id } = useParams();
  const [rep, setRep] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.get(`/analysis/reports/${id}`).then(r => setRep(r.data)).catch(() => setErr("Report not ready")); }, [id]);

  const download = async fmt => {
    const res = await api.get(`/analysis/reports/${id}/export/${fmt}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = `debate-report-${id}.${fmt === "pdf" ? "pdf" : "xlsx"}`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  if (err) return <div className="content"><p>{err}</p><Link className="linkbtn" to="/history">← Back to history</Link></div>;
  if (!rep) return <div className="content"><p className="muted">Compiling your report…</p></div>;
  const s = rep.scores;
  const weakest = ["argument_quality", "evidence_usage", "logical_consistency", "rebuttal_effectiveness", "communication_skills"]
    .reduce((a, b) => (s[a] <= s[b] ? a : b));

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <p className="kicker"><span className="dot" /> Session report</p>
          <h1 className="display sm">{rep.topic}</h1>
          <p className="sub">Overall weighted score · generated {rep.generated_at?.slice(0, 10)}</p>
        </div>
        <div>
          <button className="btn primary" onClick={() => download("pdf")}>⬇ PDF</button>{" "}
          <button className="btn ghost" onClick={() => download("xlsx")}>⬇ Excel</button>
        </div>
      </div>

      <div className="heroGrid tight">
        <div className="statcard wide">
          <p className="kicker">Weighted performance score</p>
          <div className="statnum big">{s.overall_score}<small>/100</small></div>
          <p className="statdelta">Focus next: <b>{weakest.replace(/_/g, " ")}</b></p>
        </div>
        <div className="statcard wide chartcard">
          <Bar height={150} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }}
            data={{ labels: ["Argument 30%", "Evidence 20%", "Logic 20%", "Rebuttal 15%", "Comm 15%"],
              datasets: [{ data: [s.argument_quality, s.evidence_usage, s.logical_consistency, s.rebuttal_effectiveness, s.communication_skills],
                backgroundColor: ["#0B6B63", "#14A098", "#E8590C", "#F59E0B", "#0E3A3A"], borderRadius: 6 }] }} />
        </div>
        <div className="statcard">
          <p className="kicker">Presentation metrics</p>
          <ul className="plainlist">
            {Object.entries(rep.presentation_metrics || {}).slice(0, 5).map(([k, v]) => <li key={k}><b>{k.replace(/_/g, " ")}</b>: {v}</li>)}
          </ul>
        </div>
      </div>

      <div className="rowGrid">
        <div className="card">
          <h3>Fallacies detected <span className="pill">{rep.fallacies_found?.length || 0}</span></h3>
          {rep.fallacies_found?.length ? rep.fallacies_found.map((f, i) => (
            <p key={i} className="warnchip">🚩 <b>{f.fallacy.replace(/_/g, " ")}</b> — {f.explanation}<br /><em>Fix: {f.correction}</em></p>
          )) : <p className="ok">✓ None detected — strong logical rigor!</p>}
        </div>
        <div className="card">
          <h3>Personalized coaching</h3>
          <p><b>{rep.coaching?.coaching_feedback}</b></p>
          <ul className="checks">{(rep.coaching?.improvement_recommendations || []).map((r, i) => <li key={i}>✓ {r}</li>)}</ul>
          <p className="kicker" style={{ marginTop: 10 }}>Learning path</p>
          <ol className="plainlist">{(rep.coaching?.learning_path || []).map((r, i) => <li key={i}>{r}</li>)}</ol>
        </div>
      </div>

      <div className="card">
        <h3>Transcript</h3>
        {rep.transcript.map((t, i) => (
          <div key={i} className={"turn " + t.speaker}>
            <p className="kicker">{t.speaker === "user" ? "You" : "Opponent"}</p>
            <p>{t.content}</p>
          </div>
        ))}
      </div>
      <Link to="/history" className="linkbtn">← Back to history</Link>
    </div>
  );
}
