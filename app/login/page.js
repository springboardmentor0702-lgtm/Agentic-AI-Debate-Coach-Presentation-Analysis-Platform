"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [email,setEmail]=useState(''); const [message,setMessage]=useState('');
  return <div className="page-shell" style={{maxWidth:600}}><div className="page-title"><div className="eyebrow">Secure access</div><h1 className="display">Return to the <span className="red">lab.</span></h1><p>Use the demo workspace to explore your debate history, coaching plan, and performance matrix.</p></div><div className="panel" style={{marginTop:40}}><label>Email</label><input className="field" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input className="field" type="password" placeholder="••••••••"/><button className="btn btn-red" style={{width:'100%',marginTop:24}} onClick={()=>setMessage('Demo access enabled — opening your dashboard.')}>Enter workspace ↗</button>{message && <div className="notice" style={{marginTop:16}}>{message} <Link href="/dashboard" style={{color:'var(--red)',fontWeight:700}}>Go to dashboard</Link></div>}<p className="muted" style={{fontSize:13,marginTop:25}}>New to LOGOS? <Link href="/signup" style={{color:'var(--red)'}}>Create a profile</Link></p></div></div>;
}