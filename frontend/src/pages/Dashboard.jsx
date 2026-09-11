import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const fmtDate = d => { const x = new Date(d); return x.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) + ", " + x.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); };
const scoreColor = s => (s >= 75 ? "teal" : "orange");

const RECOS = {
  argument_quality: ["Practice the pivot", "Your reasoning is thoughtful, but land the principle early. Try a timed one-on-one on a familiar topic."],
  evidence_usage: ["Cite one hard number", "Your claims are clear but under-evidenced. Run a rep where every point carries a statistic or study."],
  logical_consistency: ["Tighten the chain", "Link every claim to the previous one. Try an argument map before your next rep."],
  rebuttal_effectiveness: ["Practice the pivot", "Your rebuttals take time to reach the counterpoint. Try conceding one point, then overturning the pillar."],
  communication_skills: ["Slow down 10%", "Pace and fillers cost you clarity. Record one rep and target filler-word reduction."],
};

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    api.get("/dashboards/learner").then(r => setStats(r.data)).catch(() => {});
    api.get("/sessions").then(r => setSessions(r.data)).catch(() => {});
  }, []);

  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const mons = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const today = `${days[now.getDay()]} · ${mons[now.getMonth()]} ${String(now.getDate()).padStart(2, "0")}, ${now.getFullYear()}`;
  const h = now.getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

  const trend = stats?.improvement_trend || [];
  const avg = stats?.average_scores?.overall_score ?? 0;
  const delta = trend.length > 1 ? Math.round((trend[trend.length - 1].overall - trend[0].overall) * 10) / 10 : null;
  const mini = trend.slice(-8).map(t => t.overall);
  const miniMax = Math.max(...mini, 1);

  // streak from practice days
  const daySet = new Set(trend.map(t => t.date.slice(0, 10)));
  const dstr = d => d.toISOString().slice(0, 10);
  let streak = 0; const cur = new Date();
  if (!daySet.has(dstr(cur))) cur.setDate(cur.getDate() - 1);
  while (daySet.has(dstr(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  const thisWeek = trend.filter(t => (Date.now() - new Date(t.date)) < 7 * 864e5).length;

  const scores = stats?.average_scores || {};
  const skillKeys = ["argument_quality", "evidence_usage", "logical_consistency", "rebuttal_effectiveness", "communication_skills"];
  const realKeys = skillKeys.filter(k => (scores[k] ?? 0) > 0);
  const weakest = realKeys.length ? realKeys.reduce((a, b) => scores[a] <= scores[b] ? a : b) : null;
  const reco = RECOS[weakest] || ["Practice the pivot", "Run your first practice rep and your coach will map exactly what to sharpen next."];

  const recent = sessions.slice(0, 3);
  const done80 = trend.some(t => t.overall >= 80);
  const path = [
    { label: "Claim & evidence", done: stats ? stats.completed >= 1 : false, note: stats?.completed ? "Complete" : "Start here" },
    { label: "Score 80+ session", done: done80, note: done80 ? "Complete" : "Next up" },
    { label: "Five practice reps", done: (stats?.completed ?? 0) >= 5, note: `${Math.min(stats?.completed ?? 0, 5)} of 5` },
  ];
  const pctPath = Math.round(((stats?.completed >= 1 ? 34 : 0) + (done80 ? 33 : 0) + ((stats?.completed ?? 0) >= 5 ? 33 : 0)));

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <p className="kicker"><span className="dot" /> {today}</p>
          <h1 className="display">{greet}, <span className="accent">{(user?.full_name || user?.email || "friend").split(" ")[0]}.</span></h1>
          <p className="sub">Your next clear thought is closer than you think.</p>
        </div>
        <button className="btn primary big" onClick={() => nav("/practice")}>▶ Start a practice</button>
      </div>

      <div className="heroGrid">
        <div className="pathcard">
          <p className="kicker light"><span className="dot" /> Your learning path · Week {Math.max(1, Math.ceil((stats?.completed ?? 0) / 3) + 3)}</p>
          <h2 className="display sm ondark">Make the point.<br />Then make it land.</h2>
          <p className="pathsub">This week is about turning sound reasoning into arguments people remember. Your evidence is strong — now give it a sharper shape.</p>
        </div>
        <div className="statcard">
          <p className="kicker">Average score</p>
          <div className="statnum">{avg || "—"}</div>
          <p className="statmeta">across your last {Math.max(stats?.completed ?? 0, 0)} sessions</p>
          {delta !== null && <p className="statdelta">↗ {delta > 0 ? "+" : ""}{delta} pts this month</p>}
          <div className="minibars">{mini.length ? mini.map((v, i) => <div key={i} className={"minibar" + (i === mini.length - 1 ? " hot" : "")} style={{ height: Math.max(8, (v / miniMax) * 44) + "px" }} />) : <div className="minibar" style={{ height: 8 }} />}</div>
        </div>
        <div className="statcard">
          <p className="kicker">Practice streak</p>
          <div className="statnum">{String(streak).padStart(2, "0")} <small>days</small></div>
          <p className="statmeta">Best streak: {Math.max(streak, stats?.completed ?? 0)} days</p>
          <p className="statdelta">◎ {thisWeek} sessions this week</p>
          <div className="weekbar dark"><div className="weekfill" style={{ width: Math.min(100, (thisWeek / 4) * 100) + "%" }} /></div>
        </div>
      </div>

      <div className="rowGrid">
        <div className="card">
          <div className="cardhead">
            <div><h3>Recent practice</h3><p className="muted">Small reps become confident reflexes.</p></div>
            <Link to="/history" className="linkbtn">View history →</Link>
          </div>
          {recent.length === 0 && <p className="muted pad">No sessions yet — start your first rep above.</p>}
          {recent.map(s => (
            <div key={s.id} className="rowitem">
              <span className="rowicon">📖</span>
              <div className="rowmain">
                <b>{s.topic}</b>
                <p className="muted">{s.format.replace("_", " ")} · {fmtDate(s.created_at)}</p>
                <Link className="openlink" to={s.status === "completed" ? `/report/${s.id}` : `/session/${s.id}`}>Open</Link>
              </div>
              <div className={"rowscore " + scoreColor(s.score ?? 0)}>{s.score ?? "—"}/100</div>
            </div>
          ))}
        </div>
        <div className="stack">
          <div className="card reco">
            <p className="kicker orange"><span className="dot" /> Coach recommendation</p>
            <h3 className="recotitle">{reco[0]}</h3>
            <p className="muted">{reco[1]}</p>
            <button className="btn primary" onClick={() => nav("/practice")}>Try this rep →</button>
          </div>
          <div className="card">
            <div className="cardhead"><h3>Current path</h3><span className="pill">{pctPath}%</span></div>
            <p className="muted">Argument architecture</p>
            {path.map((p, i) => (
              <div key={i} className="milestone">
                <span className={"check" + (p.done ? " done" : "")}>{p.done ? "✓" : ""}</span>
                <div><b>{p.label}</b><p className="muted">{p.note}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
