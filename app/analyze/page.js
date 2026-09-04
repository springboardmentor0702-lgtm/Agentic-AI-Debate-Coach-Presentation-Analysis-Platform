"use client";

import { useState } from 'react';

const fallacyPatterns = [
  { name:'False dilemma', terms:['only two','either...or','must choose','no other option'], correction:'Name the credible middle paths before defending your preferred option.' },
  { name:'Hasty generalization', terms:['everyone','always','never','nobody','all people'], correction:'Scope the claim and add a representative evidence base.' },
  { name:'Ad hominem', terms:['idiot','stupid','they are corrupt','you are biased'], correction:'Address the claim and evidence, not the person presenting it.' },
  { name:'Slippery slope', terms:['will inevitably','then everything','leads to chaos','next thing'], correction:'Show the causal steps and likelihood instead of assuming the worst outcome.' },
];

function scoreArgument(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  const matches = fallacyPatterns.filter(item => item.terms.some(term => lower.includes(term)));
  const hasEvidence = /\b(because|research|study|data|survey|percent|evidence|according)\b/i.test(text);
  const hasCounter = /\b(however|although|while|opponents|counter|trade[- ]off)\b/i.test(text);
  const clarity = Math.min(96, 68 + (words.length > 25 ? 14 : 5) - matches.length * 5);
  const evidence = Math.min(96, hasEvidence ? 88 : 59);
  const logic = Math.min(96, 86 - matches.length * 13 + (hasCounter ? 5 : 0));
  const persuasive = Math.min(96, 72 + (hasEvidence ? 10 : 0) + (hasCounter ? 8 : 0));
  return {
    overall: Math.round((clarity + evidence + logic + persuasive + 80) / 5),
    clarity, relevance: hasCounter ? 91 : 82, evidence, logic, persuasive,
    claims: [`A central position is ${words.length > 12 ? 'clearly' : 'partially'} identifiable in the submission.`, hasEvidence ? 'The argument anchors its position in an evidence signal.' : 'The conclusion needs a concrete source, example, or measurable premise.'],
    reasoning: [hasCounter ? 'The argument anticipates an opposing view rather than ignoring it.' : 'Add an explicit response to the strongest opposing view.', matches.length ? `The reasoning contains a ${matches[0].name} pattern that weakens the conclusion.` : 'The conclusion follows the main premise with reasonable consistency.'],
    fallacies: matches.map(item => ({...item, severity:'Medium', explanation:`The phrasing “${item.terms.find(term => lower.includes(term))}” makes the claim broader or more binary than the supporting reasoning.`})),
  };
}

export default function AnalyzePage() {
  const [topic, setTopic] = useState('Should AI be used in education?');
  const [argument, setArgument] = useState('AI should be used in education because adaptive practice gives students immediate feedback. However, teachers should remain responsible for context, relationships, and final decisions.');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const runAnalysis = () => { if (!argument.trim()) return; setLoading(true); setTimeout(() => { setAnalysis(scoreArgument(argument)); setLoading(false); }, 500); };
  return <div className="page-shell">
    <div className="page-title"><div className="eyebrow">Argument intelligence · milestone 02</div><h1 className="display">Argument <span className="red">analysis.</span></h1><p>Turn a position into a stronger case. LOGOS identifies claims, audits evidence, surfaces logical fallacies, and gives you a next move.</p></div>
    <div className="workspace-grid">
      <section className="panel">
        <div className="panel-title"><h2>Argument input</h2><span className="label muted">Text mode</span></div>
        <label htmlFor="topic">Debate topic</label><input id="topic" className="field" value={topic} onChange={e => setTopic(e.target.value)} />
        <label htmlFor="argument">Your argument</label><textarea id="argument" className="field textarea" rows="12" value={argument} onChange={e => setArgument(e.target.value)} />
        <div className="split" style={{marginTop:18}}><span className="label muted">{argument.trim().split(/\s+/).filter(Boolean).length} words detected</span><span className="label muted" style={{textAlign:'right'}}>Local analysis · instant</span></div>
        <button className="btn btn-red" style={{width:'100%', marginTop:22}} onClick={runAnalysis} disabled={loading}>{loading ? 'Auditing reasoning...' : 'Analyze argument ↗'}</button>
      </section>
      <section className="panel" style={{padding:0}}>
        {!analysis ? <div className="empty"><div><div className="empty-mark">AI</div><h2>Analysis results</h2><p>Submit an argument to see the reasoning audit.</p></div></div> : <div>
          <div className="result-head"><div><div className="eyebrow">Analysis complete</div><h2>{topic || 'Debate argument'}</h2></div><div className="score-ring"><strong>{analysis.overall}</strong><small>/100</small></div></div>
          <div style={{padding:26}}><h3>Reasoning evaluation</h3><div className="metric-grid">{[['Clarity',analysis.clarity],['Relevance',analysis.relevance],['Evidence strength',analysis.evidence],['Logical consistency',analysis.logic],['Persuasiveness',analysis.persuasive]].map(([label,value]) => <div className="metric" key={label}><div className="metric-top"><span>{label}</span><b>{value}</b></div><div className="meter"><i style={{width:`${value}%`}}/></div>)}</div>
            <div style={{marginTop:28}}><h3>Claim & reasoning trace</h3>{[...analysis.claims,...analysis.reasoning].map((item,i) => <div className="finding" key={item}><b>{String(i+1).padStart(2,'0')}</b><p>{item}</p></div>)}</div>
            <div style={{marginTop:28}}><h3>Logical fallacy detection</h3>{analysis.fallacies.length ? analysis.fallacies.map(item => <div className="fallacy-card" key={item.name}><header><span>{item.name}</span><span className="severity">{item.severity}</span></header><p>{item.explanation}</p><div className="notice"><b>Correction:</b> {item.correction}</div></div>) : <div className="notice">✓ No supported fallacy pattern detected in this submission.</div>}</div>
            <div className="callout"><b>Coach’s next move</b><br/>Lead with your evidence, then answer the strongest objection in one sentence before adding a second supporting example.</div>
          </div>
        </div>}
      </section>
    </div>
  </div>;
}