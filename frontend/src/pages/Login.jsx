import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const submit = async e => {
    e.preventDefault();
    try { await login(f.email, f.password); nav("/"); } catch { setErr("Invalid credentials"); }
  };
  const google = async () => {
    try { const { data } = await api.get("/auth/oauth/google/url"); window.location.href = data.url; }
    catch { alert("Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_SECRET in backend/.env"); }
  };
  return (
    <div className="authpage">
      <div className="authcard">
        <div className="brandrow dark"><span className="brandlogo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M3 12h3l2-5 4 10 3-8 2 3h4" /></svg></span><span className="brandword dark">rhetoric</span></div>
        <h1 className="display sm">Welcome <span className="accent">back.</span></h1>
        <p className="sub">Your next clear thought is closer than you think.</p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input placeholder="you@school.edu" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
          <button className="btn primary block">Log in</button>
          {err && <p className="err">{err}</p>}
        </form>
        <button className="btn ghost block" onClick={google}>Continue with Google</button>
        <p className="footline">New here? <Link to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}
