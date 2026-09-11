import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

const PROMPTS = [
  "What is the one principle you want the room to remember?",
  "Name the strongest evidence against you — how do you absorb it?",
  "If you only had one sentence, what would it be?",
  "Where exactly does your opponent's logic break?",
  "What would change your mind? Say it before they do.",
];
const TOPICS = [
  "AI should be allowed to make high-stakes decisions.",
  "Cities should ban private cars downtown.",
  "AI tutors should be available in every school.",
  "Remote work is better for early-career employees.",
  "The school week should be four days.",
];

const IconMic = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>);

function Live({ sid, onEnd }) {
  const [sess, setSess] = useState(null);
  const [turns, setTurns] = useState([]);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("opening");
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [prompt, setPrompt] = useState(0);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  useEffect(() => { api.get(`/sessions/${sid}`).then(r => { setSess(r.data); setTurns(r.data.turns || []); }).catch(() => {}); }, [sid]);
  useEffect(() => { const t = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(t); }, []);

  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition needs Chrome or Edge. You can type instead."); return; }
    if (listening) { recRef.current && recRef.current.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = "en-US"; r.continuous = true; r.interimResults = false;
    r.onresult = e => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + " "; setText(p => (p ? p + " " : "") + t.trim()); };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    recRef.current = r; r.start(); setListening(true);
  };

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const { data } = await api.post(`/sessions/${sid}/turns`, { content: text, phase });
    setTurns(t => [...t, { speaker: "user", content: text, phase }, ...(data.ai_response ? [{ speaker: "ai", content: data.ai_response }] : [])]);
    setText(""); setPhase("rebuttal"); setBusy(false); setPrompt(p => (p + 1) % PROMPTS.length);
  };
  const end = async () => {
    setBusy(true);
    try { await api.post(`/analysis/sessions/${sid}/evaluate`); } catch (e) {}
    onEnd(sid);
  };

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <p className="kicker"><span className="dot" /> Live simulation</p>
          <h1 className="display">Stay with the <span className="accent">thread.</span></h1>
          <p className="sub">{sess ? `${sess.format.replace("_", " ")} · Focused coach · Position: ${sess.position === "pro" ? "For" : "Against"}` : "Loading session…"}</p>
        </div>
        <Link to="/history" className="btn ghost">🕘 View history</Link>
      </div>

      <div className="practiceGrid">
        <div className="stack">
          <div className="card motion">
            <p className="kicker">The motion</p>
            <h3 className="motionTitle">{sess?.topic || "…"}</h3>
            <p className="muted">You are arguing <b>{sess?.position === "pro" ? "for" : "against"}</b> the motion.</p>
            <div className="timerrow">
              <div className="timer">{mmss(secs)}</div>
              <span className="livedot">● Live coaching</span>
            </div>
            <div className="coachprompt">
              <p className="kicker">Coach prompt</p>
              <p>{PROMPTS[prompt]}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardhead">
            <div><h3>Your argument</h3><p className="muted">Speak or type your response. The coach will follow the shape of your thinking.</p></div>
            <button className={"iconbtn" + (listening ? " hot" : "")} onClick={toggleMic} title="Speak"><IconMic /></button>
          </div>
          <div className="thread">
            {turns.length === 0 && (
              <div className="turn">
                <p className="kicker">Opponent · {mmss(secs)}</p>
                <p>Make your opening. Start with the point you most want to defend.</p>
                <p className="kicker" style={{ marginTop: 10 }}>Your turn</p>
                <p className="muted">Start with the point you most want to defend…</p>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={"turn " + t.speaker}>
                <p className="kicker">{t.speaker === "user" ? "You" : "Opponent"} · {mmss(secs)}</p>
                <p>{t.content}</p>
              </div>
            ))}
          </div>
          <div className="composer">
            <div className="phaseRow">
              <select value={phase} onChange={e => setPhase(e.target.value)}>
                <option value="opening">Opening</option><option value="rebuttal">Rebuttal</option><option value="closing">Closing</option>
              </select>
            </div>
            <textarea rows={4} value={text} placeholder="Type your response here..." onChange={e => setText(e.target.value)} />
            <div className="btnrow">
              <button className="btn ghost" onClick={() => setText("")}>↺ Clear</button>
              <button className="btn primary" disabled={busy} onClick={send}>{busy ? "Analyzing…" : "Send response →"}</button>
              <button className="btn danger" disabled={busy} onClick={end}>End session</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Practice() {
  const { id } = useParams();
  const nav = useNavigate();
  const [topics, setTopics] = useState([]);
  const [f, setF] = useState({ topic_id: "", topic_title: "", format: "ai_simulation", position: "pro" });
  const [sid, setSid] = useState(localStorage.getItem("activeSession") || (id || ""));
  useEffect(() => { api.get("/topics").then(r => setTopics(r.data)).catch(() => {}); }, []);
  useEffect(() => { if (id && id !== sid) { localStorage.setItem("activeSession", id); setSid(id); } }, [id]);

  const start = async e => {
    e.preventDefault();
    const body = f.topic_id ? { ...f } : { ...f, topic_id: undefined };
    const { data } = await api.post("/sessions", body);
    if (data.error) { alert(data.error); return; }
    localStorage.setItem("activeSession", data.id);
    setSid(data.id);
  };
  const onEnd = sid2 => { localStorage.removeItem("activeSession"); nav(`/report/${sid2}`); };

  if (sid) return <Live sid={sid} onEnd={onEnd} />;

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <p className="kicker"><span className="dot" /> Live simulation</p>
          <h1 className="display">Pick your <span className="accent">motion.</span></h1>
          <p className="sub">One-on-one · Focused coach · Real-time feedback.</p>
        </div>
        <Link to="/history" className="btn ghost">🕘 View history</Link>
      </div>
      <div className="card setup">
        <form onSubmit={start}>
          <label>Motion</label>
          <select value={f.topic_id} onChange={e => setF({ ...f, topic_id: e.target.value })}>
            <option value="">— Or propose your own —</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <input placeholder="Custom motion" value={f.topic_title} onChange={e => setF({ ...f, topic_title: e.target.value })} />
          <label>Format</label>
          <select value={f.format} onChange={e => setF({ ...f, format: e.target.value })}>
            <option value="ai_simulation">AI opponent</option>
            <option value="one_on_one">One-on-one (no AI replies)</option>
            <option value="oxford">Oxford</option>
            <option value="parliamentary">Parliamentary</option>
            <option value="policy">Policy</option>
            <option value="public_forum">Public forum</option>
          </select>
          <label>Your position</label>
          <div className="pillrow">
            <button type="button" className={"lens" + (f.position === "pro" ? " sel" : "")} onClick={() => setF({ ...f, position: "pro" })}>For the motion</button>
            <button type="button" className={"lens" + (f.position === "con" ? " sel" : "")} onClick={() => setF({ ...f, position: "con" })}>Against the motion</button>
          </div>
          <button className="btn primary big">▶ Enter the room</button>
        </form>
      </div>
    </div>
  );
}
