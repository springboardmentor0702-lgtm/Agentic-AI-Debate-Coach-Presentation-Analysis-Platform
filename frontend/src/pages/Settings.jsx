import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const TOPIC_CHIPS = ["Technology & society", "Education", "Climate & cities", "Business", "Culture & media", "Science"];
const DOMAIN_CHIPS = ["Academic", "Business", "Tech talks", "Competitive debate", "Interviews", "Teaching"];
const LEVELS = [["beginner", "New to this"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]];
const ROLE_LABEL = { learner: "Student learner", coach: "Debate coach", educator: "Educator", admin: "Administrator" };

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("beginner");
  const [topics, setTopics] = useState([]);
  const [domains, setDomains] = useState([]);
  const [goals, setGoals] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/auth/me").then(r => {
      const u = r.data;
      setName(u.full_name || ""); setLevel(u.experience_level || "beginner");
      setTopics(u.preferred_topics || []); setDomains(u.presentation_domains || []);
      setGoals((u.learning_goals || []).join("\n"));
      localStorage.setItem("user", JSON.stringify(u));
    });
  }, []);

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const save = async e => {
    e.preventDefault();
    await api.put("/auth/profile", {
      full_name: name, experience_level: level,
      preferred_topics: topics, presentation_domains: domains,
      learning_goals: goals.split("\n").map(x => x.trim()).filter(Boolean),
    });
    const me = (await api.get("/auth/me")).data;
    localStorage.setItem("user", JSON.stringify(me));
    setMsg("Saved ✓"); setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <p className="kicker"><span className="dot" /> Workspace settings</p>
          <h1 className="display">Make Rhetoric <span className="accent">yours.</span></h1>
          <p className="sub">Your coach gets better when it understands where you want to go.</p>
        </div>
      </div>

      <div className="settingsGrid">
        <div className="card subnav">
          {[["profile", "👤 Profile"], ["preferences", "📈 Preferences"], ["coaching", "✦ Coaching"]].map(([k, l]) => (
            <button key={k} className={"subnavitem" + (tab === k ? " sel" : "")} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        <form className="card" onSubmit={save}>
          {tab === "profile" && (
            <>
              <h3>Profile & experience</h3>
              <p className="muted">Tell us about the person behind the point of view.</p>
              <div className="twoCol">
                <div><label>Name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
                <div><label>Role</label><input value={ROLE_LABEL[user?.role] || user?.role} readOnly /></div>
              </div>
              <label>Experience level</label>
              <div className="pillrow">
                {LEVELS.map(([v, l]) => <button type="button" key={v} className={"lens" + (level === v ? " sel" : "")} onClick={() => setLevel(v)}>{l}</button>)}
              </div>
              <label>Preferred debate topics</label>
              <div className="chiprow">
                {TOPIC_CHIPS.map(c => (
                  <button type="button" key={c} className={"chiptoggle" + (topics.includes(c) ? " sel" : "")} onClick={() => toggle(topics, setTopics, c)}>
                    {topics.includes(c) && "✓ "}{c}
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === "preferences" && (
            <>
              <h3>Practice preferences</h3>
              <p className="muted">Where do you want your reps to come from?</p>
              <label>Presentation domains</label>
              <div className="chiprow">
                {DOMAIN_CHIPS.map(c => (
                  <button type="button" key={c} className={"chiptoggle" + (domains.includes(c) ? " sel" : "")} onClick={() => toggle(domains, setDomains, c)}>
                    {domains.includes(c) && "✓ "}{c}
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === "coaching" && (
            <>
              <h3>Coaching goals</h3>
              <p className="muted">One goal per line. The coach weaves these into your recommendations.</p>
              <label>Learning goals</label>
              <textarea rows={5} value={goals} onChange={e => setGoals(e.target.value)} placeholder={"Win my first Oxford round\nCut filler words to zero"} />
            </>
          )}
          <div className="btnrow end" style={{ marginTop: 16 }}>
            {msg && <span className="ok">{msg}</span>}
            <button className="btn primary">💾 Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
