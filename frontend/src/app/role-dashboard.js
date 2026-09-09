"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RoleDashboard({type, title, endpoint}) {
  const router = useRouter(); const [data,setData]=useState(null); const [error,setError]=useState("");
  useEffect(()=>{ const token=localStorage.getItem("logos_ai_jwt"); if(!token){router.push("/login");return;} fetch(`http://localhost:8000/api/v1/dashboards/${endpoint}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():r.json().then(x=>Promise.reject(new Error(x.detail||"Access denied")))).then(setData).catch(e=>setError(e.message)); },[endpoint,router]);
  return <main className="section-container" style={{paddingTop:"3rem"}}><div className="badge-red-pill">ROLE INTELLIGENCE // {type}</div><h1 className="font-display" style={{fontSize:"3rem",fontWeight:900,textTransform:"uppercase"}}>{title}</h1>{error&&<div className="card" style={{marginTop:"1rem",color:"#b91c1c"}}>{error}</div>}{data&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"1rem",marginTop:"2rem"}}>{Object.entries(data).map(([k,v])=><div className="card" key={k}><div className="font-mono" style={{fontSize:".7rem",opacity:.65,textTransform:"uppercase"}}>{k.replaceAll("_"," ")}</div><div style={{fontSize:"1.4rem",fontWeight:800,marginTop:".5rem"}}>{Array.isArray(v)?v.join(", "):typeof v==='object'?JSON.stringify(v):String(v)}</div></div>)}</div>}</main>
}
