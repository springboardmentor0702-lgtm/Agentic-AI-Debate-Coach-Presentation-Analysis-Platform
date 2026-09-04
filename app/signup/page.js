"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function SignupPage() {
  const [created,setCreated]=useState(false);
  return <div className="page-shell" style={{maxWidth:680}}><div className="page-title"><div className="eyebrow">Profile & skill management · milestone 01</div><h1 className="display">Build your <span className="red">edge.</span></h1><p>Tell the coaching engine what you want to practice. You can change these preferences later.</p></div><div className="panel" style={{marginTop:40}}><div className="split"><div><label>Full name</label><input className="field" placeholder="Your name"/></div><div><label>Experience</label><select><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div></div><label>Preferred debate topics</label><input className="field" placeholder="AI, technology, public policy"/><label>Learning goals</label><textarea className="field textarea" rows="4" placeholder="Reduce filler words, master counterarguments..."/><button className="btn btn-red" style={{width:'100%',marginTop:24}} onClick={()=>setCreated(true)}>Create learner profile ↗</button>{created && <div className="notice" style={{marginTop:16}}>Profile created. <Link href="/dashboard" style={{color:'var(--red)',fontWeight:700}}>Open your dashboard</Link></div>}</div></div>;
}