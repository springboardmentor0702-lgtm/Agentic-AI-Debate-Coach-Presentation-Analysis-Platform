"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Volume2, VolumeX, Play, Square, Zap, ShieldAlert, Brain, Send, RotateCcw } from "lucide-react";

const API = "http://localhost:8000/api/v1";
const topics = [
  "Artificial intelligence should be regulated like a public utility.",
  "Universal Basic Income is essential in an automated economy.",
  "Social media platforms should be regulated to protect public wellbeing.",
  "AI should replace a significant portion of routine office work.",
  "Custom topic"
];
const formats = ["AI Debate Simulation", "One-on-One Debate", "Parliamentary Debate", "Oxford Debate", "Policy Debate", "Public Forum Debate"];
const personas = [
  { name: "The Contrarian", desc: "Attacks assumptions and tests weak links." },
  { name: "The Academic", desc: "Demands definitions, sources and methodology." },
  { name: "The Strategist", desc: "Presses implementation, incentives and trade-offs." }
];

function headers(json = false) {
  const token = typeof window !== "undefined" ? localStorage.getItem("logos_ai_jwt") : null;
  return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function SimulationPage() {
  const router = useRouter();
  const recognitionRef = useRef(null);
  const [topic, setTopic] = useState(topics[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [format, setFormat] = useState(formats[0]);
  const [position, setPosition] = useState("Affirmative");
  const [persona, setPersona] = useState(personas[0].name);
  const [sessionId, setSessionId] = useState(null);
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("logos_ai_jwt")) router.push("/login");
    return () => { try { recognitionRef.current?.stop(); } catch {} };
  }, [router]);

  const speak = (text) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1.0; u.volume = 0.9;
    window.speechSynthesis.speak(u);
  };

  const startVoice = () => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Voice recognition is not supported in this browser. Try Google Chrome or Microsoft Edge."); return; }
    if (listening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    recognitionRef.current = rec; rec.continuous = true; rec.interimResults = true; rec.lang = "en-IN";
    let finalText = input;
    rec.onstart = () => { setListening(true); setError(""); };
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${text} `; else interim += text;
      }
      setInput(`${finalText}${interim}`.trim());
    };
    rec.onerror = (e) => setError(`Microphone error: ${e.error}. Please allow microphone access.`);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const startDebate = async () => {
    const finalTopic = topic === "Custom topic" ? customTopic.trim() : topic;
    if (!finalTopic) { setError("Enter a custom topic first."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch(`${API}/sessions/create`, { method: "POST", headers: headers(true), body: JSON.stringify({ title: `${format}: ${finalTopic.slice(0, 60)}`, topic: finalTopic, format, assigned_position: position, status: "Active" }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json(); setSessionId(data.id); setRunning(true); setTurns([]); setAnalysis(null);
      const opening = `Welcome to the ${format}. I am ${persona}. You are arguing the ${position} side. Give me your opening argument and be ready for cross-examination.`;
      setTurns([{ speaker: "SYSTEM", text: `SESSION #${data.id} INITIALIZED • ${position.toUpperCase()} • ${persona.toUpperCase()}`, type: "system" }, { speaker: `AI • ${persona}`, text: opening, type: "ai" }]);
      speak(opening);
    } catch (e) { setError("Could not create the session. Make sure the FastAPI backend and PostgreSQL are running."); }
    finally { setBusy(false); }
  };

  const sendArgument = async () => {
    const text = input.trim(); if (!text || !sessionId || busy) return;
    setInput(""); setBusy(true); setError("");
    setTurns(prev => [...prev, { speaker: "YOU", text, type: "user" }]);
    try {
      const res = await fetch(`${API}/simulation/turn`, { method: "POST", headers: headers(true), body: JSON.stringify({ session_id: sessionId, user_argument: text, opponent_persona: persona }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTurns(prev => [...prev, { speaker: `AI • ${persona}`, text: data.opponent_rebuttal, type: "ai", fallacies: data.fallacies_detected_in_user, strength: data.rebuttal_strength_percent }]);
      setAnalysis(data); speak(data.opponent_rebuttal);
    } catch (e) { setError("The debate turn failed. Check the backend logs and try again."); }
    finally { setBusy(false); }
  };

  const complete = async () => {
    if (!sessionId) return;
    setBusy(true);
    try { const res = await fetch(`${API}/sessions/${sessionId}/complete`, { method: "POST", headers: headers() }); if (!res.ok) throw new Error(); const data = await res.json(); setRunning(false); setAnalysis(prev => ({ ...(prev || {}), finalScore: data.overall_weighted_score })); }
    catch { setError("Could not complete this session."); } finally { setBusy(false); }
  };

  if (!running) return (
    <div className="debate-shell">
      <div className="arena-hero">
        <div className="badge-red-pill"><Zap size={14}/> LIVE AI DEBATE ARENA</div>
        <h1 className="arena-title">THINK.<br/><span>DEFEND.</span><br/>ADAPT.</h1>
        <p>Enter a live multi-turn debate with an AI opponent. Speak naturally, get challenged, detect fallacies and finish with a measurable performance score.</p>
      </div>
      <div className="arena-config">
        <section className="config-card">
          <div className="config-kicker">01 / PROPOSITION</div>
          <h2>Choose your battlefield</h2>
          <select value={topic} onChange={e => setTopic(e.target.value)}>{topics.map(t => <option key={t}>{t}</option>)}</select>
          {topic === "Custom topic" && <input value={customTopic} onChange={e => setCustomTopic(e.target.value)} placeholder="Type your own debate proposition..."/>}
          <div className="config-kicker">02 / POSITION</div>
          <div className="segmented"><button className={position === "Affirmative" ? "selected" : ""} onClick={() => setPosition("Affirmative")}>FOR / AFFIRMATIVE</button><button className={position === "Negative" ? "selected" : ""} onClick={() => setPosition("Negative")}>AGAINST / NEGATIVE</button></div>
          <div className="config-kicker">03 / FORMAT</div>
          <select value={format} onChange={e => setFormat(e.target.value)}>{formats.map(f => <option key={f}>{f}</option>)}</select>
        </section>
        <section className="config-card persona-card">
          <div className="config-kicker">04 / OPPONENT PERSONA</div>
          <h2>Choose your pressure</h2>
          {personas.map(p => <button key={p.name} className={`persona-option ${persona === p.name ? "active" : ""}`} onClick={() => setPersona(p.name)}><span>{p.name}</span><small>{p.desc}</small></button>)}
          <button className="launch-button" onClick={startDebate} disabled={busy}><Play size={18}/>{busy ? "INITIALIZING..." : "START LIVE DEBATE"}</button>
          {error && <div className="error-box">{error}</div>}
        </section>
      </div>
      <style jsx>{styles}</style>
    </div>
  );

  return (
    <div className="debate-shell live-shell">
      <div className="live-top"><div><div className="badge-red-pill">ROUND {analysis?.turn_index || turns.filter(t => t.type === "user").length} • {format}</div><h1>DEBATE <span>ARENA</span></h1><p>{topic === "Custom topic" ? customTopic : topic}</p></div><div className="top-actions"><button onClick={() => {setVoiceEnabled(!voiceEnabled); if (voiceEnabled) window.speechSynthesis?.cancel();}} className="icon-btn">{voiceEnabled ? <Volume2/> : <VolumeX/>} VOICE</button><button onClick={complete} disabled={busy} className="finish-btn"><Square size={15}/> FINISH</button></div></div>
      <div className="live-grid">
        <section className="terminal-panel">
          <div className="terminal-head"><span>● ● ●</span><span>LOGOS.AI // LIVE CROSS-EXAMINATION</span><span>SESSION #{sessionId}</span></div>
          <div className="transcript">
            {turns.map((t, i) => <div key={i} className={`turn ${t.type}`}><div className="turn-label">{t.speaker}</div><div className="turn-text">{t.text}</div>{t.fallacies?.length > 0 && <div className="fallacy-inline"><ShieldAlert size={15}/><b>{t.fallacies[0].fallacy_type}</b><span>{t.fallacies[0].explanation}</span></div>}</div>)}
            {busy && <div className="thinking"><Brain size={16}/> AGENT IS REASONING...</div>}
          </div>
          <div className="voice-composer"><button className={`mic-button ${listening ? "recording" : ""}`} onClick={startVoice}>{listening ? <MicOff/> : <Mic/>}</button><div><div className="voice-status">{listening ? "LISTENING — SPEAK YOUR ARGUMENT" : "VOICE ARGUMENT / TEXT INPUT"}</div><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey){e.preventDefault();sendArgument();}}} placeholder="Speak or type your argument. Press Enter to transmit."/></div><button className="send-button" onClick={sendArgument} disabled={!input.trim() || busy}><Send/></button></div>
          {error && <div className="error-box">{error}</div>}
        </section>
        <aside className="telemetry">
          <div className="telemetry-card pressure"><span>OPPONENT PRESSURE</span><strong>{analysis?.rebuttal_strength_percent?.toFixed?.(1) || "—"}<small>%</small></strong><div className="meter"><i style={{width: `${Math.min(100, analysis?.rebuttal_strength_percent || 0)}%`}}/></div></div>
          <div className="telemetry-card"><div className="telemetry-title"><ShieldAlert size={16}/> LOGIC AUDIT</div>{analysis?.fallacies_detected_in_user?.length ? <div className="danger">{analysis.fallacies_detected_in_user.length} fallacy flag(s)</div> : <div className="safe">✓ No clear fallacy in last turn</div>}</div>
          <div className="telemetry-card coach"><div className="telemetry-title"><Brain size={16}/> COACHING ASSISTANT</div><p>{analysis?.coaching_tip || "Build a claim, support it with evidence, anticipate the strongest objection, then answer that objection directly."}</p></div>
          {analysis?.finalScore != null && <div className="score-card"><span>FINAL PERFORMANCE</span><strong>{Number(analysis.finalScore).toFixed(1)}%</strong><button onClick={() => router.push("/reports")}><RotateCcw size={15}/> VIEW REPORTS</button></div>}
        </aside>
      </div>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.debate-shell{max-width:1400px;margin:0 auto;padding:42px 28px 80px;font-family:var(--font-body)}
.arena-hero{padding:50px 0 35px;max-width:820px}.arena-title{font-family:var(--font-display);font-size:clamp(4rem,8vw,7.5rem);line-height:.82;letter-spacing:-5px;margin:18px 0}.arena-title span,.live-top h1 span{color:var(--accent-red)}.arena-hero p{font-size:1.05rem;color:var(--text-secondary);max-width:720px}.arena-config{display:grid;grid-template-columns:1.2fr .8fr;gap:22px}.config-card{background:#fff;border:1px solid var(--border-light);padding:30px;box-shadow:0 20px 50px rgba(0,0,0,.04)}.config-card h2{font-family:var(--font-display);font-size:2rem;margin:5px 0 22px}.config-card select,.config-card input{width:100%;padding:15px;border:1px solid #ddd;background:#fff;font:inherit;margin-bottom:22px}.config-kicker{font:700 .72rem var(--font-mono);letter-spacing:1px;color:var(--accent-red);margin-top:10px;margin-bottom:7px}.segmented{display:grid;grid-template-columns:1fr 1fr;margin-bottom:22px}.segmented button{padding:14px;border:1px solid #ddd;background:#fafafa;font:700 .75rem var(--font-mono);cursor:pointer}.segmented .selected{background:#111;color:#fff;border-color:#111}.persona-option{width:100%;text-align:left;border:1px solid #ddd;background:#fff;padding:17px;margin-bottom:10px;cursor:pointer}.persona-option span{display:block;font:800 1.15rem var(--font-display)}.persona-option small{color:#777}.persona-option.active{border:2px solid var(--accent-red);background:#fff7f8}.launch-button{width:100%;padding:17px;background:#111;color:#fff;border:0;font:800 .8rem var(--font-mono);margin-top:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}.launch-button:disabled{opacity:.5}.error-box{margin-top:12px;padding:11px;background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;font-size:.83rem}.live-top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #ddd;padding-bottom:25px;margin-bottom:25px}.live-top h1{font:900 3.5rem var(--font-display);margin:8px 0}.live-top p{color:#777;max-width:750px}.top-actions{display:flex;gap:10px}.icon-btn,.finish-btn{padding:12px 15px;border:1px solid #ddd;background:#fff;font:700 .72rem var(--font-mono);display:flex;gap:8px;align-items:center;cursor:pointer}.finish-btn{background:#d90429;color:#fff;border-color:#d90429}.live-grid{display:grid;grid-template-columns:minmax(0,1.8fr) 360px;gap:22px}.terminal-panel{background:#09090b;color:#fff;border:1px solid #222;min-height:680px;display:flex;flex-direction:column}.terminal-head{padding:12px 16px;border-bottom:1px solid #25252c;color:#888;font:600 .68rem var(--font-mono);display:flex;justify-content:space-between}.transcript{padding:24px;overflow:auto;flex:1;max-height:520px}.turn{margin-bottom:22px}.turn-label{font:700 .7rem var(--font-mono);color:#777;margin-bottom:5px}.turn.user .turn-label{color:#5eead4}.turn.ai .turn-label{color:#f43f5e}.turn.system .turn-label{color:#94a3b8}.turn-text{font-size:.98rem;line-height:1.7;color:#e8e8ea}.fallacy-inline{margin-top:10px;padding:12px;border:1px solid #7f1d1d;background:#250b0d;color:#fecaca;display:flex;gap:8px;align-items:flex-start;font-size:.78rem;flex-wrap:wrap}.fallacy-inline span{color:#ddd;flex-basis:100%;padding-left:23px}.thinking{font:700 .72rem var(--font-mono);color:#888;display:flex;gap:8px;align-items:center}.voice-composer{border-top:1px solid #27272d;display:grid;grid-template-columns:58px 1fr 58px;gap:12px;padding:14px;align-items:center}.mic-button,.send-button{width:52px;height:52px;border-radius:50%;border:1px solid #333;background:#17171b;color:#fff;display:grid;place-items:center;cursor:pointer}.mic-button.recording{background:#d90429;box-shadow:0 0 0 8px rgba(217,4,41,.12);animation:pulse 1.4s infinite}.send-button{background:#d90429;border-color:#d90429}.send-button:disabled{opacity:.35}.voice-status{font:700 .65rem var(--font-mono);color:#888;margin-bottom:5px}.voice-composer textarea{width:100%;background:transparent;color:#fff;border:0;outline:0;resize:none;height:48px;font:inherit}.telemetry{display:flex;flex-direction:column;gap:14px}.telemetry-card,.score-card{background:#fff;border:1px solid #ddd;padding:22px}.telemetry-card>span{font:700 .65rem var(--font-mono);color:#777}.pressure strong{display:block;font:900 3.5rem var(--font-display);color:#d90429;margin:6px 0}.pressure strong small{font-size:1rem}.meter{height:5px;background:#eee}.meter i{display:block;height:100%;background:#d90429}.telemetry-title{font:800 .72rem var(--font-mono);display:flex;gap:8px;align-items:center;margin-bottom:13px}.safe{color:#047857;font-weight:700}.danger{color:#b91c1c;font-weight:800}.coach{background:#111;color:#fff;flex:1}.coach .telemetry-title{color:#f43f5e}.coach p{color:#ccc;line-height:1.65;font-size:.9rem}.score-card{background:#d90429;color:#fff}.score-card span{font:700 .65rem var(--font-mono)}.score-card strong{display:block;font:900 3rem var(--font-display);margin:5px 0 12px}.score-card button{background:#fff;border:0;padding:10px 13px;font:700 .7rem var(--font-mono);display:flex;align-items:center;gap:6px;cursor:pointer}@keyframes pulse{50%{transform:scale(1.05)}}
@media(max-width:900px){.arena-config,.live-grid{grid-template-columns:1fr}.live-top{align-items:flex-start;flex-direction:column;gap:18px}.arena-title{font-size:4rem}.telemetry{display:grid;grid-template-columns:1fr 1fr}.coach,.score-card{grid-column:span 2}.terminal-panel{min-height:600px}}`;
