import { useEffect, useState } from "react";
import api from "../api";
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [ann, setAnn] = useState({ title: "", message: "" });
  const load = () => {
    api.get("/admin/stats").then(r => setStats(r.data));
    api.get("/admin/users").then(r => setUsers(r.data));
  };
  useEffect(() => { load(); }, []);
  const setRole = async (uid, role) => { await api.put(`/admin/users/${uid}/role`, { role }); load(); };
  const del = async (uid) => {
    if (window.confirm("Delete this user and all their data?")) {
      await api.delete(`/admin/users/${uid}`); load();
    }
  };
  const announce = async (e) => {
    e.preventDefault();
    await api.post("/notifications/announce", ann);
    setAnn({ title: "", message: "" });
    alert("Announcement sent to all users");
  };
  return (
    <div className="page">
      <h1>Admin Dashboard</h1>
      {stats && <>
        <div className="cards">
          <div className="card"><h3>{stats.users}</h3><p>Users</p></div>
          <div className="card"><h3>{stats.sessions}</h3><p>Sessions</p></div>
          <div className="card"><h3>{stats.reports}</h3><p>Reports</p></div>
          <div className="card"><h3>{stats.ai_engine.mode}</h3><p>AI Engine ({stats.ai_engine.model})</p></div>
        </div>
        <p className="tag">LLM calls: {stats.ai_engine.llm_calls.ok} ok / {stats.ai_engine.llm_calls.fail} failed</p>
      </>}
      <h3>Platform Announcements (Module 12)</h3>
      <form className="panel" onSubmit={announce}>
        <input placeholder="Title" value={ann.title} onChange={e => setAnn({ ...ann, title: e.target.value })} />
        <input placeholder="Message" value={ann.message} onChange={e => setAnn({ ...ann, message: e.target.value })} />
        <button>Send to all users</button>
      </form>
      <h3>User Management</h3>
      <table className="tbl">
        <thead><tr><th>Email</th><th>Name</th><th>Role</th><th></th></tr></thead>
        <tbody>{users.map(u => (
          <tr key={u.id}>
            <td>{u.email}</td><td>{u.full_name}</td>
            <td>
              <select value={u.role} onChange={e => setRole(u.id, e.target.value)}>
                <option value="learner">learner</option><option value="coach">coach</option>
                <option value="educator">educator</option><option value="admin">admin</option>
              </select>
            </td>
            <td><button className="btn2" onClick={() => del(u.id)}>Delete</button></td>
          </tr>))}
        </tbody>
      </table>
    </div>
  );
}
