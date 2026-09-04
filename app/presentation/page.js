"use client";

import { useState } from 'react';

function analyzeSpeech(text, duration) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const fillers = (text.match(/\b(um|uh|like|basically|you know|so)\b/gi) || []);
  const wpm = Math.round(words.length / Math.max(Number(duration) / 60, .1));
  const confidence = Math.max(54, Math.min(98, 92 - fillers.length * 3 + (wpm >= 120 && wpm <= 165 ? 5 : -5)));
  const clarity = Math.max(55, Math.min(98, 90 - fillers.length * 2 - (wpm > 175 ? 10 : 0)));
  return { words:words.length, wpm, fillers, confidence, clarity, engagement:Math.round((confidence + clarity + 84) / 3) };
}

export default function PresentationPage() {
  const [speech, setSpeech] = useState('So, basically, our proposal gives every student access to adaptive feedback. The data shows that immediate practice helps learners correct mistakes earlier. However, teachers remain essential for judgment and encouragement.');
  const [duration, setDuration] = useState(30);
  const [metrics, setMetrics] = useState(null);
  return <div className="page-shell">
    <div className="page-title"><div className="eyebrow">Prosody & speech engine · milestone 04</div><h1 className="display">Own the <span className="red">podium.</span></h1><p>Paste a transcript or bring notes from a recording. Get a fast read on pace, filler words, confidence, clarity, and audience engagement.</p></div>
    <div className="workspace-grid">
      <section className="panel"><div className="panel-title"><h2>Speech input</h2><span className="label muted">Transcript mode</span></div><label htmlFor="speech">Speech transcript</label><textarea id="speech" className="field textarea" rows="13" value={speech} onChange={e => setSpeech(e.target.value)} /><label htmlFor="duration">Duration in seconds</label><input id="duration" type="number" min="1" className="field" value={duration} onChange={e => setDuration(e.target.value)} /><button className="btn btn-red" style={{width:'100%',marginTop:22}} onClick={() => setMetrics(analyzeSpeech(speech,duration))}>Analyze speech metrics ↗</button></section>
      <section>{!metrics ? <div className="panel empty"><div><div className="empty-mark">◌</div><h2>Vocal metrics waiting</h2><p>Run an analysis to surface your delivery profile.</p></div></div> : <div><div className="stat-grid" style={{marginTop:0}}><div className="stat"><span className="label muted">Speech pace</span><strong>{metrics.wpm}<small style={{fontSize:12}}> WPM</small></strong><span className="muted">{metrics.wpm >= 120 && metrics.wpm <= 165 ? '✓ Optimal range' : 'Adjust pace'}</span></div><div className="stat"><span className="label muted">Filler words</span><strong className="red-text">{metrics.fillers.length}</strong><span className="muted">{metrics.fillers.length ? metrics.fillers.join(', ') : 'None detected'}</span></div><div className="stat"><span className="label muted">Confidence</span><strong>{metrics.confidence}%</strong><div className="meter"><i style={{width:`${metrics.confidence}%`}}/></div></div><div className="stat"><span className="label muted">Clarity</span><strong>{metrics.clarity}%</strong><div className="meter"><i style={{width:`${metrics.clarity}%`}}/></div></div></div><div className="panel"><div className="panel-title"><h3>Delivery readout</h3><span className="label muted">Live assessment</span></div><div className="metric-grid"><div className="metric"><div className="metric-top"><span>Audience engagement</span><b>{metrics.engagement}</b></div><div className="meter"><i style={{width:`${metrics.engagement}%`}}/></div><div className="metric"><div className="metric-top"><span>Word economy</span><b>{Math.max(60,100 - metrics.fillers.length * 7)}</b></div><div className="meter"><i style={{width:`${Math.max(60,100 - metrics.fillers.length * 7)}%`}}/></div></div><div className="callout"><b>Coach’s next move</b><br/>{metrics.fillers.length ? `Replace ${metrics.fillers.slice(0,2).join(' and ')} with a deliberate pause. Your pace is most persuasive when the key claim has room to land.` : 'Your filler control is clean. Add a deliberate pause before the central claim to increase emphasis.'}</div></div></div>}</section>
    </div>
  </div>;
}