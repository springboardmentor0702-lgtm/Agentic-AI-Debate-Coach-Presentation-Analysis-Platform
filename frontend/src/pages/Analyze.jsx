import { useState } from "react";
import api from "../api";

const SKILLS = ["clarity", "relevance", "evidence_strength", "logical_consistency", "persuasiveness"];

export default function Analyze() {
  const [lens, setLens] = useState("debate");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [arg, setArg] = useState(null);
  const [fal, setFal] = useState(null);
  const [pres, setPres] = useState(null);

  const run = async () => {
    if (!text.trim()) return;
    setBusy(true); setArg(null); setFal(null); setPres(null);
    try {
      if (lens === "debate") {
        const a = await api.post("/analysis/arguments", { text });
        const f = await api.post("/analysis/fallacies", { text });
        setArg(a.data); setFal(f.data);
      } else {
        const p = await api.post("/analysis/presentation", { text });
        setPres(p.data);
      }
    } catch (e) { alert("Analysis failed — is the backend running?"); }
    setBusy(false);
  };

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <p className="kicker"><span className="dot" /> Analysis lab</p>
          <h1 className="display">Find the signal in your <span className="accent">thinking.</span></h1>
          <p className="sub">Paste a debate argument or presentation transcript. Your coach will map what is working and what to try next.</p>
        </div>
      </div>

      <div className="analyzeGrid">
        <div className="card">
          <h3>What are we listening for?</h3>
          <p className="muted">Choose the lens that matches the work you want to improve.</p>
          <div className="pillrow">
            <button className={"lens" + (lens === "debate" ? " sel" : "")} onClick={() => setLens("debate")}>
              <b>Debate argument</b><small>Logic, evidence, rebuttal</small>
            </button>
            <button className={"lens" + (lens === "presentation" ? " sel" : "")} onClick={() => setLens("presentation")}>
              <b>Presentation</b><small>Pace, clarity, confidence</small>
            </button>
          </div>
          <label>Your {lens === "debate" ? "argument" : "transcript"}</label>
          <textarea rows={9} value={text} onChange={e => setText(e.target.value)}
            placeholder={lens === "debate" ? "Paste an argument with a claim, evidence, or rebuttal…" : "Paste your presentation transcript…"} />
          <div className="charRow">
            <span className="muted">{text.length} characters</span>
            <span className="kicker muted">Private to your workspace</span>
          </div>
          <div className="btnrow end">
            <button className="btn primary big" disabled={busy} onClick={run}>{busy ? "Listening…" : "Run analysis ✦"}</button>
          </div>

          {arg && (
            <div className="result">
              <h4>Scores across five skills</h4>
              {SKILLS.map(k => (
                <div key={k} className="skillrow">
                  <span className="skillname">{k.replace(/_/g, " ")}</span>
                  <div className="skillbar"><div style={{ width: (arg.scores?.[k] ?? 0) + "%" }} /></div>
                  <b>{arg.scores?.[k] ?? 0}</b>
                </div>
              ))}
              {fal && (fal.fallacies?.length ? (
                <><h4>Fallacy flags</h4>{fal.fallacies.map((f, i) => (
                  <p key={i} className="warnchip">🚩 <b>{f.fallacy.replace(/_/g, " ")}</b> — {f.explanation}</p>))}</>
              ) : <p className="ok">✓ No logical fallacies detected.</p>)}
              {(arg.notes || []).length > 0 && <><h4>Your stronger next move</h4><p>{arg.notes[0]}</p></>}
            </div>
          )}

          {pres && (
            <div className="result">
              <h4>Presentation metrics</h4>
              {Object.entries(pres.metrics || {}).map(([k, v]) => (
                <div key={k} className="skillrow"><span className="skillname">{k.replace(/_/g, " ")}</span><div className="skillbar"><div style={{ width: (typeof v === "number" ? Math.min(100, v) : 50) + "%" }} /></div><b>{v}</b></div>
              ))}
              {(pres.feedback || []).map((f, i) => <p key={i}>💡 {f}</p>)}
            </div>
          )}
        </div>

        <div className="card infocard">
          <p className="kicker"><span className="dot" /> Good to know</p>
          <h3>A rough draft is useful data.</h3>
          <p className="muted">Analysis is not a grade. It is a second set of eyes on the moves your audience can actually hear. Include the parts that feel unfinished.</p>
          <p className="kicker" style={{ marginTop: 16 }}>You will get</p>
          <ul className="checks">
            <li>✓ A score across five skills</li>
            <li>✓ Specific fallacy flags</li>
            <li>✓ A stronger next move</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
