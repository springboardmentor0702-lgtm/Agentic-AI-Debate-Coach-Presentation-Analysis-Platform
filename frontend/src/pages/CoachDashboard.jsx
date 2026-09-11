import { useEffect, useState } from "react";
import api from "../api";
export default function CoachDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/dashboards/coach").then(r => setData(r.data)); }, []);
  if (!data) return <div className="page"><p>Loading...</p></div>;
  return (
    <div className="page">
      <h1>Coach Dashboard - Student Progress Monitoring</h1>
      <h3>Students</h3>
      <table className="tbl">
        <thead><tr><th>Student</th><th>Sessions</th><th>Completed</th><th>Avg Overall</th><th>Weakest Skill</th></tr></thead>
        <tbody>{data.students.map((s, i) => (
          <tr key={i}><td>{s.student}</td><td>{s.sessions}</td><td>{s.completed}</td>
          <td>{s.avg_overall ?? "-"}</td>
          <td>{s.weakest_skill ? <span className="chip">{s.weakest_skill.replace(/_/g, " ")}</span> : "-"}</td></tr>))}
        </tbody>
      </table>
      <h3>Skill Gap Analysis</h3>
      {data.students.filter(s => s.weakest_skill).map((s, i) => (
        <p key={i}><b>{s.student}</b>: focus on <span className="chip">{s.weakest_skill.replace(/_/g, " ")}</span> (avg {s.skills[s.weakest_skill]})</p>
      ))}
      <h3>Recent Debate Evaluations</h3>
      <table className="tbl">
        <thead><tr><th>Student</th><th>Topic</th><th>Score</th><th>Date</th></tr></thead>
        <tbody>{data.recent_evaluations.map((e, i) => (
          <tr key={i}><td>{e.student}</td><td>{e.topic}</td><td>{e.score}</td><td>{e.date}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
