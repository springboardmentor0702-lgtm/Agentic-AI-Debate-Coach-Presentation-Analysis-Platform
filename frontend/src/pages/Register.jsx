import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register, login } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "", full_name: "", role: "learner", experience_level: "beginner" });
  const submit = async e => {
    e.preventDefault();
    await register(f); await login(f.email, f.password); nav("/");
  };
  return (
    <div className="authpage">
      <div className="authcard">
        <div className="brandrow dark"><span className="brandlogo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M3 12h3l2-5 4 10 3-8 2 3h4" /></svg></span><span className="brandword dark">rhetoric</span></div>
        <h1 className="display sm">Start your <span className="accent">streak.</span></h1>
        <p className="sub">Small reps become confident reflexes.</p>
        <form onSubmit={submit}>
          <label>Full name</label>
          <input placeholder="Eekshitha" onChange={e => setF({ ...f, full_name: e.target.value })} />
          <label>Email</label>
          <input placeholder="you@school.edu" onChange={e => setF({ ...f, email: e.target.value })} />
          <label>Password</label>
          <input type="password" placeholder="••••••••" onChange={e => setF({ ...f, password: e.target.value })} />
          <label>I am a</label>
          <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
            <option value="learner">Student learner</option><option value="coach">Debate coach</option><option value="educator">Educator</option>
          </select>
          <button className="btn primary block">Create account</button>
        </form>
        <p className="footline">Have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
