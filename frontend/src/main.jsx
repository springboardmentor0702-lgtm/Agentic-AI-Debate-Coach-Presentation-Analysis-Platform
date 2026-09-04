import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Layout from './components/Layout';
import VoiceInput from './components/VoiceInput';
import {TrendChart,SkillRadar,FallacyChart,Ring} from './components/Charts';
import {api,BASE} from './services/api';
import './styles.css';

const roles=[['learner','Learner'],['coach','Debate Coach'],['educator','Educator'],['admin','Administrator']];
const roleNames={learner:'Learner',coach:'Debate Coach',educator:'Educator',admin:'Administrator'};
const skillKeys=['argument_quality','evidence_usage','logical_consistency','rebuttal_effectiveness','communication_skills'];
const skillLabels={argument_quality:'Argument quality',evidence_usage:'Evidence',logical_consistency:'Logic',rebuttal_effectiveness:'Rebuttal',communication_skills:'Communication'};

function speechAvailable(){
  return typeof window!=='undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}
function getEnglishVoice(synth){
  const voices=synth.getVoices?.()||[];
  return voices.find(v=>/^en(-|_)/i.test(v.lang))||voices.find(v=>/english/i.test(v.name))||voices[0]||null;
}
function cleanForSpeech(text){
  return String(text||'')
    .replace(/```[\s\S]*?```/g,'')
    .replace(/[*_#`]/g,'')
    .replace(/\[(.*?)\]\(.*?\)/g,'$1')
    .replace(/\s+/g,' ')
    .trim();
}
function speak(text,onState){
  if(!speechAvailable()||!cleanForSpeech(text)){
    onState?.('unavailable');
    return false;
  }
  const synth=window.speechSynthesis;
  const value=cleanForSpeech(text);
  synth.cancel();
  const parts=value.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(x=>x.trim()).filter(Boolean)||[value];
  let i=0;
  const run=()=>{
    if(i>=parts.length){onState?.('done');return;}
    const u=new SpeechSynthesisUtterance(parts[i++]);
    u.rate=.96; u.pitch=1; u.volume=1; u.lang='en-US';
    const v=getEnglishVoice(synth); if(v) u.voice=v;
    u.onstart=()=>onState?.('speaking');
    u.onend=run;
    u.onerror=()=>onState?.('error');
    try{synth.speak(u)}catch(e){onState?.('error')}
  };
  run();
  return true;
}
function primeSpeech(onState){
  if(!speechAvailable()){onState?.('unavailable');return false;}
  const synth=window.speechSynthesis;
  synth.cancel();
  const u=new SpeechSynthesisUtterance('AI voice is ready.');
  u.rate=1; u.pitch=1; u.volume=1; u.lang='en-US';
  const v=getEnglishVoice(synth); if(v) u.voice=v;
  u.onstart=()=>onState?.('speaking');
  u.onend=()=>onState?.('ready');
  u.onerror=()=>onState?.('error');
  try{synth.speak(u);return true}catch(e){onState?.('error');return false}
}
function Empty({title='Nothing here yet',text='This area will fill with real data after you use the platform.',action}){return <div className="empty"><b>{title}</b><p>{text}</p>{action}</div>}
function Section({title,sub,children,actions}){return <section className="section"><div className="section-head"><div><h2>{title}</h2>{sub&&<p className="muted">{sub}</p>}</div>{actions}</div>{children}</section>}
function Kpi({title,value,delta}){return <div className="kpi"><span>{title}</span><strong>{value??'—'}</strong>{delta&&<small>{delta}</small>}</div>}
function Card({title,children,actions}){return <div className="card"><div className="card-title"><b>{title}</b>{actions}</div>{children}</div>}
function Action({title,text,onClick,button='Open →'}){return <div className="action-card"><h3>{title}</h3><p>{text}</p><button onClick={onClick}>{button}</button></div>}

function Login({onLogin}){const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[firstName,setFirstName]=useState(''),[lastName,setLastName]=useState(''),[role,setRole]=useState('learner'),[err,setErr]=useState('');
 const submit=async e=>{e.preventDefault();setErr('');try{const name=`${firstName} ${lastName}`.trim();const body=mode==='login'?{email,password}:{email,password,name,role};const r=await api(mode==='login'?'/auth/login':'/auth/register',{method:'POST',body});localStorage.setItem('token',r.access_token);onLogin(r.user)}catch(x){setErr(x.message)}};
 return <div className="login-page"><div className="login-glow"/><section className="login-card"><div className="brand big"><div className="brand-mark">AI</div><div><b>ARGU<span>AI</span></b><small>Real Debate Intelligence</small></div></div><p className="eyebrow">{mode==='login'?'SIGN IN':'CREATE REAL ACCOUNT'}</p><h1>{mode==='login'?'Welcome back.':'Create your account.'}</h1><p className="muted">Your workspace is built from your own activity. New accounts start with no fabricated scores or history.</p><div className="provider-line">GROQ <i>→</i> GEMINI <i>→</i> DEMO MODE</div><form onSubmit={submit}>{mode==='register'&&<div className="name-grid"><input required placeholder="First name" value={firstName} onChange={e=>setFirstName(e.target.value)}/><input required placeholder="Last name" value={lastName} onChange={e=>setLastName(e.target.value)}/></div>}<input required type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><input required minLength="8" type="password" placeholder="Password (8+ characters)" value={password} onChange={e=>setPassword(e.target.value)}/>{mode==='register'&&<><select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(([v,l])=><option key={v} value={v} disabled={v==='admin'}>{l}{v==='admin'?' — provisioned by owner':''}</option>)}</select><p className="form-note">Administrator access is provisioned by the platform owner; it cannot be self-created.</p></>}<button className="primary full">{mode==='login'?'Sign in':'Create account'}</button>{err&&<div className="error">{err}</div>}</form><button className="link-btn" onClick={()=>{setMode(mode==='login'?'register':'login');setErr('')}}>{mode==='login'?'Create a new account':'Already have an account? Sign in'}</button></section></div>}

function LearnerDashboard({user,setPage}){
 const[a,setA]=useState(null);
 const load=()=>api('/analytics').then(setA).catch(()=>{});
 useEffect(()=>{load();const t=setInterval(load,5000);return()=>clearInterval(t)},[]);
 const measured=Object.entries(a?.skills||{}).filter(([,v])=>Number.isFinite(Number(v))).sort((x,y)=>Number(x[1])-Number(y[1]));
 const strongest=measured[measured.length-1],weakest=measured[0];
 const empty=!a||a.overall_score==null;
 const improvement=a?.improvement_rate==null?'Not enough history':`${a.improvement_rate}%`;
 return <><div className="hero dashboard-hero"><div><p className="eyebrow">LEARNER INTELLIGENCE CENTER</p><h1>Welcome, {user.name.split(' ')[0]}.</h1><p className="muted">One evidence-based view of your real learning activity.</p></div><button className="primary" onClick={()=>setPage('Debates')}>Start an AI debate →</button></div>

 <Section title="Performance at a Glance" sub="Real assessment and activity data. No synthetic chart points or invented scores.">
  <div className="grid five">
   <Kpi title="Overall score" value={a?.overall_score==null?'Unavailable':`${a.overall_score}/100`} delta={empty?'Complete a real assessment':'Latest stored assessment'}/>
   <Kpi title="Progress" value={a?`${a.progress.completed_domains}/${a.progress.total_domains}`:'Unavailable'} delta="Learning domains assessed"/>
   <Kpi title="Debates" value={a?.completed_debates??0} delta="Completed AI/live assessments"/>
   <Kpi title="Presentations" value={a?.completed_presentations??0} delta="Analyzed with captured speech"/>
   <Kpi title="Daily streak" value={a?.daily_streak??0} delta="Consecutive learning-activity days"/>
  </div>
  <div className="grid two">
   <Card title="Learner Growth Map"><TrendChart lines={[{label:'Presentation',data:a?.presentation_score_trend||[]},{label:'Argument',data:a?.argument_score_trend||[]},{label:'Counterargument',data:a?.counterargument_score_trend||[]}]}/>{empty&&<p className="muted">Complete assessments to plot real points.</p>}</Card>
   <Card title="Performance at a Glance — interpretation">
    <div className="skill-list">
     <div><span>Strongest measured skill</span><strong>{strongest?`${strongest[0]} · ${strongest[1]}/100`:'Unavailable'}</strong></div>
     <div><span>Skill to improve</span><strong>{weakest?`${weakest[0]} · ${weakest[1]}/100`:'Unavailable'}</strong></div>
     <div><span>Improvement</span><strong>{improvement}</strong></div>
     <div><span>Assessment coverage</span><strong>{a?`${a.progress.percent}%`: 'Unavailable'}</strong></div>
    </div>
    <p className="muted">{a?.progress?.definition||'Assessment coverage across Debate, Presentation and Analysis.'}</p>
   </Card>
  </div>
 </Section>

 <Section title="Skill Development" sub="Separate skill domains, historical evidence and the next practice focus.">
  {empty?<Empty title="Not enough assessments yet" text="Complete real Debate, Presentation or Analysis assessments to build your skill development profile."/>:
   <div className="grid three">
    {Object.entries(a.skill_domains||{}).map(([domain,skills])=><Card key={domain} title={domain[0].toUpperCase()+domain.slice(1)}>
      {Object.entries(skills).length ? (Object.entries(skills).sort((x,y)=>x[1]-y[1]).map(([k,v])=><div className="skill-list" key={k}><div><span>{k}</span><strong>{v}/100</strong></div><div className="bar"><i style={{width:(Math.min(100,Number(v))+'%')}}/></div></div>)) : <p className="muted">No assessments in this domain yet.</p>}
    </Card>)}
   </div>}
  <div className="grid four">
   <Kpi title="Strongest skill" value={a?.strongest_skill||'Unavailable'} delta={strongest?`${strongest[1]}/100`:''}/>
   <Kpi title="Next focus" value={a?.weakest_skill||'Unavailable'} delta="Lowest measured skill"/>
   <Kpi title="Fallacy types" value={Object.keys(a?.fallacy_frequency||{}).length} delta="Actual detected analyses"/>
   <Kpi title="Achievements" value={a?.achievements?.length||0} delta="Earned from milestones"/>
  </div>
 </Section>

 {empty?<Section title="Start building your real profile"><div className="grid three"><Action title="AI Debate Studio" text="Practice a real format with an adaptive AI opponent." onClick={()=>setPage('Debates')}/><Action title="Argument Intelligence" text="Analyze the exact argument you submit." onClick={()=>setPage('Analysis')}/><Action title="Presentation Lab" text="Upload a PPTX and capture your actual speech." onClick={()=>setPage('Presentations')}/></div></Section>:
 <Section title="What to do next"><div className="grid two"><Card title="AI coaching focus"><p className="coach-answer">{a.weakest_skill?`Your current lowest measured skill is ${a.weakest_skill}. Use AI Coaching to turn that evidence into a focused practice session.`:'Complete another assessment for a focused recommendation.'}</p><button className="primary" onClick={()=>setPage('AI Coaching')}>Open AI Coaching →</button></Card><Card title="Recent activity"><div className="timeline">{a.recent_activity?.slice(0,5).map((x,i)=><div key={i}><b>{x.type}</b><span>{x.score!=null?`Score ${x.score}`:'Completed'}</span><small>{new Date(x.date).toLocaleString()}</small></div>)}</div></Card></div></Section>}
 </>;
}

function Debate({setPage,mode='history'}){
 const [topic,setTopic]=useState(''),[format,setFormat]=useState('ai_simulation'),[position,setPosition]=useState('for'),[rounds,setRounds]=useState(3),[id,setId]=useState(null),[messages,setMessages]=useState([]),[turn,setTurn]=useState(''),[busy,setBusy]=useState(false),[score,setScore]=useState(null),[provider,setProvider]=useState(''),[voice,setVoice]=useState(true),[round,setRound]=useState(1),[history,setHistory]=useState([]),[error,setError]=useState('');
 const formatInfo={one_on_one:['One-to-One AI Debate',['Opening position','Challenge & rebuttal','Closing statement']],ai_simulation:['AI Debate Simulation',['Opening argument','Adaptive rebuttal','Closing assessment']],parliamentary:['Parliamentary AI Debate',['Government opening','Opposition challenge','Rebuttal','Closing synthesis']],oxford:['Oxford AI Debate',['Proposition opening','Opposition opening','Rebuttal','Challenge','Closing statements']],policy:['Policy AI Debate',['Constructive case','Cross-examination','Rebuttal','Impact comparison','Closing']],public_forum:['Public Forum AI Debate',['Constructive','Crossfire','Rebuttal','Summary','Final focus']]};
 const loadHistory=()=>api('/debates').then(setHistory).catch(()=>{}); useEffect(()=>{if(mode==='history')loadHistory()},[mode]);
 const start=async()=>{setError('');try{const r=await api('/debates',{method:'POST',body:{topic,format,position,rounds,ai_opponent:true}});setId(r.id);setMessages([]);setScore(null);setProvider('');setRound(1)}catch(e){setError(e.message)}};
 const send=async()=>{if(!turn.trim()||!id)return;setBusy(true);setError('');try{const r=await api(`/debates/${id}/turn`,{method:'POST',body:{text:turn.trim()}});setMessages(r.messages||[]);setProvider(r.provider);const ai=(r.messages||[]).filter(m=>m.role==='assistant').at(-1);if(ai&&voice)speak(ai.text,()=>{});setTurn('');setRound(x=>Math.min(rounds,x+1))}catch(e){setError(e.message)}finally{setBusy(false)}};
 const finish=async()=>{setBusy(true);try{const r=await api(`/debates/${id}/finish`,{method:'POST'});setScore(r.score);setProvider(r.provider);loadHistory()}catch(e){setError(e.message)}finally{setBusy(false)}};
 if(mode==='history'&&!id)return <Section title="Debates" sub="Every listed format is an AI-vs-learner experience. The difference is the rules, roles, sequence and evaluation style—not human participants."><div className="hero"><div><p className="eyebrow">AI DEBATE FORMATS</p><h1>Choose your debate style.</h1><p className="muted">One AI opponent. Different debate mechanics.</p></div><button className="primary" onClick={()=>setId('new')}>Start debate →</button></div><Card title="Debate history">{history.length?<div className="timeline">{history.map(d=><div key={d.id}><b>#{d.id} · {d.topic}</b><span>{formatInfo[d.format]?.[0]||d.format} · {d.status}</span><small>{new Date(d.created_at).toLocaleString()} · {d.rounds} rounds</small></div>)}</div>:<Empty title="No debates yet." text="Your completed AI debates will appear here."/>}</Card></Section>;
 if(id==='new')return <Section title="Configure your AI debate" sub="The AI is always the opponent. Select the format to change the speaking sequence and rules."><div className="studio"><div className="form-grid"><label>Topic<textarea placeholder="Enter any custom motion or use a suggested topic" value={topic} onChange={e=>setTopic(e.target.value)}/></label><label>Format<select value={format} onChange={e=>{const v=e.target.value;setFormat(v);setRounds(formatInfo[v]?.[1].length||3)}}>{Object.entries(formatInfo).map(([v,x])=><option key={v} value={v}>{x[0]}</option>)}</select></label><label>Position<select value={position} onChange={e=>setPosition(e.target.value)}><option value="for">For / Proposition</option><option value="against">Against / Opposition</option></select></label><label>Rounds<input type="number" min="1" max="12" value={rounds} onChange={e=>setRounds(+e.target.value)}/></label></div><div className="format-rules"><b>{formatInfo[format][0]}</b><div>{formatInfo[format][1].map((x,i)=><span key={i}>{i+1}. {x}</span>)}</div></div><button className="primary" disabled={topic.trim().length<5} onClick={start}>Start with AI →</button>{error&&<div className="error">{error}</div>}</div></Section>;
 const stage=formatInfo[format]?.[1][Math.min(round-1,(formatInfo[format]?.[1].length||1)-1)]||'Your turn';
 const weak=score?['argument_quality','evidence_usage','logical_consistency','rebuttal_effectiveness','communication_skills'].filter(k=>Number(score[k])<70).sort((a,b)=>Number(score[a])-Number(score[b])).slice(0,3):[];
 return <Section title="AI Debate Studio" sub={`${formatInfo[format]?.[0]||'AI Debate'} · ${stage}`}><div className="studio"><div className="room-head"><span>{topic} · Stage {round}/{rounds}</span><span className="live-dot">● AI OPPONENT</span></div><div className="format-rules compact"><b>How this format behaves:</b> {formatInfo[format]?.[1].join(' → ')}</div><div className="debate-room">{messages.length===0&&<Empty title="You open." text="Speak or type your argument. The AI will respond according to the selected format."/>}{messages.map((m,i)=><div className={`message ${m.role==='user'?'user':'ai'}`} key={i}><small>{m.role==='user'?'YOU':`AI · ${m.provider||provider||'provider'}`}</small><p>{m.text}</p>{m.role==='assistant'&&<button className="link-btn" onClick={()=>speak(m.text,()=>{})}>🔊 Hear again</button>}</div>)}{busy&&<div className="typing"><span/><span/><span/> AI is thinking…</div>}</div><div className="composer"><textarea placeholder="Speak or type your argument…" value={turn} onChange={e=>setTurn(e.target.value)}/><VoiceInput onText={setTurn}/><button className="secondary" onClick={()=>{setVoice(!voice);if(voice)window.speechSynthesis?.cancel()}}>{voice?'🔊 AI voice on':'🔇 AI voice off'}</button><button className="primary" disabled={busy||!turn.trim()} onClick={send}>{busy?'AI is responding…':'Send argument'}</button></div><div className="right-actions"><button className="secondary" disabled={busy} onClick={finish}>Finish & assess</button><button className="secondary" disabled={busy} onClick={()=>{setId(null);setMessages([]);setScore(null)}}>Exit</button></div>{score&&<div className="score-result"><Ring value={score.overall}/><div className="score-detail"><h3>Evidence-based debate assessment</h3><p className="muted">Scores are derived from your submitted debate contributions. Provider: {provider}.</p>{[['Argument quality','argument_quality'],['Evidence usage','evidence_usage'],['Logical consistency','logical_consistency'],['Rebuttal effectiveness','rebuttal_effectiveness'],['Communication','communication_skills'],['Clarity','clarity'],['Confidence','confidence']].map(([label,k])=><div className="score-line" key={k}><span>{label}</span><b>{score[k]==null?'Unavailable':`${score[k]}/100`}</b><div className="bar"><i style={{width:`${Math.max(0,Math.min(100,Number(score[k])||0))}%`}}/></div></div>)}<div className="coaching-alert"><b>Practice next:</b> {weak.length?weak.map(k=>skillLabels[k]).join(', '):'No core skill is below 70.'}</div><button className="primary" onClick={()=>setPage('AI Coaching')}>Turn this result into AI coaching →</button></div></div>}</div></Section>;
}

function Analysis({kind}){const [text,setText]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false);const labels={argument:['Argument Analysis','How good is this specific argument?'],fallacy:['Fallacy Detection','Does this exact argument contain reasoning errors?'],counter:['Counterarguments','How can this exact argument be challenged?']};const run=async()=>{setBusy(true);try{setResult(await api(kind==='argument'?'/analysis/argument':kind==='fallacy'?'/analysis/fallacies':'/analysis/counterarguments',{method:'POST',body:{text}}))}catch(e){alert(e.message)}finally{setBusy(false)}};return <Section title={labels[kind][0]} sub={labels[kind][1]}><div className="analysis-input"><textarea placeholder="Paste or speak the exact argument you want analyzed…" value={text} onChange={e=>setText(e.target.value)}/><div><VoiceInput onText={setText}/><button className="primary" disabled={busy||text.trim().length<3} onClick={run}>{busy?'Analyzing…':'Analyze actual input'}</button></div></div>{result?<div className="analysis-grid">{kind==='argument'&&<><Card title="Core claims">{(result.claims||[]).map((x,i)=><p key={i}>• {x}</p>)}</Card><Card title="Evidence actually found">{(result.evidence||[]).length?(result.evidence||[]).map((x,i)=><p key={i}>• {x}</p>):<p className="muted">No explicit evidence was found in the submitted text.</p>}</Card><Card title="Reasoning & quality"><p>{result.reasoning}</p><div className="grid three"><Kpi title="Strength" value={result.strength}/><Kpi title="Logic" value={result.logical_consistency}/><Kpi title="Persuasiveness" value={result.persuasiveness}/></div></Card><Card title="What to improve">{(result.problems||[]).map((x,i)=><p key={i}>• {x}</p>)}<p><b>Action:</b> {result.improvement}</p></Card></>}{kind==='fallacy'&&<><Card title="Detected fallacies">{(result.fallacies||[]).length?(result.fallacies||[]).map((f,i)=><div className="fallacy-item" key={i}><b>{f.name}</b><p>{f.explanation}</p><small>{f.why_problematic}</small><p><b>Correction:</b> {f.correction}</p></div>):<Empty title="No supported fallacy detected" text="The submitted text did not trigger one of the supported reasoning-error categories."/>}</Card></>}{kind==='counter'&&<><Card title="AI opposing case"><div className="grid two"><div><b>Logical rebuttal</b><p>{result.logical_rebuttal}</p></div><div><b>Evidence rebuttal</b><p>{result.evidence_rebuttal}</p></div><div><b>Ethical challenge</b><p>{result.ethical_counterargument}</p></div><div><b>Practical challenge</b><p>{result.practical_counterargument}</p></div><div><b>Policy challenge</b><p>{result.policy_counterargument}</p></div><div><b>Alternative perspective</b><p>{result.alternative_perspective}</p></div></div></Card><Card title="Challenge questions">{(result.challenge_questions||[]).map((x,i)=><p key={i}>{i+1}. {x}</p>)}<p><b>Strategy:</b> {result.strategy}</p></Card></>}<small className="source">AI source: {result.source||'provider'}</small></div>:<Empty title="Ready for your input" text="No analysis is generated until you submit actual text."/>}</Section>}

function CaseReview(){const[text,setText]=useState(''),[r,setR]=useState(null),[busy,setBusy]=useState(false);const run=async()=>{setBusy(true);try{setR(await api('/analysis/case-review',{method:'POST',body:{text}}))}catch(e){alert(e.message)}finally{setBusy(false)}};return <Section title="Full Case Review" sub="One complete case-level assessment: overview, arguments, fallacies, counterarguments, evidence and final conclusion."><div className="analysis-input"><textarea placeholder="Paste the complete case, including claims, reasoning and evidence…" value={text} onChange={e=>setText(e.target.value)}/><button className="primary" disabled={busy||text.trim().length<20} onClick={run}>{busy?'Reviewing…':'Review complete case'}</button></div>{r?<div className="analysis-grid"><Card title="Case overview"><p><b>Title:</b> {r.case_overview?.title}</p><p><b>Topic:</b> {r.case_overview?.topic}</p><p><b>Main issue:</b> {r.case_overview?.main_issue}</p><p><b>Context:</b> {r.case_overview?.context}</p></Card><Card title="Arguments">{(r.arguments||[]).map((x,i)=><div key={i}><b>{x.claim}</b><p>{x.reasoning}</p><small>Evidence: {x.evidence||'Not identified'}</small></div>)}</Card><Card title="Fallacies">{(r.fallacies||[]).length?(r.fallacies||[]).map((x,i)=><p key={i}><b>{x.name}</b> — {x.location}: {x.explanation}</p>):<p>No fallacies were identified from the supplied case.</p>}</Card><Card title="Counterarguments">{(r.counterarguments||[]).map((x,i)=><div key={i}><b>Opposing argument:</b> {x.argument}<p><b>Response:</b> {x.response}</p></div>)}</Card><Card title="Evidence review"><p><b>Provided:</b> {r.evidence_review?.provided}</p><p><b>Gaps:</b> {r.evidence_review?.gaps}</p><p><b>Additional:</b> {r.evidence_review?.additional_evidence}</p></Card><Card title="Overall case assessment"><div className="grid five">{Object.entries(r.overall_case_assessment||{}).map(([k,v])=><Kpi key={k} title={k.replaceAll('_',' ')} value={v}/>)}</div></Card><Card title="AI conclusion"><p><b>Strengths:</b> {(r.ai_conclusion?.strengths||[]).join(' ')}</p><p><b>Weaknesses:</b> {(r.ai_conclusion?.weaknesses||[]).join(' ')}</p><p><b>Improvements:</b> {(r.ai_conclusion?.improvements||[]).join(' ')}</p></Card><small className="source">AI source: {r.source}</small></div>:<Empty title="Ready for a complete case" text="This module is intentionally broader than Argument Analysis, Fallacy Detection and Counterarguments."/>}</Section>}

function Presentations(){
 const[file,setFile]=useState(null),[data,setData]=useState(null),[analysis,setAnalysis]=useState(null),[speeches,setSpeeches]=useState({}),[slide,setSlide]=useState(1),[speechText,setSpeechText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[voiceLevel,setVoiceLevel]=useState(0),[audioMetrics,setAudioMetrics]=useState({});

 const upload=async()=>{
  if(!file)return;
  const fd=new FormData();fd.append('file',file);setBusy(true);setError('');
  try{const r=await api('/presentations/upload',{method:'POST',body:fd});setData(r);setSlide(1);setSpeechText('');setSpeeches({});setAudioMetrics({});setAnalysis(null)}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const save=()=>{
  const next={...speeches,[slide]:speechText.trim()};
  setSpeeches(next);
  if(slide<data.slide_count){setSlide(slide+1);setSpeechText(next[slide+1]||'')}
 };
 const analyze=async()=>{
  if(!data)return;
  const finalSpeeches={...speeches,[slide]:speechText.trim()};
  setSpeeches(finalSpeeches);setBusy(true);setError('');
  try{const r=await api(`/presentations/${data.id}/analyze`,{method:'POST',body:{speeches:finalSpeeches,audio_metrics:audioMetrics}});setAnalysis(r)}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };

 if(analysis)return <Section title="Presentation Intelligence" sub="Slide quality is assessed separately from your actual spoken performance.">
  <div className="notice">{analysis?.audio_available ? "Microphone recording detected. Spoken performance is measured from captured speech and microphone signals." : "No microphone recording was provided. Slide content is assessed, clarity is shown as a text-clarity estimate, and spoken confidence, communication and delivery remain unavailable."}</div>
  <div className="grid two">{analysis.slides.map(s=><Card key={s.slide_number} title={`Slide ${s.slide_number} · Content ${s.content_quality}/100`}>
   <p><b>Slide content:</b> {s.text||'No text extracted.'}</p>
   <p><b>What you actually said:</b> {s.what_you_said||'Not captured — not assumed.'}</p>
   <p><b>What went well:</b> {s.strengths?.join(' ')||'—'}</p>
   <p><b>What needs work:</b> {s.weaknesses?.join(' ')||'—'}</p>
   <p><b>How to improve:</b> {s.suggestions?.join(' ')||'—'}</p>
   <p><b>Delivery:</b> {s.delivery_quality==null?'Unavailable — insufficient speech captured':`${s.delivery_quality}/100`}</p><div className="audio-evidence"><b>Observed microphone signals</b><small>Browser-level acoustic measurements; not a professional voice-confidence judgment.</small><p>Duration: {s.audio_metrics?.duration_seconds!=null?`${s.audio_metrics.duration_seconds}s`:'Unavailable'} · Active speech: {s.audio_metrics?.active_seconds!=null?`${s.audio_metrics.active_seconds}s`:'Unavailable'} · Pauses: {s.audio_metrics?.pause_count??'Unavailable'} · Volume variation: {s.audio_metrics?.volume_variation!=null?s.audio_metrics.volume_variation:'Unavailable'} · Pitch range: {s.audio_metrics?.pitch_hz_range?`${s.audio_metrics.pitch_hz_range.min}–${s.audio_metrics.pitch_hz_range.max} Hz`:'Unavailable'}</p></div>
   <div className="grid three">
    <Kpi title="Confidence" value={s.confidence_estimate==null?'Unavailable':`${s.confidence_estimate}/100`} delta={s.confidence_estimate==null?'No reliable speech signal':'Transcript-derived estimate'}/>
    <Kpi title="Clarity" value={s.clarity==null?'Unavailable':`${s.clarity}/100`} delta={s.clarity==null?'No reliable speech signal':'Transcript-derived estimate'}/>
    <Kpi title="Communication" value={s.delivery_quality==null?'Unavailable':`${s.delivery_quality}/100`} delta={s.delivery_quality==null?'No reliable speech signal':'Derived from captured speech'}/>
   </div>
  </Card>)}</div>
  <div className="grid two">
   <Card title={analysis.overall_score==null?'Presentation performance unavailable':`Presentation performance · ${analysis.overall_score}/100`}>
    {analysis.overall_score==null?<Empty title="Insufficient speech for meaningful presentation analysis." text="The PPTX was analyzed for slide content, but no slide contained enough captured speech to score delivery performance."/>:<Ring value={analysis.overall_score}/>}
    <p><b>Slide content quality:</b> {analysis.content_quality==null?'Unavailable':`${analysis.content_quality}/100`}</p>
    <p><b>{analysis.audio_available ? "Delivery" : "Assessment type"}:</b> {analysis.audio_available ? (analysis.delivery==null?"Unavailable":`${analysis.delivery}/100`) : "Content-only ? no microphone recording"}</p>
    <div className="grid three">
     <Kpi title="Confidence" value={analysis.confidence==null?'Unavailable':`${analysis.confidence}/100`} delta={analysis.confidence==null?'Insufficient speech':'Transcript-derived estimate'}/>
     <Kpi title="Clarity" value={analysis.audio_available ? (analysis.clarity==null?"Unavailable":`${analysis.clarity}/100`) : (analysis.text_clarity==null?"Unavailable":`${analysis.text_clarity}/100`)} delta={analysis.audio_available ? "Spoken clarity from captured speech" : "Text clarity estimate ? no audio"} />
     <Kpi title="Communication" value={analysis.audio_available && analysis.delivery!=null?`${analysis.delivery}/100`:"Unavailable"} delta={analysis.audio_available ? "Derived from captured speech" : "Record your presentation to measure this"} />
    </div>
   </Card>
   <Card title="Recommended coaching">{analysis.top_recommendations?.map((x,i)=><p key={i}>• {x}</p>)}</Card>
  </div>
  <button className="secondary" onClick={()=>{setAnalysis(null);setData(null);setFile(null);setSpeeches({});setSpeechText('');setSlide(1)}}>Analyze another presentation</button>
 </Section>;

 const current=data?.slides?.[slide-1];
 return <Section title="Presentation Intelligence" sub="Upload your actual PPTX, capture each slide's real speech, then analyze.">
  <div className="upload-zone"><input type="file" accept=".pptx" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="primary" onClick={upload} disabled={!file||busy}>{busy?'Uploading…':'Upload PPTX'}</button>{error&&<div className="error">{error}</div>}</div>
  {data&&current&&<><div className="notice">Slide {slide} of {data.slide_count}. Only the text in the speech box is treated as your spoken transcript.</div>
   <Card title={current.title||`Slide ${slide}`}>
    <p className="slide-source"><b>Uploaded slide content:</b><br/>{current.text||'No extractable text.'}</p>
    <textarea className="wide-input" value={speechText} onChange={e=>setSpeechText(e.target.value)} placeholder="What did you actually say while presenting this slide? Leave blank if you did not capture it."/>
    <div className="voice-meter-wrap"><div className="voice-meter" style={{'--level':voiceLevel}}><span/></div><small>{voiceLevel>0.08?'Live voice signal':'Ready to capture voice'}</small></div>
    <div className="right-actions"><VoiceInput onText={v=>setSpeechText(v)} onLevel={setVoiceLevel} onMetrics={m=>setAudioMetrics(x=>({...x,[slide]:m}))}/><button className="secondary" onClick={save}>{slide<data.slide_count?'Save & next':'Save final slide'}</button></div>
   </Card>
   <div className="right-actions"><button className="primary" disabled={busy} onClick={analyze}>{busy?'Analyzing…':'Analyze presentation'}</button></div>
  </>}
 </Section>;
}

function LearnerAnalytics({page,setPage}){
 const[a,setA]=useState(null);
 useEffect(()=>{api('/analytics').then(setA).catch(()=>{})},[]);
 if(!a)return <Section title={page} sub="Loading your real activity…"><Empty title="Loading"/></Section>;
 const isPerf=page==='Performance',isSkill=page==='Skill Development';
 const title=isPerf?'Performance':isSkill?'Skill Development':'Analytics';
 const domainEntries=Object.entries(a.skill_domains||{});
 const allSkills=Object.entries(a.skills||{}).sort((x,y)=>Number(x[1])-Number(y[1]));
 return <Section title={title} sub={isPerf?'Transparent performance history from actual assessments.':isSkill?'Historical skill evidence and targeted practice.':'Deeper breakdown of assessment types, fallacies and activity.'}>
  <div className="grid four">
   <Kpi title="Overall" value={a.overall_score==null?'Unavailable':`${a.overall_score}/100`}/>
   <Kpi title="Progress" value={`${a.progress?.completed_domains||0}/${a.progress?.total_domains||3}`} delta="Domains assessed"/>
   <Kpi title="Daily streak" value={a.daily_streak??0} delta="Actual learning activity"/>
   <Kpi title="Improvement" value={a.improvement_rate==null?'Not enough history':`${a.improvement_rate}%`} delta="Requires 2+ comparable assessments"/>
  </div>

  {isPerf&&<><div className="grid two">
   <Card title="Performance history"><TrendChart lines={[{label:'Presentation',data:a.presentation_score_trend||[]},{label:'Argument',data:a.argument_score_trend||[]},{label:'Counterargument',data:a.counterargument_score_trend||[]}]}/><p className="muted">Only stored assessment records are plotted. Missing domains remain empty.</p></Card>
   <Card title="Domain improvement"><div className="skill-list">{Object.entries(a.improvement_by_domain||{}).map(([k,v])=><div key={k}><div><span>{k}</span><strong>{v==null?'Not enough history':`${v}%`}</strong></div><small>{v==null?'Complete at least two assessments in this domain.':'Change from first to latest assessment in this domain.'}</small></div>)}</div></Card>
  </div><Card title="Recent results"><div className="timeline">{a.recent_activity?.map((x,i)=><div key={i}><b>{x.type}</b><span>{x.score==null?'Activity':`Score ${x.score}`}</span><small>{new Date(x.date).toLocaleString()}</small></div>)}</div></Card></>}

  {isSkill&&<><div className="grid three">{domainEntries.map(([domain,skills])=><Card key={domain} title={domain[0].toUpperCase()+domain.slice(1)}>{Object.entries(skills).sort((x,y)=>x[1]-y[1]).map(([k,v])=><div className="skill-list" key={k}><div><span>{k}</span><strong>{v}/100</strong></div><div className="bar"><i style={{width:(Math.min(100,Number(v))+'%')}}/></div></div>)}</Card>)}</div><div className="grid two"><Card title="Weakest measured skills">{allSkills.slice(0,3).map(([k,v])=><p key={k}><b>{k}</b> · {v}/100 — targeted practice recommended.</p>)}</Card><Card title="Strongest measured skills">{allSkills.slice(-3).reverse().map(([k,v])=><p key={k}><b>{k}</b> · {v}/100 — keep strengthening this skill.</p>)}</Card></div><Card title="Skill trajectories" sub="Only actual assessment observations are shown; no interpolated or invented points."><div className="trajectory-grid">{Object.entries(a.skill_trajectories||{}).flatMap(([domain,skills])=>Object.entries(skills).map(([skill,points])=>({domain,skill,points}))).filter(x=>x.points.length).map(x=>{const first=x.points[0].score,last=x.points.at(-1).score,delta=last-first;return <div className="trajectory" key={`${x.domain}-${x.skill}`}><div><b>{x.skill}</b><span>{x.domain}</span></div><strong>{x.points.map(p=>p.score).join(' → ')}</strong><em>{delta===0?'→ 0':`${delta>0?'↑':'↓'} ${Math.abs(delta).toFixed(1)}`}</em><small>{x.points.length} actual observation{x.points.length===1?'':'s'}</small></div>})}</div></Card></>}

  {!isPerf&&!isSkill&&<div className="grid two">
   <Card title="Performance over time"><TrendChart lines={[{label:'Presentation',data:a.presentation_score_trend||[]},{label:'Argument',data:a.argument_score_trend||[]},{label:'Counterargument',data:a.counterargument_score_trend||[]}]}/></Card>
   <Card title="Skill profile"><SkillRadar skills={a.skills}/></Card>
   <Card title="Fallacy frequency"><FallacyChart data={a.fallacy_frequency}/></Card>
   <Card title="Assessment distribution"><p>Debates: <b>{a.completed_debates}</b></p><p>Presentations: <b>{a.completed_presentations}</b></p><p>Argument analyses: <b>{a.argument_score_trend?.length||0}</b></p><p>Counterarguments: <b>{a.counterargument_score_trend?.length||0}</b></p></Card>
  </div>}
 </Section>
}

function FriendsPage(){const[q,setQ]=useState(''),[users,setUsers]=useState([]),[requests,setRequests]=useState([]),[friends,setFriends]=useState([]);const load=async()=>{try{setRequests(await api('/friends/requests'));setFriends(await api('/friends'))}catch{}};useEffect(()=>{load()},[]);const search=async()=>setUsers(await api('/friends/search?q='+encodeURIComponent(q)));return <Section title="Friends" sub="Build your debate network. Friend requests are stored and authorized server-side."><div className="search-row"><input placeholder="Search a real user" value={q} onChange={e=>setQ(e.target.value)}/><button className="primary" onClick={search}>Search</button></div>{users.length>0&&<div className="grid three">{users.map(u=><Action key={u.id} title={u.name} text={`${u.email} · ${roleNames[u.role]||u.role}`} button="Send friend request" onClick={async()=>{try{await api('/friends/request',{method:'POST',body:{user_id:u.id}});load();alert(`Request sent to ${u.name}.`)}catch(e){alert(e.message)}}}/>)}</div>}<div className="grid two"><Card title="Incoming requests">{requests.length?requests.map(r=><div className="friend-row" key={r.id}><span><b>{r.from.name}</b><small>{r.from.email}</small></span><button className="secondary" onClick={async()=>{await api(`/friends/${r.id}/accept`,{method:'POST'});load()}}>Accept</button></div>):<Empty title="No pending requests." text="New friend requests will appear here."/>}</Card><Card title="Your friends">{friends.length?friends.map(f=><div className="friend-row" key={f.id}><span><b>{f.name}</b><small>{f.email}</small></span><span className="status-chip">Connected</span></div>):<Empty title="No friends yet." text="Search for a real user and send a friend request."/>}</Card></div></Section>}

function LiveArena({user}){
 const[q,setQ]=useState(''),[position,setPosition]=useState('for'),[rounds,setRounds]=useState(3),
 [friends,setFriends]=useState([]),[selected,setSelected]=useState(null),[room,setRoom]=useState(''),
 [debateId,setDebateId]=useState(null),[socket,setSocket]=useState(null),[events,setEvents]=useState([]),
 [out,setOut]=useState(''),[msg,setMsg]=useState(''),[invites,setInvites]=useState([]),[busy,setBusy]=useState(false),
 [error,setError]=useState(''),[result,setResult]=useState(null);

 const load=()=>Promise.all([api('/friends'),api('/invitations')]).then(([f,i])=>{
  setFriends(f);setInvites(i.filter(x=>x.status==='pending'))
 }).catch(()=>{});
 useEffect(()=>{load();const t=setInterval(load,4000);return()=>{clearInterval(t);socket?.close()}},[]);

 const start=async()=>{
  if(!selected)return;setBusy(true);setError('');setResult(null);setEvents([]);
  try{
   const d=await api('/debates',{method:'POST',body:{topic:q.trim(),format:'human_live',position,rounds,ai_opponent:false}});
   await api('/invitations',{method:'POST',body:{debate_id:d.id,recipient_id:selected.id}});
   setDebateId(d.id);setRoom(d.join_code);setMsg(`Invitation sent to ${selected.name}. You are ${position==='for'?'FOR':'AGAINST'}.`);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 };

 const respond=async(inv,action)=>{
  setError('');
  try{
   const r=await api(`/invitations/${inv.id}/${action}`,{method:'POST'});
   if(action==='accept'){
    setDebateId(r.debate_id);setRoom(r.join_code||'');setPosition(inv.position||'against');
    setMsg(`Invitation accepted. You are ${inv.position==='for'?'FOR':'AGAINST'}.`);
   }
   load();
  }catch(e){setError(e.message)}
 };

 const connect=async()=>{
  if(!room)return;setError('');setEvents([]);
  try{
   const token=localStorage.getItem('token');
   const wsBase=`${location.protocol==='https:'?'wss':'ws'}://${location.host}`;
   const ws=new WebSocket(`${wsBase}/ws/debates/${room}?token=${encodeURIComponent(token)}`);
   ws.onmessage=async e=>setEvents(x=>[...x,JSON.parse(e.data)]);
   ws.onopen=async()=>{
    setMsg('Connected — the live debate is active.');
    if(debateId){try{
      const history=await api(`/debates/${debateId}/messages`);
      setEvents(history.map(m=>({type:'debate_message',user_id:m.user_id,name:m.name,position:m.position,round_number:m.round_number,phase:m.phase,payload:{text:m.text},created_at:m.created_at})));
    }catch{}}
   };
   ws.onerror=()=>setError('Could not connect to this room. Check the code and make sure the invitation was accepted.');
   setSocket(ws);
  }catch(e){setError(e.message)}
 };

 const send=()=>{
  if(socket?.readyState===1&&out.trim()){socket.send(JSON.stringify({text:out.trim()}));setOut('')}
 };

 const messageEvents=events.filter(e=>e.type==='debate_message');
 const latestEvent=messageEvents.at(-1);
 const stateEvent=events.filter(e=>e.type==='room_state').at(-1);
 const currentStage=latestEvent?.next_phase||stateEvent?.phase||latestEvent?.phase||'opening';
 const currentRound=latestEvent?.next_round_number||stateEvent?.round_number||latestEvent?.round_number||1;
 const turnOwner=latestEvent?.next_turn_owner_user_id??stateEvent?.turn_owner_user_id;

 const endDebate=async()=>{
  if(!debateId)return;
  setBusy(true);setError('');
  try{
   socket?.close();
   const r=await api(`/debates/${debateId}/referee`,{method:'POST'});
   setResult(r);setMsg('Debate ended. The transcript was sent to the AI judge and the room is now closed.');
  }catch(e){setError(e.message)}finally{setBusy(false)}
 };

 return <Section title="Live Arena" sub="Human vs human. Choose a side, debate live, then end the room for transcript-based judging.">
  <div className="grid two">
   <Card title="Create a live debate">
    <textarea className="wide-input" placeholder="Enter the debate motion" value={q} onChange={e=>setQ(e.target.value)}/>
    <p><b>Are you FOR or AGAINST?</b></p>
    <div className="form-grid">
     <label>Your position<select value={position} onChange={e=>setPosition(e.target.value)}><option value="for">FOR / Proposition</option><option value="against">AGAINST / Opposition</option></select></label>
     <label>Rounds<input type="number" min="1" max="12" value={rounds} onChange={e=>setRounds(Math.max(1,Math.min(12,+e.target.value||1)))}/></label>
    </div>
    <p className="muted">Your invited friend automatically receives the opposite position.</p>
    <div className="friend-picker">{friends.length?friends.map(f=><button key={f.id} className={selected?.id===f.id?'selected':''} onClick={()=>setSelected(f)}>{f.name}</button>):<Empty title="No accepted friends yet." text="Go to Friends and connect with another learner first."/>}</div>
    <button className="primary" disabled={!selected||q.trim().length<5||busy} onClick={start}>{busy?'Creating room…':'Create & invite →'}</button>
   </Card>
   <Card title="Join a live debate">
    <input className="wide-input" style={{minHeight:0}} placeholder="Enter room code" value={room} onChange={e=>setRoom(e.target.value.toUpperCase().trim())}/>
    <button className="secondary" onClick={connect} disabled={!room||busy}>Join live room</button>
    {msg&&<p className="success">{msg}</p>}{error&&<div className="error">{error}</div>}
   </Card>
  </div>

  <Card title="Pending invitations">{invites.length?invites.map(i=><div className="owner-row" key={i.id}>
   <span><b>{i.sender.name}</b><small>{i.sender.email} · Debate #{i.debate_id} · You are {i.position==='for'?'FOR':'AGAINST'}</small></span>
   <span><button className="primary" onClick={()=>respond(i,'accept')}>Accept</button> <button className="secondary" onClick={()=>respond(i,'decline')}>Decline</button></span>
  </div>):<Empty title="No pending live invitations." text="New invitations from accepted friends will appear here."/>}</Card>

  <Card title={`Live Arena${room?` · ${room}`:''}`}>
   <div className="arena-status"><span className="status-chip">YOU: {position==='for'?'FOR':'AGAINST'}</span><span className="status-chip">HUMAN OPPONENT</span><span className="status-chip">ROUND {currentRound}/{rounds}</span><span className="status-chip">{currentStage.replace('_',' ').toUpperCase()}</span><span className={turnOwner===user.id?'status-chip turn-you':'status-chip turn-other'}>{turnOwner===user.id?'YOUR TURN':turnOwner?'OPPONENT TURN':'TURN AFTER JOIN'}</span></div>
   <div className="debate-room">{events.length?events.filter(e=>e.type==='debate_message'||e.type==='presence').map((e,i)=>{
     const name=e.name||(e.user_id===user.id?'You':e.user_id?`Participant ${e.user_id}`:'System');
     const pos=e.position?String(e.position).toUpperCase():'';
     return <div className={`live-message ${e.user_id===user.id?'live-you':'live-opponent'}`} key={i}><div className="live-message-head"><b>{name}</b><span>{pos?`${pos} · `:''}{e.phase?e.phase.replace('_',' '):e.type==='presence'?'presence':'live'}</span></div><p>{e.payload?.text||e.message}</p></div>
   }):<Empty title="No live messages yet." text="Join the room and start the debate."/>}</div>
   {socket?.readyState===1&&<div className="composer"><textarea placeholder="Make your argument…" value={out} onChange={e=>setOut(e.target.value)}/><VoiceInput onText={setOut}/><button className="primary" disabled={!out.trim()} onClick={send}>Send</button></div>}
   {debateId&&<div className="right-actions"><button className="secondary danger-action" disabled={busy||!events.some(e=>e.type==='debate_message')} onClick={endDebate}>{busy?'Assessing debate…':'End Debate & see full results'}</button></div>}
  </Card>

  {result&&<Card title="Live Debate Performance">
   <div className="winner-banner"><b>{result.winner_user_id===user.id?'You performed stronger':'Your opponent performed stronger'}</b><span>{result.explanation}</span></div>
   <div className="grid two">{(result.participants||[]).map(x=><div className="performance-card" key={x.user_id}>
    <h3>{x.name||'Participant'} — {(x.position||'').toUpperCase()} {x.user_id===result.winner_user_id&&<span className="status-chip">WINNER</span>}</h3>
    <div className="big-score">{x.overall}/100</div>
    {[['Argument quality','argument_quality'],['Evidence','evidence_usage'],['Logic','logical_consistency'],['Rebuttal','rebuttal_effectiveness'],['Communication','communication_skills']].map(([l,k])=><div className="score-line" key={k}><span>{l}</span><b>{x[k]}</b><div className="bar"><i style={{width:(Math.min(100,Number(x[k])||0)+'%')}}/></div></div>)}
    <p><b>Strengths:</b> {(x.strengths||[]).join(' ')||'Not stated.'}</p><p><b>Needs work:</b> {(x.weaknesses||[]).join(' ')||'Not stated.'}</p><p><b>Evidence from transcript:</b> {(x.evidence_examples||[]).join(' ')||'No explicit evidence example was identified.'}</p><p><b>Rebuttal evidence:</b> {(x.rebuttal_examples||[]).join(' ')||'No explicit rebuttal example was identified.'}</p>
   </div>)}</div>
  </Card>}
 </Section>;
}

function Coaching({page}){
 const[q,setQ]=useState(''),[r,setR]=useState(null),[plan,setPlan]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const loadPlan=()=>api('/coaching/plan').then(x=>setPlan(x.days?.length?x:null)).catch(()=>{});
 useEffect(()=>{loadPlan()},[]);
 const ask=async()=>{setBusy(true);setError('');try{setR(await api('/coaching',{method:'POST',body:{question:q}}))}catch(e){setError(e.message)}finally{setBusy(false)}};
 const generate=async()=>{setBusy(true);setError('');try{setPlan(await api('/coaching/plan',{method:'POST'}))}catch(e){setError(e.message)}finally{setBusy(false)}};
 const toggle=async(day)=>{if(!plan)return;try{const updated=await api(`/coaching/plan/${plan.id}/day/${day}`,{method:'PATCH'});setPlan(updated)}catch(e){setError(e.message)}};
 return <Section title={page==='Learning Plan'?'Learning Plan':'AI Coaching'} sub={page==='Learning Plan'?'A 7-day plan generated from your actual weakest measured skills.':'Personalized coaching grounded in stored assessments and recent learning activity.'}>
  {page!=='Learning Plan'&&<><div className="analysis-input"><textarea placeholder="Ask: What am I lagging in? What should I practice next?" value={q} onChange={e=>setQ(e.target.value)}/><button className="primary" disabled={busy||!q.trim()} onClick={ask}>{busy?'Thinking?':'Ask coach'}</button></div>{r&&<Card title={`Coach ? ${r.provider==='groq'?'Generated by Groq':r.provider==='gemini'?'Generated by Gemini':'Demo Mode'}`}><p className="coach-answer">{r.answer||r.response}</p>{r.focus_skill&&<p><b>Focus:</b> {r.focus_skill}</p>}{r.reason&&<p><b>Why:</b> {r.reason}</p>}{r.evidence&&<p><b>Evidence:</b> {r.evidence}</p>}{r.next_steps?.map((x,i)=><p key={i}>? {x}</p>)}</Card>}</>}
  {error&&<div className="error">{error}</div>}
  <div className="plan-head"><h3>{plan?.title||"Adaptive learning plan"}</h3><button className="secondary" disabled={busy} onClick={generate}>{plan?'Regenerate from latest data':'Generate from my data'}</button></div>
  {plan&&<p className="muted"><b>Plan status:</b> {plan.status==='active'?'Active':'Completed'} ? Based on your latest measured assessment.</p>}
  {plan?<><p className="muted">Based on the learner's measured weaknesses. Complete each real activity, then regenerate after new assessments.</p><div className="timeline">{plan.days.map(d=><div key={d.day} className={d.completed?'completed':''}><b>Day {d.day}</b><span>{d.activity} ? Focus: {d.focus}</span><small>{d.duration_minutes} min ? {d.reason}</small><button className={d.completed?'secondary':'primary'} onClick={()=>toggle(d.day)}>{d.completed?'Completed ?':'Mark complete'}</button></div>)}</div></>:<Empty title="No adaptive plan yet." text="Generate one after your first real assessment. It will use your lowest measured skills."/>}
 </Section>;
}

function CoachCoaching(){
 const[learners,setLearners]=useState([]),[selected,setSelected]=useState(''),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);

 const loadLearners=async()=>{try{const list=await api('/coach/students');setLearners(list||[]);const remembered=localStorage.getItem('arguai-coach-learner');if(remembered&&(list||[]).some(x=>String(x.id)===String(remembered))){localStorage.removeItem('arguai-coach-learner');await selectLearner(Number(remembered))}}catch(e){setError(e.message)}};
 useEffect(()=>{loadLearners()},[]);

 const selectLearner=async(id)=>{
   setSelected(String(id));
   setData(null);
   setPlan(null);
   setSaved(false);
   if(!id)return;
   setBusy(true);
   setError('');
   try{
     setData(await api(`/coach/coaching/${id}`));
   }catch(e){
     setError(e.message);
   }finally{
     setBusy(false);
   }
 };

 const[plan,setPlan]=useState(null);

 const createPlan=async()=>{
   if(!data?.learner?.id)return;
   setBusy(true);
   setError('');
   setSaved(false);
   try{
     const result=await api('/coach/coaching/plan',{
       method:'POST',
       body:{
         learner_id:data.learner.id,
         title:`${data.learner.name}'s Coach Improvement Plan`
       }
     });
     setPlan(result);
     setSaved(true);
     setData(await api(`/coach/coaching/${data.learner.id}`));
   }catch(e){
     setError(e.message);
   }finally{
     setBusy(false);
   }
 };

 const refresh=async()=>{
   if(selected)await selectLearner(Number(selected));
 };

 return <Section title="Coach Coaching" sub="Review assigned learners using their real assessment evidence and create targeted coaching plans.">
   <Card title="Select an assigned learner">
     <select value={selected} onChange={e=>selectLearner(e.target.value)}>
       <option value="">Choose a learner</option>
       {learners.map(x=><option key={x.id} value={x.id}>{x.name} ? {x.email}</option>)}
     </select>
   </Card>

   {error&&<div className="error">{error}</div>}
   {busy&&<div className="notice">Loading real learner evidence?</div>}

   {!selected&&!busy&&
     <Empty title="Select an assigned learner" text="Choose a learner above to review their assessments, measured skill gaps, and coaching plan."/>
   }

   {data&&!busy&&<div className="grid two">
     <Card title={`${data.learner.name} ? Evidence`}>
       <div className="grid three">
         <Kpi title="Assessments" value={data.assessment_count}/>
         <Kpi title="Latest score" value={data.latest_score==null?'Unavailable':`${data.latest_score}/100`}/>
         <Kpi title="Skill gaps" value={data.gaps?.length??0}/>
       </div>

       <h3>Measured skill gaps</h3>
       {data.gaps?.length?
         data.gaps.map((g,i)=><div className="owner-row" key={i}>
           <span><b>{g.skill}</b><small>{g.recommendation}</small></span>
           <span>{g.score}/100</span>
         </div>)
         :
         <Empty title="No measured gaps" text={data.assessment_count?"The latest assessment does not show a skill below the current coaching threshold.":"No real assessment exists yet."}/>
       }
     </Card>

     <Card title="Assessment history">
       {data.history?.length?
         <div className="timeline">
           {data.history.map((s,i)=><div key={s.id}>
             <b>{i===0?'Latest assessment':'Assessment'}</b>
             <span>{s.overall}/100 ? {s.source}</span>
             <small>{new Date(s.created_at).toLocaleString()}</small>
           </div>)}
         </div>
         :
         <Empty title="No assessment history" text="The learner must complete a real assessment before a coaching plan can be generated."/>
       }
     </Card>

     <Card title="Coach plan">
       {plan?
         <><p><b>{plan.title}</b></p><p className="muted">Created from the learner's measured weaknesses.</p><div className="timeline">{plan.days?.map(d=><div key={d.day}><b>Day {d.day}</b><span>{d.activity} ? Focus: {d.focus}</span><small>{d.duration_minutes} min ? Baseline {d.score_baseline}/100</small></div>)}</div></>
         :
         data.plan?
         <><p><b>{data.plan.title}</b></p><p className="muted">An active coaching plan already exists for this learner.</p><div className="timeline">{data.plan.days?.map(d=><div key={d.day} className={d.completed?'completed':''}><b>Day {d.day}</b><span>{d.activity} ? Focus: {d.focus}</span><small>{d.duration_minutes} min ? Baseline {d.score_baseline??'?'}/100</small></div>)}</div></>
         :
         <Empty title="No coach plan yet" text="Create one from the learner's actual measured skill gaps."/>
       }

       {data.assessment_count>0&&<div className="right-actions">
         <button className="primary" disabled={busy} onClick={createPlan}>{data.plan?'Create new plan from latest assessment':'Create coaching plan'}</button>
         <button className="secondary" disabled={busy} onClick={refresh}>Refresh evidence</button>
       </div>}

       {saved&&<div className="success">Coaching plan saved for the learner and notification sent.</div>}
     </Card>
   </div>}
 </Section>;
}

function CoachDashboard({user}){const[d,setD]=useState(null);useEffect(()=>{api('/role-dashboard').then(setD)},[]);return <Section title={`Welcome, ${user.name.split(' ')[0]}`} sub="Coach workspace — focus on the learners assigned to you."><div className="grid four"><Kpi title="Assigned learners" value={d?.counts?.assigned??0}/><Kpi title="Pending reviews" value={d?.counts?.pending_reviews??0}/><Kpi title="Learners improving" value={d?.learners?.filter(x=>x.previous_score!=null&&x.latest_score>x.previous_score).length??0}/><Kpi title="Needs attention" value={d?.learners?.filter(x=>x.latest_score!=null&&x.latest_score<70).length??0}/></div><Card title="Learner coaching queue">{d?.learners?.length?d.learners.map(s=><div className="owner-row" key={s.id}><span><b>{s.name}</b><small>{s.email}</small></span><span>{s.latest_score==null?'No assessment':`Latest ${s.latest_score}`}</span><span>{s.previous_score!=null?`Change ${(s.latest_score-s.previous_score).toFixed(1)}`:'New learner'}</span></div>):<Empty title="No learners assigned." text="Search learners and assign them from Students."/>}</Card></Section>}
function CoachStudents(){const[students,setStudents]=useState([]),[q,setQ]=useState(''),[users,setUsers]=useState([]);const load=()=>api('/coach/students').then(setStudents);useEffect(load,[]);const search=async()=>setUsers(await api('/friends/search?q='+encodeURIComponent(q)));return <Section title="Students" sub="Your private coaching roster. Search, assign, then coach the learners you own."><div className="search-row"><input placeholder="Find learner by name" value={q} onChange={e=>setQ(e.target.value)}/><button className="primary" onClick={search}>Search</button></div><div className="grid three">{users.filter(u=>u.role==='learner').map(u=><Action key={u.id} title={u.name} text={u.email} button="Assign learner" onClick={async()=>{try{await api('/coach/assign',{method:'POST',body:{learner_id:u.id}});load()}catch(e){alert(e.message)}}}/>)}</div><Card title="Assigned learners">{students.length?students.map(s=><div className="owner-row" key={s.id}><span><b>{s.name}</b><small>{s.email}</small></span><span className="status-chip">Assigned</span></div>):<Empty title="No assigned learners." text="Search above to build your coaching roster."/>}</Card></Section>}
function CoachEvaluations(){const[d,setD]=useState(null);useEffect(()=>{api('/role-dashboard').then(setD)},[]);return <Section title="Evaluations" sub="Review learner results and decide what deserves coaching attention."><div className="grid two">{d?.learners?.length?d.learners.map(s=><Card key={s.id} title={s.name}><p>{s.email}</p><p><b>Latest:</b> {s.latest_score??'No assessment'}</p><p><b>Previous:</b> {s.previous_score??'—'}</p><p><b>Status:</b> {s.latest_score==null?'Waiting for first assessment':s.latest_score<70?'Needs coaching':'On track'}</p></Card>):<Empty title="No evaluations yet." text="Assigned learners will appear here after they complete activities."/>}</div></Section>}
function CoachSkillGaps(){const[d,setD]=useState(null);useEffect(()=>{api('/coach/insights').then(setD).catch(()=>{})},[]);return <Section title="Skill Gaps" sub="Identify the specific skills where assigned learners are lagging — not just one overall score.">{d?.learners?.length?<div className="grid two">{d.learners.map(s=><Card key={s.id} title={s.name}><p className="muted">{s.email}</p>{s.gaps?.length?<div className="gap-list">{s.gaps.map(g=><div key={g.skill}><b>{g.skill}</b><span>{g.score}/100</span><small>{g.coaching}</small></div>)}</div>:<p className="success">No major skill gaps found.</p>}</Card>)}</div>:<Empty title="No skill-gap data yet." text="Skill gaps will appear after assigned learners complete assessments."/>}</Section>}
function CoachAnalytics(){
 const[d,setD]=useState(null);
 useEffect(()=>{api('/coach/insights').then(setD).catch(()=>{})},[]);
 return <Section title="Analytics" sub="Coach-level analytics across your assigned learners, using stored assessment evidence.">
  {d?
   <>
    <div className="grid four">
     <Kpi title="Learners" value={d.summary.learners}/>
     <Kpi title="Assessed" value={d.summary.assessed}/>
     <Kpi title="Average score" value={d.summary.average_score}/>
     <Kpi title="Needs coaching" value={d.summary.needs_coaching}/>
    </div>
    <div className="grid two">
     <Card title="Skill averages">
      <div className="skill-list">
       {Object.entries(d.summary.skill_averages||{}).map(([k,v])=>
        <div key={k}>
         <span>{k}</span>
         <strong>{v}/100</strong>
         <div className="bar"><i style={{width:`${v}%`}}/></div>
        </div>
       )}
      </div>
     </Card>
     <Card title="Learner snapshots">
      <p className="muted">Current stored assessment state. This is not presented as a time-series trend.</p>
      <div className="timeline">
       {d.learners.map(s=>
        <div key={s.id}>
         <b>{s.name}</b>
         <span>{s.latest_score==null?'No assessment':`${s.latest_score}/100`}</span>
         <small>{s.gaps?.length?`${s.gaps.length} measured skill gaps`:'No major measured gaps'}</small>
        </div>
       )}
      </div>
     </Card>
    </div>
   </>
   :
   <Empty title="Loading coach analytics?"/>
  }
 </Section>
}
function EducatorDashboard({user}){const[d,setD]=useState(null);useEffect(()=>{api('/role-dashboard').then(setD)},[]);return <Section title={`Welcome, ${user.name.split(' ')[0]}`} sub="Educator workspace — manage classes, see cohort progress, and support learners."><div className="grid four"><Kpi title="Classes" value={d?.classes?.length??0}/><Kpi title="Learners" value={d?.classes?.reduce((n,c)=>n+c.students,0)??0}/><Kpi title="Cohort average" value={d?.classes?.filter(c=>c.average_score!=null).length?Math.round(d.classes.filter(c=>c.average_score!=null).reduce((n,c)=>n+c.average_score,0)/d.classes.filter(c=>c.average_score!=null).length):null}/><Kpi title="Active learning" value={d?.classes?.filter(c=>c.students>0).length??0}/></div><div className="grid three">{d?.classes?.length?d.classes.map(c=><Card key={c.id} title={c.name}><p>{c.description||'No description yet.'}</p><p><b>{c.students}</b> learners</p><p>{c.average_score==null?'No assessments yet':`Average ${c.average_score}`}</p></Card>):<Empty title="No classes yet." text="Create a class and add real learners."/>}</div></Section>}
function EducatorClasses(){const[classes,setClasses]=useState([]),[name,setName]=useState(''),[desc,setDesc]=useState(''),[active,setActive]=useState(null),[q,setQ]=useState(''),[users,setUsers]=useState([]);const load=()=>api('/educator/classes').then(setClasses);useEffect(load,[]);const create=async()=>{try{await api('/educator/classes',{method:'POST',body:{name,description:desc}});setName('');setDesc('');load()}catch(e){alert(e.message)}};const search=async()=>setUsers((await api('/friends/search?q='+encodeURIComponent(q))).filter(u=>u.role==='learner'));return <Section title="Classes" sub="Create classes and manage which learners belong to each cohort."><div className="studio"><label>Class name<input placeholder="e.g. Grade 10 Debate" value={name} onChange={e=>setName(e.target.value)}/></label><label>Description<textarea placeholder="What is this class working on?" value={desc} onChange={e=>setDesc(e.target.value)}/></label><button className="primary" disabled={name.trim().length<2} onClick={create}>Create class</button></div><div className="grid three">{classes.map(c=><Card key={c.id} title={c.name}><p>{c.description||'No description yet.'}</p><p>Students: {c.students??0}</p><button className={active===c.id?'primary':'secondary'} onClick={()=>setActive(active===c.id?null:c.id)}>{active===c.id?'Close roster':'Manage roster'}</button>{active===c.id&&<div className="mini-panel"><div className="search-row"><input placeholder="Find learner" value={q} onChange={e=>setQ(e.target.value)}/><button className="secondary" onClick={search}>Search</button></div>{users.map(u=><div className="friend-row" key={u.id}><span><b>{u.name}</b><small>{u.email}</small></span><button className="secondary" onClick={async()=>{try{await api(`/educator/classes/${c.id}/members`,{method:'POST',body:{user_id:u.id}});load()}catch(e){alert(e.message)}}}>Add</button></div>)}</div>}</Card>)}</div></Section>}
function EducatorStudents(){const[d,setD]=useState(null);useEffect(()=>{api('/educator/students').then(setD).catch(()=>{})},[]);return <Section title="Students" sub="See learners across the classes you own, with their latest real performance."><div className="grid two">{d?.students?.length?d.students.map(s=><Card key={s.id} title={s.name}><p className="muted">{s.email}</p><p><b>Classes:</b> {s.classes.join(', ')}</p><p><b>Latest score:</b> {s.latest_score??'No assessment'}</p><p><b>Change:</b> {s.change==null?'—':s.change>0?`+${s.change}`:s.change}</p></Card>):<Empty title="No learners in your classes." text="Open Classes and add real learners to a cohort."/>}</div></Section>}
function EducatorRankings(){const[d,setD]=useState(null);useEffect(()=>{api('/educator/insights').then(setD).catch(()=>{})},[]);return <Section title="Rankings" sub="A private cohort ranking for learners in your educator-owned classes.">{d?.rankings?.length?<Card title="Class leaderboard"><div className="ranking-list">{d.rankings.map(r=><div key={r.id}><span><b>#{r.rank}</b> {r.name}<small>{r.classes.join(', ')}</small></span><strong>{r.score}</strong></div>)}</div></Card>:<Empty title="No ranking data yet." text="Learners need completed assessments before a cohort ranking can be shown."/>}</Section>}
function EducatorAnalytics(){const[d,setD]=useState(null);useEffect(()=>{api('/educator/insights').then(setD).catch(()=>{})},[]);return <Section title="Analytics" sub="Cohort-level performance across your educator-owned classes.">{d?<><div className="grid four"><Kpi title="Classes" value={d.summary.classes}/><Kpi title="Learners" value={d.summary.learners}/><Kpi title="Assessed" value={d.summary.assessed}/><Kpi title="Average" value={d.summary.average_score}/></div><div className="grid two"><Card title="Class performance"><div className="timeline">{d.classes.map(c=><div key={c.id}><b>{c.name}</b><span>{c.average_score??'—'}</span><small>{c.students} learners · {c.assessed} assessed</small></div>)}</div></Card><Card title="Skill averages"><div className="skill-list">{Object.entries(d.summary.skill_averages||{}).map(([k,v])=><div key={k}><span>{k}</span><strong>{v}/100</strong><div className="bar"><i style={{width:`${v}%`}}/></div></div>)}</div></Card></div></>:<Empty title="Loading educator analytics…"/>}</Section>}

function Admin({page,setPage}){const[d,setD]=useState(null),[users,setUsers]=useState([]),[audit,setAudit]=useState([]);useEffect(()=>{api('/admin/overview').then(setD);api('/admin/users').then(setUsers).catch(()=>{});api('/admin/audit').then(setAudit).catch(()=>{})},[]);if(page==='Users')return <Section title="Users" sub="Platform-wide user directory. Administrator access only."><div className="grid four"><Kpi title="Total users" value={d?.total_users}/><Kpi title="Active users" value={d?.active_users}/><Kpi title="Debates" value={d?.debates}/><Kpi title="Presentations" value={d?.total_presentations}/></div><Card title="User directory">{users.length?users.map(u=><div className="owner-row" key={u.id}><span><b>{u.name}</b><small>{u.email}</small></span><span className="status-chip">{roleNames[u.role]}</span><small>{u.created_at?.slice(0,10)}</small></div>):<Empty title="No user records."/>}</Card></Section>;
 if(page==='Roles')return <Section title="Roles & Access" sub="Understand who can access which workspace."><div className="grid four">{[['learner','Practice, analysis, presentations, social'],['coach','Assigned learner coaching and evaluations'],['educator','Classes, cohorts, rankings and reports'],['admin','Platform administration, monitoring and audit']].map(([r,t])=><Card key={r} title={roleNames[r]}><p>{t}</p><span className="status-chip">RBAC protected</span></Card>)}</div></Section>;
 if(page==='AI Monitoring')return <Section title="AI Monitoring" sub="Provider health and usage visibility."><div className="grid four"><Kpi title="AI requests" value={d?.ai_requests}/><Kpi title="Groq" value={d?.groq_configured?'Ready':'Not configured'}/><Kpi title="Gemini" value={d?.gemini_configured?'Ready':'Not configured'}/><Kpi title="Fallback" value="Demo available"/></div><Card title="Provider policy"><p>Primary provider: Groq. Fallback: Gemini. Final fallback: Demo Mode.</p><p className="muted">AI outputs are only based on supplied activity and conversation context.</p></Card></Section>;
 if(page==='System Health')return <Section title="System Health" sub="Operational status of the platform services."><div className="grid four"><Kpi title="PostgreSQL" value={d?.postgres}/><Kpi title="MongoDB" value={d?.mongodb}/><Kpi title="Groq" value={d?.groq_configured?'configured':'missing'}/><Kpi title="Gemini" value={d?.gemini_configured?'configured':'missing'}/></div><Card title="Health checks"><p>Database connectivity and AI provider configuration are visible here. No fabricated health values are inserted.</p></Card></Section>;
 if(page==='Audit Logs')return <Section title="Audit Logs" sub="Security and platform events recorded by the backend."><Card title="Recent events">{audit.length?audit.map(a=><div className="owner-row" key={a.id}><span><b>{a.action}</b><small>User {a.user_id??'system'}</small></span><small>{a.created_at}</small></div>):<Empty title="No audit events yet."/>}</Card></Section>;
 if(page==='Analytics')return <Section title="Platform Analytics" sub="Operational totals across the entire platform."><div className="grid four"><Kpi title="Users" value={d?.total_users}/><Kpi title="Debates" value={d?.debates}/><Kpi title="Presentations" value={d?.total_presentations}/><Kpi title="AI requests" value={d?.ai_requests}/></div><Card title="What this means"><p>Use Users for account administration, AI Monitoring for provider visibility, and Audit Logs for traceability.</p></Card></Section>;
 if(page==='Reports')return <Reports role="admin"/>;
 if(page==='Settings')return <Section title="Settings" sub="Administrator configuration and security controls."><div className="grid two"><Card title="Access control"><p>Administrator accounts are provisioned, not self-registered.</p></Card><Card title="Data integrity"><p>Demo Mode never fabricates learner activity or assessment history.</p></Card></div></Section>;
 return <Section title="Administrator Dashboard" sub="Platform-wide operational visibility and control."><div className="grid four"><Kpi title="Users" value={d?.total_users}/><Kpi title="Active users" value={d?.active_users}/><Kpi title="Debates" value={d?.debates}/><Kpi title="AI requests" value={d?.ai_requests}/></div><div className="grid three"><Action title="Manage users" text="Review registered accounts and roles." onClick={()=>setPage('Users')}/><Action title="Monitor AI" text="Check provider readiness and AI usage." onClick={()=>setPage('AI Monitoring')}/><Action title="Review audit trail" text="Trace important platform events." onClick={()=>setPage('Audit Logs')}/></div></Section>}

function Reports({role}){const [kind,setKind]=useState('performance'),[fmt,setFmt]=useState('pdf'),[preview,setPreview]=useState(null),[loading,setLoading]=useState(false);const loadPreview=async(k=kind)=>{try{setLoading(true);setPreview(await api(`/reports/${k}/data`))}catch(e){setPreview({error:e.message})}finally{setLoading(false)}};useEffect(()=>{if(role==='learner')loadPreview(kind)},[kind]);const get=async()=>{try{const b=await api(`/reports/${kind}/${fmt}`);const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`${kind}-report.${fmt==='pdf'?'pdf':'xlsx'}`;a.click();URL.revokeObjectURL(u)}catch(e){alert(e.message)}};const isEdu=role==='educator',isCoach=role==='coach';return <Section title="Reports" sub={isEdu?'Cohort reports from your educator-owned classes.':isCoach?'Coaching reports for learners assigned to you.':'Readable reports generated from your actual stored assessments.'}><div className="report-toolbar"><select value={kind} onChange={e=>setKind(e.target.value)}><option value="performance">Performance report</option><option value="debate">Debate report</option><option value="presentation">Presentation report</option></select><select value={fmt} onChange={e=>setFmt(e.target.value)}><option value="pdf">PDF</option><option value="xlsx">Excel</option></select><button className="secondary" onClick={()=>loadPreview()}>{loading?'Loading…':'Preview report'}</button><button className="primary" onClick={get}>Generate report</button></div><div className="grid three"><Card title="Performance report"><p>Progress, real assessment scores, skill profile and recent activity.</p></Card><Card title="Debate report"><p>Actual debate topic, format, position, transcript-based assessment and coaching feedback.</p></Card><Card title="Presentation report"><p>Actual presentation file, slide count, speech availability and slide-level results.</p></Card></div>{role==='learner'&&preview&&!preview.error&&<Card title={`${kind[0].toUpperCase()+kind.slice(1)} report preview`}><div className="report-preview"><p className="report-intro">Generated for <b>{preview.generated_for}</b> from stored platform records.</p>{preview.sections?.map((sec,i)=><div className="report-section" key={i}><h3>{sec.title}</h3>{sec.items?.map((item,j)=><div className="report-item" key={j}><b>{item.label}</b><span>{item.value}</span></div>)}{sec.text&&<p>{sec.text}</p>}</div>)}</div></Card>}{role!=='learner'&&<Card title="Export"><p className="muted">Choose the report type and file format above. The exported report uses the records available to your role.</p></Card>}</Section>}
function Profile({user,setUser}){
 const[name,setName]=useState(user.name),[saved,setSaved]=useState(false);
 const[me,setMe]=useState(null);
 useEffect(()=>{api('/me').then(setMe).catch(()=>{})},[]);
 const save=async()=>{
  try{
   await api('/profile',{method:'PUT',body:{name}});
   setUser({...user,name});
   setSaved(true);
   setTimeout(()=>setSaved(false),2500);
  }catch(e){alert(e.message)}
 };
 const isCoach=user.role==='coach';
 return <Section title="Profile" sub={isCoach?"Manage your coach account and coaching workspace identity.":"Manage your account identity and role information."}>
  <div className="grid two">
   <Card title="Account">
    <label>Full name<input value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Email<input value={user.email} disabled/></label>
    <label>Role<input value={roleNames[user.role]||user.role} disabled/></label>
   </Card>
   {isCoach?
    <Card title="Coach workspace">
     <p><b>Role:</b> Coach</p>
     <p>Review assigned learner evidence, evaluate stored assessment results, identify measured skill gaps, and create coaching plans.</p>
     <p className="muted">Learner assessment metrics and learning preferences are kept out of the coach profile because they belong to the learner workspace.</p>
    </Card>
    :
    <Card title="Account information">
     <p><b>Role:</b> {roleNames[user.role]||user.role}</p>
     <p className="muted">Your account settings and activity are tied to your authenticated profile.</p>
    </Card>
   }
  </div>
  <div className="right-actions"><button className="primary" onClick={save}>Save changes</button></div>
  {saved&&<div className="success">Profile saved.</div>}
 </Section>
}
function Notifications({role}){const[n,setN]=useState([]);const load=()=>api('/notifications').then(setN).catch(()=>{});useEffect(()=>{load();const t=setInterval(load,5000);return()=>clearInterval(t)},[]);const unread=n.filter(x=>!x.read).length;return <Section title="Notifications" sub={role==='educator'?'Learner activity, class changes, reports and coaching alerts.':role==='coach'?'Assigned learner activity, reviews and coaching alerts.':'Updates generated by real platform events.'} actions={<button className="secondary" onClick={async()=>{await api('/notifications/read-all',{method:'POST'});load()}}>Mark all read</button>}>{unread>0&&<div className="notification-summary"><b>{unread}</b> unread update{unread===1?'':'s'}</div>}{n.length?<div className="notif-list">{n.map(x=><div className={x.read?'notif':'notif unread'} key={x.id}><div><span className="status-chip">{x.type}</span><b>{x.title}</b></div><p>{x.message}</p><small>{new Date(x.created_at).toLocaleString()}</small>{!x.read&&<button className="link-btn" onClick={async()=>{await api(`/notifications/${x.id}/read`,{method:'POST'});load()}}>Mark read</button>}</div>)}</div>:<Empty title="You're all caught up." text={role==='educator'?'New class, learner and report events will appear here.':role==='coach'?'New learner activity and coaching events will appear here.':'New platform events will appear here.'}/>}</Section>}

function LearnerSettings(){
 const [appearance,setAppearance]=useState(localStorage.getItem('arguai-appearance')||'dark'),[reminders,setReminders]=useState(localStorage.getItem('arguai-reminders')!=='off'),[saved,setSaved]=useState(false);
 const applyTheme=useCallback(theme=>{
  const actual=theme==='system'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):theme;
  document.documentElement.dataset.theme=actual;
 },[]);
 useEffect(()=>{applyTheme(appearance)},[appearance]);
 useEffect(()=>{if(appearance!=='system')return;const m=window.matchMedia?.('(prefers-color-scheme: light)');if(!m)return;const fn=()=>applyTheme('system');m.addEventListener?.('change',fn);return()=>m.removeEventListener?.('change',fn)},[appearance]);
 const save=()=>{localStorage.setItem('arguai-appearance',appearance);localStorage.setItem('arguai-reminders',reminders?'on':'off');applyTheme(appearance);setSaved(true);setTimeout(()=>setSaved(false),1800)};
 return <Section title="Settings" sub="Personalize your learner workspace while preserving the integrity of stored assessment data.">
  <div className="grid two"><Card title="Appearance"><label>Theme<select value={appearance} onChange={e=>setAppearance(e.target.value)}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label><p className="muted">Dark, light and system themes are applied immediately.</p></Card><Card title="Learning notifications"><label className="toggle-row"><input type="checkbox" checked={reminders} onChange={e=>setReminders(e.target.checked)}/> Coaching and learning reminders</label><p className="muted">Platform events such as debate invitations remain enabled separately.</p></Card></div>
  <div className="grid three"><Card title="Data integrity"><b>Real assessment data</b><p className="muted">Scores and trends come from completed activities. No synthetic learner history is created.</p></Card><Card title="AI provider path"><b>Groq → Gemini → Demo</b><p className="muted">The UI reports the provider used for each AI operation.</p></Card><Card title="Privacy"><b>Your workspace</b><p className="muted">Your profile and assessment records are tied to your authenticated account.</p></Card></div>
  <div className="right-actions"><button className="primary" onClick={save}>Save settings</button></div>{saved&&<div className="success">Settings saved.</div>}
 </Section>
}

function RolePage({page,user,setPage,setUser}){if(page==='Dashboard')return user.role==='learner'?<LearnerDashboard user={user} setPage={setPage}/>:user.role==='coach'?<CoachDashboard user={user}/>:user.role==='educator'?<EducatorDashboard user={user}/>:<Admin page="Dashboard" setPage={setPage}/>;if(page==='Debates'&&user.role==='learner')return <Debate setPage={setPage} mode="history"/>;if(page==='Analysis')return <Analysis kind="argument"/>;if(page==='Fallacies')return <Analysis kind="fallacy"/>;if(page==='Counterarguments')return <Analysis kind="counter"/>;if(page==='Full Case Review')return <CaseReview/>;if(page==='Presentations')return <Presentations/>;
 if(user.role==='learner'&&['Analytics','Performance','Skill Development'].includes(page))return <LearnerAnalytics page={page} setPage={setPage}/>;if(user.role==='coach'&&page==='Skill Gaps')return <CoachSkillGaps/>;if(user.role==='coach'&&page==='Evaluations')return <CoachEvaluations setPage={setPage}/>;if(user.role==='coach'&&page==='Analytics')return <CoachAnalytics/>;if(user.role==='educator'&&page==='Analytics')return <EducatorAnalytics/>;if(user.role==='educator'&&page==='Rankings')return <EducatorRankings/>;
 if(page==='Friends'&&user.role==='learner')return <FriendsPage/>;if(page==='Live Arena'&&user.role==='learner')return <LiveArena user={user}/>;if(user.role==='coach'&&page==='Coaching')return <CoachCoaching/>;if(['AI Coaching','Learning Plan'].includes(page))return <Coaching page={page}/>;if(page==='Students'&&user.role==='coach')return <CoachStudents/>;if(page==='Students'&&user.role==='educator')return <EducatorStudents/>;if(page==='Classes'&&user.role==='educator')return <EducatorClasses/>;if(page==='Reports')return <Reports role={user.role}/>;if(page==='Notifications')return <Notifications role={user.role}/>;if(page==='Profile')return <Profile user={user} setUser={setUser}/>;if(page==='Settings'&&user.role==='learner')return <LearnerSettings/>;if(user.role==='admin')return <Admin page={page} setPage={setPage}/>;return <Section title={page} sub={`${roleNames[user.role]} workspace.`}><Empty/></Section>}

function App(){const[user,setUser]=useState(null),[page,setPage]=useState('Dashboard');useEffect(()=>{if(localStorage.getItem('token'))api('/me').then(setUser).catch(()=>localStorage.removeItem('token'))},[]);if(!user)return <Login onLogin={setUser}/>;const logout=async()=>{try{await api('/auth/logout',{method:'POST'})}catch{}localStorage.removeItem('token');setUser(null)};return <Layout user={user} page={page} setPage={setPage} onLogout={logout}><RolePage page={page} user={user} setPage={setPage} setUser={setUser}/></Layout>}
createRoot(document.getElementById('root')).render(<App/>);
