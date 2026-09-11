import { useEffect, useState } from "react";
import api from "../api";
export default function EducatorDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/dashboards/educator").then(r => setData(r.data)); }, []);
  if (!data) return <div className="page"><p>Loading...</p></div>;
  const cs = data.class_summary;
  return (
    <div className="page">
      <h1>Educator Dashboard - Class Analytics</h1>
      <div className="cards">
        <div className="card"><h3>{cs.total_students}</h3><p>Students</p></div>
        <div className="card"><h3>{cs.total_sessions}</h3><p>Total Sessions</p></div>
        {Object.entries(cs.class_avg_skills).map(([k, v]) => (
          <div className="card" key={k}><h3>{v}</h3><p>{k.replace(/_/g, " ")}</p></div>
        ))}
      </div>
      <h3>Student Rankings</h3>
      <table className="tbl">
        <thead><tr><th>Rank</th><th>Student</th><th>Avg Overall</th><th>Sessions</th></tr></thead>
        <tbody>{data.rankings.map((r, i) => (
          <tr key={i}><td>#{i + 1}</td><td>{r.student}</td><td>{r.avg_overall}</td><td>{r.sessions}</td></tr>))}
        </tbody>
      </table>
      {data.rankings.length === 0 && <p>No evaluated sessions yet.</p>}
    </div>
  );
}
