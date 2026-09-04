import os, uuid, secrets, json, logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings
from app.database.db import Base, engine, get_db
from app.models import User, Profile, Debate, DebateParticipant, DebateMessage, Score, Friendship, Invitation, Notification, Presentation, LearningPlan, Class, ClassMembership, CoachAssignment, AuditLog
from app.schemas.schemas import *
from app.core.security import hash_password, verify_password, create_token, current_user, require_roles
from app.providers import provider_manager
from app.services.analysis import analyze_argument, detect_fallacies, counterarguments
from app.services.scoring import score_debate, score_presentation_content, score_presentation_content
from app.services.presentation import parse_pptx, analyze_slides
from app.services.reports import pdf_report, excel_report
from app.services.mongo import store_artifact

logging.basicConfig(level=logging.INFO)
log=logging.getLogger("debate-coach")
Path(settings.upload_directory).mkdir(parents=True,exist_ok=True)
Base.metadata.create_all(bind=engine)
app=FastAPI(title=settings.app_name,version="1.0.0",description="Agentic AI Debate Coach and Presentation Intelligence Platform")
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_list,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

SUGGESTED_TOPICS=["Should artificial intelligence replace human teachers?","Should social media platforms regulate political content?","Is remote work better than office work?","Should governments subsidize renewable energy?","Should university education be free?"]
FORMATS=["one_on_one","parliamentary","oxford","policy","public_forum","ai_simulation","human_live"]
FORMAT_SPECS={
"one_on_one":{"label":"One-to-One AI Debate","rounds":["Opening position","Challenge & rebuttal","Closing statement"],"rules":"The learner and AI are the only speakers. Alternate direct turns like a one-to-one debate; AI challenges the learner's actual claims and closes the exchange."},
"ai_simulation":{"label":"AI Debate Simulation","rounds":["Opening argument","Adaptive rebuttal","Closing assessment"],"rules":"Dynamic multi-turn AI opponent; respond to actual arguments, adapt difficulty, ask evidence/logic challenges, rebut and close."},
"parliamentary":{"label":"Parliamentary AI Debate","rounds":["Government opening","Opposition challenge","Government rebuttal","Opposition rebuttal","Closing synthesis"],"rules":"Simulate parliamentary role mechanics with the learner on one side and AI on the other. Emphasize role fulfillment, clash, rebuttal and synthesis."},
"oxford":{"label":"Oxford AI Debate","rounds":["Proposition opening","Opposition opening","Rebuttal","Audience challenge","Closing statements"],"rules":"Use proposition/opposition structure. AI is the opposing speaker and can introduce an audience-style challenge. Emphasize thesis, evidence, rebuttal and persuasion."},
"policy":{"label":"Policy AI Debate","rounds":["Constructive case","Cross-examination","Rebuttal","Impact comparison","Closing"],"rules":"Use policy mechanics: plan, harms/benefits, mechanism/solvency, cross-examination, evidence challenge, rebuttal and impact comparison."},
"public_forum":{"label":"Public Forum AI Debate","rounds":["Constructive","Crossfire","Rebuttal","Summary","Final focus"],"rules":"Use public-forum pacing with accessible constructive speeches, direct crossfire, concise rebuttal, summary and final focus. Emphasize weighing and responsiveness."}}


def user_dict(u): return {"id":u.id,"email":u.email,"name":u.name,"role":u.role}
def notify(db,uid,title,message,typ): db.add(Notification(user_id=uid,title=title,message=message,type=typ)); db.commit()
def audit(db,u,action,details=None): db.add(AuditLog(user_id=u.id if u else None,action=action,details=details or {})); db.commit()

def serialize_score(s): return {"overall":s.overall,"argument_quality":s.argument_quality,"evidence_usage":s.evidence_usage,"logical_consistency":s.logical_consistency,"rebuttal_effectiveness":s.rebuttal_effectiveness,"communication_skills":s.communication_skills,"critical_thinking":s.critical_thinking,"persuasiveness":s.persuasiveness,"clarity":s.clarity,"confidence":s.confidence,"source":s.source,"created_at":s.created_at.isoformat()}

def numeric_score(value, default=0.0):
    """Safely normalize AI score fields that may be numeric or qualitative text."""
    if isinstance(value, bool):
        return float(default)
    if isinstance(value, (int, float)):
        return max(0.0, min(100.0, float(value)))
    if isinstance(value, str):
        match=__import__("re").search(r"(?<!\d)(100(?:\.0+)?|(?:[1-9]?\d)(?:\.\d+)?)(?!\d)", value)
        if match:
            return max(0.0, min(100.0, float(match.group(1))))
        low=value.lower()
        if "very strong" in low or "excellent" in low: return 90.0
        if "strong" in low: return 82.0
        if "moderate" in low and "weak" in low: return 58.0
        if "moderate" in low: return 65.0
        if "weak" in low: return 42.0
    return float(default)

@app.get("/api/health")
def health(db:Session=Depends(get_db)):
    pg="ok"
    try: db.execute(__import__('sqlalchemy').text("SELECT 1"))
    except Exception as e: pg=f"error: {e}"
    mongo="configured" if settings.mongodb_uri else "not_configured"
    return {"status":"ok","database":pg,"mongodb":mongo,"ai_provider":settings.ai_provider,"fallback_enabled":settings.ai_fallback_enabled}

@app.post("/api/auth/register",response_model=TokenOut)
def register(payload:RegisterIn,db:Session=Depends(get_db)):
    allowed_roles={"learner","coach","educator"}
    if payload.role not in allowed_roles: raise HTTPException(400,"Choose Learner, Debate Coach, or Educator")
    if db.query(User).filter(User.email==payload.email).first(): raise HTTPException(400,"Email already registered")
    u=User(email=payload.email,password_hash=hash_password(payload.password),name=payload.name,role=payload.role); db.add(u); db.flush(); db.add(Profile(user_id=u.id)); db.commit(); audit(db,u,"register")
    return {"access_token":create_token(u.id,u.role),"token_type":"bearer","user":user_dict(u)}

@app.post("/api/auth/login",response_model=TokenOut)
def login(payload:LoginIn,db:Session=Depends(get_db)):
    u=db.query(User).filter(User.email==payload.email).first()
    if not u or not verify_password(payload.password,u.password_hash): raise HTTPException(401,"Invalid email or password")
    audit(db,u,"login"); return {"access_token":create_token(u.id,u.role),"refresh_token":create_token(u.id,u.role,refresh=True),"token_type":"bearer","user":user_dict(u)}
@app.post("/api/auth/refresh")
def refresh_token(payload: dict, db: Session = Depends(get_db)):
    from app.core.security import decode_token
    try:
        data=decode_token(payload.get("refresh_token", ""), refresh=True); u=db.get(User,int(data["sub"]))
        if not u: raise ValueError()
    except Exception: raise HTTPException(401,"Invalid refresh token")
    return {"access_token":create_token(u.id,u.role),"token_type":"bearer"}

@app.post("/api/auth/logout")
def logout(user=Depends(current_user),db:Session=Depends(get_db)): audit(db,user,"logout"); return {"message":"Logged out. Discard the access token client-side."}

@app.get("/api/me")
def me(user=Depends(current_user),db:Session=Depends(get_db)):
    p=user.profile
    return {**user_dict(user),"profile":{"experience_level":p.experience_level,"preferred_topics":p.preferred_topics,"presentation_domains":p.presentation_domains,"learning_goals":p.learning_goals,"coaching_preferences":p.coaching_preferences}}
@app.put("/api/profile")
def update_profile(payload:ProfileIn,user=Depends(current_user),db:Session=Depends(get_db)):
    p=user.profile or Profile(user_id=user.id);
    if payload.name is not None: user.name=payload.name.strip()
    p.experience_level=payload.experience_level;p.preferred_topics=payload.preferred_topics;p.presentation_domains=payload.presentation_domains;p.learning_goals=payload.learning_goals;p.coaching_preferences=payload.coaching_preferences;db.add(p);db.commit();return {"message":"Profile updated"}

@app.get("/api/ai/status")
def ai_status():
    return {"primary":"groq","fallback":"gemini","final_fallback":"demo","groq_model":settings.groq_model,"gemini_model":settings.gemini_model,"groq_configured":bool(settings.groq_api_key),"gemini_configured":bool(settings.gemini_api_key),"demo_available":True,"ollama_required":False,"local_llm_required":False}

@app.get("/api/topics")
def topics(): return {"suggested":SUGGESTED_TOPICS,"formats":FORMATS}
@app.post("/api/debates")
def create_debate(payload:DebateCreate,user=Depends(current_user),db:Session=Depends(get_db)):
    if payload.format not in FORMATS: raise HTTPException(400,"Unsupported debate format")
    code=secrets.token_urlsafe(6).upper()[:8] if not payload.ai_opponent else None
    d=Debate(topic=payload.topic,format=payload.format,position_a=payload.position,position_b="against" if payload.position=="for" else "for",rounds=payload.rounds,created_by=user.id,join_code=code,status="active" if payload.ai_opponent else "waiting");db.add(d);db.flush();db.add(DebateParticipant(debate_id=d.id,user_id=user.id,position=payload.position));db.commit();audit(db,user,"debate_create",{"debate_id":d.id});return {"id":d.id,"topic":d.topic,"format":d.format,"rounds":d.rounds,"join_code":d.join_code,"status":d.status,"position":payload.position}
@app.get("/api/debates")
def debates(user=Depends(current_user),db:Session=Depends(get_db)):
    ds=db.query(Debate).join(DebateParticipant,Debate.id==DebateParticipant.debate_id).filter(DebateParticipant.user_id==user.id).order_by(Debate.created_at.desc()).limit(50).all()
    return [{"id":d.id,"topic":d.topic,"format":d.format,"status":d.status,"rounds":d.rounds,"created_at":d.created_at.isoformat()} for d in ds]

def live_stage(db, debate, message_count):
    total_opening=max(1, int(debate.rounds or 1))*2
    participants=db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate.id).order_by(DebateParticipant.id.asc()).all()
    if message_count < total_opening:
        round_no=(message_count//2)+1; phase="opening" if message_count%2==0 else "response"; expected=participants[message_count%2].user_id if len(participants)>=2 else None
    elif message_count < total_opening+2:
        round_no=max(1,int(debate.rounds or 1)); phase="rebuttal"; expected=participants[(message_count-total_opening)%2].user_id if len(participants)>=2 else None
    elif message_count < total_opening+4:
        round_no=max(1,int(debate.rounds or 1)); phase="closing"; expected=participants[(message_count-total_opening-2)%2].user_id if len(participants)>=2 else None
    else:
        round_no=max(1,int(debate.rounds or 1)); phase="complete"; expected=None
    return round_no,phase,expected

@app.get("/api/debates/{debate_id}/messages")
def debate_messages(debate_id:int,user=Depends(current_user),db:Session=Depends(get_db)):
    if not db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate_id,DebateParticipant.user_id==user.id).first(): raise HTTPException(403,"You are not a participant")
    rows=db.query(DebateMessage).filter(DebateMessage.debate_id==debate_id).order_by(DebateMessage.created_at.asc()).all()
    participants={p.user_id:p.position for p in db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate_id).all()}
    return [{"role":m.role,"text":m.text,"provider":m.provider,"user_id":m.user_id,
             "name":db.get(User,m.user_id).name if m.user_id else "AI Judge",
             "position":participants.get(m.user_id) if m.user_id else None,
             "round_number":m.round_number,"phase":m.phase,
             "created_at":m.created_at.isoformat()} for m in rows]

@app.post("/api/debates/{debate_id}/turn")
async def debate_turn(debate_id:int,payload:DebateTurn,user=Depends(current_user),db:Session=Depends(get_db)):
    d=db.get(Debate,debate_id)
    if not d: raise HTTPException(404,"Debate not found")
    if d.status != "active": raise HTTPException(400,"Debate is not active")
    participant=db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate_id,DebateParticipant.user_id==user.id).first()
    if not participant: raise HTTPException(403,"You are not a participant in this debate")
    db.add(DebateMessage(debate_id=debate_id,user_id=user.id,role="user",text=payload.text))
    history=db.query(DebateMessage).filter(DebateMessage.debate_id==debate_id).order_by(DebateMessage.created_at.asc()).all()
    conversation="\n".join(f"{m.role.upper()}: {m.text}" for m in history[-12:])
    spec=FORMAT_SPECS.get(d.format, FORMAT_SPECS["ai_simulation"])
    learner_turns=sum(1 for m in history if m.role=="user")
    stage=spec["rounds"][min(max(learner_turns-1,0),len(spec["rounds"])-1)]
    system=f"You are the AI opponent in {spec['label']}. RULES: {spec['rules']} CURRENT STAGE: {stage}. Only the learner and AI speak. Respond to the learner's actual latest argument and history. Never invent evidence. Keep spoken delivery natural, 2-4 short sentences, 35-70 words. End with one focused challenge when appropriate. No headings, bullets, markdown, citations or JSON."
    result=await provider_manager.generate(system,f"Topic: {d.topic}\nLearner position: {d.position_a}\nConversation:\n{conversation}")
    # Keep the persisted debate turn conversational even if a provider ignores the length instruction.
    text=result["text"].strip()
    text=text.replace("**", "").replace("__", "")
    sentences=[]
    words_used=0
    for part in __import__("re").split(r"(?<=[.!?])\s+", text):
        part=part.strip()
        if not part:
            continue
        count=len(part.split())
        if sentences and words_used + count > 65:
            break
        if not sentences and count > 65:
            part=" ".join(part.split()[:65]).rstrip(" ,;:") + "."
            count=len(part.split())
        sentences.append(part)
        words_used += count
        if len(sentences)>=3:
            break
    if sentences:
        result["text"]=" ".join(sentences)

    db.add(DebateMessage(debate_id=debate_id,user_id=None,role="assistant",text=result["text"],provider=result["provider"]));db.commit()
    store_artifact("ai_conversations",{"debate_id":debate_id,"user_id":user.id,"user":payload.text,"ai":result["text"],"provider":result["provider"],"created_at":datetime.now(timezone.utc)})
    return {"response":result["text"],"provider":result["provider"],"mode":"DEMO MODE" if result["provider"]=="demo" else result["provider"],"messages":[{"role":m.role,"text":m.text,"created_at":m.created_at.isoformat()} for m in db.query(DebateMessage).filter(DebateMessage.debate_id==debate_id).order_by(DebateMessage.created_at.asc()).all()]}
@app.post("/api/debates/{debate_id}/finish")
async def finish_debate(debate_id:int,user=Depends(current_user),db:Session=Depends(get_db)):
    d=db.get(Debate,debate_id)
    if not d: raise HTTPException(404,"Debate not found")
    if not db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate_id,DebateParticipant.user_id==user.id).first(): raise HTTPException(403,"You are not a participant")
    existing=db.query(Score).filter(Score.user_id==user.id,Score.debate_id==debate_id).order_by(Score.created_at.desc()).first()
    if existing:
        return {"debate_id":debate_id,"score":serialize_score(existing),"provider":existing.source,"replay":[]}
    msgs=db.query(DebateMessage).filter(DebateMessage.debate_id==debate_id,DebateMessage.user_id==user.id,DebateMessage.role=="user").order_by(DebateMessage.created_at.asc()).all()
    if not msgs: raise HTTPException(400,"Submit at least one argument before finishing")
    text="\n".join(m.text for m in msgs)
    spec=FORMAT_SPECS.get(d.format, FORMAT_SPECS["ai_simulation"])
    r=await provider_manager.generate(f"Score this learner's actual contribution for {spec['label']}. Format rules: {spec['rules']} Return JSON with argument_quality,evidence_usage,logical_consistency,rebuttal_effectiveness,communication_skills, each 0-100. Use only the supplied learner text and format-appropriate criteria. If evidence is absent, score evidence accordingly. Do not invent activity.",f"Topic: {d.topic}\nLearner arguments:\n{text}",json_mode=True)
    try:
        raw=json.loads(r["text"]); metrics=score_debate({k:float(raw.get(k,0)) for k in ["argument_quality","evidence_usage","logical_consistency","rebuttal_effectiveness","communication_skills"]})
    except Exception:
        a=await analyze_argument(text); metrics=score_debate({"argument_quality":numeric_score(a.get("strength"), 0),"evidence_usage":numeric_score(a.get("evidence_quality"), 0),"logical_consistency":numeric_score(a.get("logical_consistency"), 0),"rebuttal_effectiveness":numeric_score(a.get("persuasiveness"), 0),"communication_skills":numeric_score(a.get("clarity"), 0)})
    d.status="completed"; s=Score(user_id=user.id,debate_id=d.id,source=r["provider"],**metrics);db.add(s);db.commit();return {"debate_id":d.id,"score":serialize_score(s),"provider":r["provider"],"replay":[]}

@app.post("/api/analysis/argument")
async def argument(payload:AnalysisIn,user=Depends(current_user),db:Session=Depends(get_db)):
    text=payload.text.strip()
    if len(text)<10: raise HTTPException(400,"Provide a complete argument of at least 10 characters")
    result=await analyze_argument(text)
    source=result.get("source","demo")
    # Store a real assessment for the Argument domain so Performance/Analytics
    # can distinguish it from debate and presentation assessments.
    metrics=score_debate({
        "argument_quality":numeric_score(result.get("strength"), 0),
        "evidence_usage":numeric_score(result.get("evidence_quality"), 0),
        "logical_consistency":numeric_score(result.get("logical_consistency"), 0),
        "rebuttal_effectiveness":numeric_score(result.get("persuasiveness"), 0),
        "communication_skills":numeric_score(result.get("clarity"), 0),
    })
    db.add(Score(user_id=user.id,source="argument_analysis",**metrics))
    audit(db,user,"argument_analysis",{"source":source})
    db.commit()
    store_artifact("argument_analysis",{"user_id":user.id,"input":text,"result":result,"created_at":datetime.now(timezone.utc)})
    return result


@app.post("/api/analysis/fallacies")
async def fallacies(payload:AnalysisIn,user=Depends(current_user),db:Session=Depends(get_db)):
    text=payload.text.strip()
    if len(text)<10: raise HTTPException(400,"Provide an argument of at least 10 characters")
    result=await detect_fallacies(text)
    names=[x.get("name") for x in result.get("fallacies",[]) if x.get("name")]
    audit(db,user,"fallacy_detected",{"names":names,"source":result.get("source","demo")})
    db.commit()
    store_artifact("fallacy_analysis",{"user_id":user.id,"input":text,"result":result,"created_at":datetime.now(timezone.utc)})
    return result


@app.post("/api/analysis/counterarguments")
async def counters(payload:AnalysisIn,user=Depends(current_user),db:Session=Depends(get_db)):
    text=payload.text.strip()
    if len(text)<10: raise HTTPException(400,"Provide an argument of at least 10 characters")
    result=await counterarguments(text)
    source=result.get("source","demo")
    # Counterargument quality is stored separately from debate scores.
    metrics=score_debate({
        "argument_quality":float(result.get("argument_specificity",0) or 0),
        "evidence_usage":float(result.get("evidence_challenge_score",0) or 0),
        "logical_consistency":float(result.get("logic_challenge_score",0) or 0),
        "rebuttal_effectiveness":float(result.get("directness_score",0) or 0),
        "communication_skills":float(result.get("clarity_score",0) or 0),
    })
    db.add(Score(user_id=user.id,source="counterargument_analysis",**metrics))
    audit(db,user,"counterargument_analysis",{"source":source})
    db.commit()
    store_artifact("counterarguments",{"user_id":user.id,"input":text,"result":result,"created_at":datetime.now(timezone.utc)})
    return result


@app.post("/api/presentations/upload")
async def upload_presentation(background:BackgroundTasks,file:UploadFile=File(...),user=Depends(current_user),db:Session=Depends(get_db)):
    if not file.filename.lower().endswith(".pptx"): raise HTTPException(400,"Only .pptx files are supported")
    data=await file.read()
    if len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"File too large")
    if not data[:2] == b"PK": raise HTTPException(400,"Invalid PPTX file")
    safe=f"{uuid.uuid4().hex}.pptx"; path=Path(settings.upload_directory)/safe; path.write_bytes(data)
    try: slides=parse_pptx(str(path))
    except Exception: path.unlink(missing_ok=True); raise HTTPException(400,"Could not parse PPTX")
    p=Presentation(user_id=user.id,filename=file.filename,status="ready",slide_count=len(slides),slide_data=slides);db.add(p);db.commit()
    audit(db,user,"presentation_upload",{"presentation_id":p.id,"slide_count":len(slides)})
    db.commit()
    store_artifact("presentation_analysis",{"presentation_id":p.id,"user_id":user.id,"slides":slides,"created_at":datetime.now(timezone.utc)})
    return {"id":p.id,"filename":file.filename,"slide_count":len(slides),"status":"ready","slides":slides}
@app.post("/api/presentations/{presentation_id}/analyze")
async def presentation_analyze(presentation_id:int,payload:dict|None=None,user=Depends(current_user),db:Session=Depends(get_db)):
    p=db.get(Presentation,presentation_id)
    if not p or p.user_id!=user.id: raise HTTPException(404,"Presentation not found")
    slides=p.slide_data or []
    speeches=(payload or {}).get("speeches",{})
    result=analyze_slides(slides,speeches,(payload or {}).get("audio_metrics",{}))
    p.overall_score=result.get("overall_score")
    p.slide_data=result.get("slides",slides)
    p.status="analyzed"

    # A presentation score is created only when at least one slide has enough
    # actual captured speech. Slide-content quality is never presented as
    # delivery performance.
    if result.get("content_quality") is not None:
        metrics={
            "argument_quality":float(result.get("content_quality") or 0),
            "evidence_usage":float(result.get("content_quality") or 0),
            "logical_consistency":float(result.get("structure") or 0),
            "rebuttal_effectiveness":float(result.get("explanation_quality") or 0),
            "communication_skills":float(result.get("delivery") or 0),
            "clarity":float(result.get("clarity")) if result.get("clarity") is not None else None,
            "confidence":float(result.get("confidence")) if result.get("confidence") is not None else None,
        }
        score_data=score_debate(metrics) if result.get("performance_available") else score_presentation_content(metrics)
        score=Score(user_id=user.id,presentation_id=p.id,source="real_presentation",**score_data)
        db.add(score)
    audit(db,user,"presentation_analysis",{"presentation_id":p.id,"performance_available":result.get("performance_available",False)})
    db.commit()
    store_artifact("presentation_results",{"presentation_id":p.id,"user_id":user.id,"result":result,"created_at":datetime.now(timezone.utc)})
    return result


@app.post("/api/analysis/case-review")
async def case_review(payload:dict,user=Depends(current_user),db:Session=Depends(get_db)):
    text=str((payload or {}).get("text","")).strip()
    if len(text)<20: raise HTTPException(400,"Provide a complete case of at least 20 characters")
    system="Return JSON with case_overview{title,topic,main_issue,context}, arguments[{claim,reasoning,evidence}], fallacies[{name,location,explanation}], counterarguments[{argument,response}], evidence_review{provided,gaps,additional_evidence}, overall_case_assessment{argument_quality,logic,evidence,persuasiveness,critical_thinking}, ai_conclusion{strengths,weaknesses,improvements}. Analyze only the supplied case; never invent evidence or citations."
    r=await provider_manager.generate(system,"CASE:\n"+text,json_mode=True)
    try:
        data=json.loads(r["text"])
        source_text=" ".join(str(v) for v in data.values())
        learner_terms={x.lower() for x in re.findall(r"[A-Za-z]{6,}",text)}
        if learner_terms and not any(term in source_text.lower() for term in learner_terms):
            raise ValueError("Case review was not sufficiently grounded in supplied text")
    except Exception:
        fallback=await provider_manager.generate(
            "Return JSON with case_overview, arguments, fallacies, counterarguments, evidence_review, overall_case_assessment and ai_conclusion for a case review. Use only the supplied case.",
            "CASE:\n"+text,json_mode=True,requested="demo")
        try:
            data=json.loads(fallback["text"])
            r={**r,"provider":"demo"}
        except Exception:
            raise HTTPException(502,"Unable to produce a grounded case review")
    # Keep every requested section present and grounded. Empty arrays/fields are
    # explicitly explained rather than being silently replaced with invented facts.
    data.setdefault("case_overview",{})
    data.setdefault("arguments",[])
    data.setdefault("fallacies",[])
    data.setdefault("counterarguments",[])
    data.setdefault("evidence_review",{})
    data.setdefault("overall_case_assessment",{})
    data.setdefault("ai_conclusion",{})
    overview=data["case_overview"]
    overview.setdefault("title","Supplied case review")
    overview.setdefault("topic","Not explicitly stated in the case")
    overview.setdefault("main_issue","Main issue must be inferred only from the supplied case.")
    overview.setdefault("context","Context is limited to the text supplied by the learner.")
    if not data["arguments"]:
        data["arguments"]=[{"claim":"No distinct claim was confidently extracted.","reasoning":"No separate reasoning chain was confidently extracted.","evidence":"No explicit evidence was identified."}]
    if not data["fallacies"]:
        data["fallacies"]=[{"name":"None supported","location":"—","explanation":"No supported fallacy was identified from the supplied case."}]
    if not data["counterarguments"]:
        data["counterarguments"]=[{"argument":"Strong opposing case not confidently extracted.","response":"Revisit the central claim and test its strongest premise."}]
    evidence=data["evidence_review"]
    evidence.setdefault("provided","Only evidence explicitly contained in the supplied case was considered.")
    evidence.setdefault("gaps","No additional evidence was assumed. Any missing support is an evidence gap.")
    evidence.setdefault("additional_evidence","Add verifiable evidence that directly tests the main claims.")
    assessment=data["overall_case_assessment"]
    for key in ["argument_quality","logic","evidence","persuasiveness","critical_thinking"]:
        assessment.setdefault(key,None)
    conclusion=data["ai_conclusion"]
    conclusion.setdefault("strengths",["A complete case review was generated from the supplied text."])
    conclusion.setdefault("weaknesses",["Any claim not supported by supplied evidence remains unverified."])
    conclusion.setdefault("improvements",["Strengthen the weakest claim with explicit reasoning and evidence."])
    data["source"]=r["provider"]
    assessment=data.get("overall_case_assessment") or {}
    numeric={k:float(assessment[k]) for k in ["argument_quality","logic","evidence","persuasiveness","critical_thinking"] if isinstance(assessment.get(k),(int,float))}
    if len(numeric)>=3:
        metrics={
            "argument_quality":numeric.get("argument_quality",0),
            "evidence_usage":numeric.get("evidence",0),
            "logical_consistency":numeric.get("logic",0),
            "rebuttal_effectiveness":numeric.get("persuasiveness",0),
            "communication_skills":numeric.get("critical_thinking",0),
            "critical_thinking":numeric.get("critical_thinking",0),
            "persuasiveness":numeric.get("persuasiveness",0),
        }
        db.add(Score(user_id=user.id,source="case_review",**score_debate(metrics)))
    audit(db,user,"case_review",{"source":r["provider"],"scored":len(numeric)>=3})
    db.commit()
    return data

@app.get("/api/analytics")
def analytics(user=Depends(current_user),db:Session=Depends(get_db)):
    scores=db.query(Score).filter(Score.user_id==user.id).order_by(Score.created_at.asc()).all()

    # Learning activity is broader than scoring: debates, analyses, presentations,
    # coaching and plan actions count as real activity, while login/logout do not.
    learning_actions={"debate_create","ai_referee","argument_analysis","counterargument_analysis",
                      "fallacy_detected","case_review","presentation_upload","presentation_analysis",
                      "coaching","learning_plan_generated","learning_plan_completed"}
    logs=db.query(AuditLog).filter(AuditLog.user_id==user.id,AuditLog.action.in_(learning_actions)).all()
    activity_dates=sorted({x.created_at.date() for x in logs} | {x.created_at.date() for x in scores},reverse=True)
    today=datetime.now(timezone.utc).date()
    streak=0
    cursor=today
    if activity_dates and activity_dates[0] < cursor:
        cursor=activity_dates[0]
    for day in activity_dates:
        if day==cursor:
            streak += 1
            cursor -= timedelta(days=1)
        elif day < cursor:
            break

    debates=[s for s in scores if s.debate_id]
    presentations=[s for s in scores if s.presentation_id]
    arguments=[s for s in scores if s.source=="argument_analysis"]
    counters=[s for s in scores if s.source=="counterargument_analysis"]
    case_reviews=[s for s in scores if s.source=="case_review"]

    # Core debate skill profile.
    debate_skill_fields=[
        ("Argument Quality","argument_quality"),("Evidence","evidence_usage"),
        ("Logic","logical_consistency"),("Rebuttal","rebuttal_effectiveness"),
        ("Persuasiveness","persuasiveness")
    ]
    presentation_skill_fields=[
        ("Content","argument_quality"),("Explanation","rebuttal_effectiveness"),
        ("Clarity","clarity"),("Confidence","confidence"),("Communication","communication_skills")
    ]
    analysis_skill_fields=[
        ("Argument Analysis","argument_quality"),("Counterargument","rebuttal_effectiveness"),("Case Review","critical_thinking")
    ]

    def latest_avg(rows, fields):
        result={}
        for label,field in fields:
            vals=[getattr(s,field,None) for s in rows if getattr(s,field,None) is not None]
            if vals:
                result[label]=round(sum(float(v) for v in vals)/len(vals),1)
        return result

    debate_skills=latest_avg(debates,debate_skill_fields)
    presentation_skills=latest_avg(presentations,presentation_skill_fields)
    analysis_skills={
        "Argument Analysis": round(sum(float(s.argument_quality) for s in arguments)/len(arguments),1) if arguments else None,
        "Counterargument": round(sum(float(s.rebuttal_effectiveness) for s in counters)/len(counters),1) if counters else None,
        "Case Review": round(sum(float(s.critical_thinking) for s in case_reviews)/len(case_reviews),1) if case_reviews else None,
    }
    analysis_skills={k:v for k,v in analysis_skills.items() if v is not None}

    trajectory_fields={
        "debate":{"Argument Quality":"argument_quality","Evidence":"evidence_usage","Logic":"logical_consistency","Rebuttal":"rebuttal_effectiveness","Persuasiveness":"persuasiveness"},
        "presentation":{"Content":"argument_quality","Explanation":"rebuttal_effectiveness","Clarity":"clarity","Confidence":"confidence","Communication":"communication_skills"},
        "analysis":{"Argument Analysis":"argument_quality","Counterargument":"rebuttal_effectiveness","Case Review":"critical_thinking"}
    }
    skill_trajectories={d:{label:[{"date":x.created_at.isoformat(),"score":round(float(getattr(x,field)),1)} for x in scores if ((d=="debate" and x.debate_id) or (d=="presentation" and x.presentation_id) or (d=="analysis" and x.source in {"argument_analysis","counterargument_analysis","case_review"})) and getattr(x,field,None) is not None] for label,field in fields.items()} for d,fields in trajectory_fields.items()}

    combined=debate_skills.copy()
    # Dashboard core skill snapshot uses debate assessments first, with analysis fallback.
    for k,v in analysis_skills.items():
        combined.setdefault(k,v)

    measured=[(k,v) for k,v in combined.items() if isinstance(v,(int,float))]
    weakest=min(measured,key=lambda x:x[1]) if measured else None
    strongest=max(measured,key=lambda x:x[1]) if measured else None

    fallacy_frequency={}
    for row in db.query(AuditLog).filter(AuditLog.user_id==user.id,AuditLog.action=="fallacy_detected").all():
        for name in (row.details or {}).get("names",[]):
            if name:
                fallacy_frequency[name]=fallacy_frequency.get(name,0)+1

    # Progress means assessment coverage across the three learning domains, not an arbitrary score.
    domain_flags={
        "Debate":bool(debates),
        "Presentation":bool(presentations),
        "Analysis":bool(arguments or counters or case_reviews)
    }
    progress_count=sum(domain_flags.values())
    progress_percent=round(progress_count/3*100,1)

    # Improvement is only meaningful with two assessments in the same domain.
    def improvement(rows):
        if len(rows)<2: return None
        first=float(rows[0].overall); last=float(rows[-1].overall)
        if first==0: return None
        return round(((last-first)/first)*100,1)

    recent=sorted(
        [{"type":"debate" if s.debate_id else "presentation" if s.presentation_id else
          "argument analysis" if s.source=="argument_analysis" else "counterargument",
          "date":s.created_at.isoformat(),"score":round(float(s.overall),1),
          "source":s.source} for s in scores] +
        [{"type":"activity","date":x.created_at.isoformat(),"score":None,"source":x.action}
         for x in logs],
        key=lambda x:x["date"], reverse=True
    )[:8]

    def series(rows, field="overall"):
        return [{
            "date":s.created_at.isoformat(),
            "label":s.created_at.strftime("%d %b %Y, %H:%M"),
            "overall":round(float(getattr(s,field)),1)
        } for s in rows]

    # Achievements are earned from actual milestones.
    achievements=[]
    total_assessments=len(scores)
    if total_assessments>=1: achievements.append({"title":"First assessment","earned":True})
    if total_assessments>=5: achievements.append({"title":"Five real assessments","earned":True})
    if len(debates)>=3: achievements.append({"title":"Three completed AI debates","earned":True})
    if len(presentations)>=2: achievements.append({"title":"Two analyzed presentations","earned":True})
    if streak>=3: achievements.append({"title":"3-day learning streak","earned":True})

    if not scores:
        return {
            "data_source":"REAL USER DATA — no assessments yet",
            "overall_score":None,"progress":{"completed_domains":0,"total_domains":3,"percent":0,"definition":"Assessment coverage across Debate, Presentation and Analysis."},
            "debate_score_trend":[],"presentation_score_trend":[],"argument_score_trend":[],"counterargument_score_trend":[],
            "skills":{},"skill_domains":{"debate":{},"presentation":{},"analysis":{}},
            "fallacy_frequency":{},"speech_metrics":{},"improvement_rate":None,
            "improvement_by_domain":{"debate":None,"presentation":None,"argument":None,"counterargument":None},
            "practice_frequency":len(logs),"daily_streak":streak,"strongest_skill":None,"weakest_skill":None,
            "today_goal":"Complete your first real assessment","completed_debates":0,"completed_presentations":0,
            "recent_activity":recent,"achievements":achievements,
            "recommendations":["Start your first debate","Analyze your first argument","Upload a presentation"]
        }

    latest=scores[-1]
    return {
        "data_source":"REAL USER DATA",
        "overall_score":round(float(latest.overall),1),
        "progress":{"completed_domains":progress_count,"total_domains":3,"percent":progress_percent,
                    "definition":"Assessment coverage across Debate, Presentation and Analysis."},
        "debate_score_trend":series(debates),
        "presentation_score_trend":series(presentations),
        "argument_score_trend":series(arguments),
        "counterargument_score_trend":series(counters),
        "skills":combined,
        "skill_domains":{"debate":debate_skills,"presentation":presentation_skills,"analysis":analysis_skills},
        "skill_trajectories":skill_trajectories,
        "fallacy_frequency":fallacy_frequency,"speech_metrics":{},
        "improvement_rate":improvement(scores),
        "improvement_by_domain":{
            "debate":improvement(debates),"presentation":improvement(presentations),
            "argument":improvement(arguments),"counterargument":improvement(counters)
        },
        "daily_streak":streak,
        "strongest_skill":strongest[0] if strongest else None,
        "weakest_skill":weakest[0] if weakest else None,
        "today_goal":f"Practice {weakest[0]}" if weakest else "Complete another assessment",
        "practice_frequency":len(logs),
        "completed_debates":len(debates),"completed_presentations":len(presentations),
        "recent_activity":recent,"achievements":achievements,
        "recommendations":[
            f"Practice {weakest[0]}" if weakest else "Complete another assessment",
            f"Keep using {strongest[0]}" if strongest else "Build your first skill baseline",
            "Open AI Coaching for an evidence-based next step"
        ]
    }


@app.post("/api/coaching")
async def coaching(payload:CoachQuestion,user=Depends(current_user),db:Session=Depends(get_db)):
    a=analytics(user,db)
    prompt=f"""User question: {payload.question}
Actual learner analytics: {json.dumps(a)}
Return JSON with answer,next_steps,focus_skill,reason,evidence.
Use the actual analytics. Do not invent scores, activities, or achievements. If evidence is insufficient,
say so. The focus skill should be the lowest measured skill when the question asks what to work on."""
    r=await provider_manager.generate("You are a personalized AI debate coach. Be specific and evidence-based.",prompt,json_mode=True)
    try:
        data=json.loads(r["text"])
    except Exception:
        data={"answer":r["text"],"next_steps":["Complete another real assessment so coaching can become more specific."],
              "focus_skill":a.get("weakest_skill"),"reason":"Based on the stored learner analytics.",
              "evidence":f"Current weakest measured skill: {a.get('weakest_skill') or 'not enough data'}"}
    data["provider"]=r["provider"]
    audit(db,user,"coaching",{"provider":r["provider"],"focus_skill":a.get("weakest_skill")})
    db.commit()
    return data


def serialize_plan(p):
    return {"id":p.id,"title":p.title,"days":p.days or [],"status":p.status,"created_at":p.created_at.isoformat()}


@app.get("/api/coaching/plan")
def get_plan(user=Depends(current_user),db:Session=Depends(get_db)):
    p=db.query(LearningPlan).filter(
        LearningPlan.user_id==user.id,
        LearningPlan.status=="active"
    ).order_by(LearningPlan.created_at.desc()).first()
    return serialize_plan(p) if p else {"id":None,"title":"7-Day Debate Improvement Plan","days":[],"status":"none"}


@app.post("/api/coaching/plan")
async def plan(user=Depends(current_user),db:Session=Depends(get_db)):
    a=analytics(user,db)
    if a.get("overall_score") is None:
        raise HTTPException(400,"Complete a real assessment before generating a learning plan.")

    domains=a.get("skill_domains",{})
    candidates=[]
    for domain,skills in domains.items():
        for skill,value in skills.items():
            if isinstance(value,(int,float)):
                candidates.append((float(value),skill,domain))
    candidates.sort(key=lambda x:x[0])
    focuses=[]
    for value,skill,domain in candidates:
        if skill not in [x["focus"] for x in focuses]:
            focuses.append({"focus":skill,"domain":domain,"score":round(value,1)})
        if len(focuses)>=3: break

    if not focuses:
        raise HTTPException(400,"There is not enough skill data to generate an adaptive plan.")

    activities={
        "debate":"AI Debate",
        "presentation":"Presentation Lab",
        "analysis":"Argument Analysis"
    }
    durations=[10,10,15,15,20,15,20]
    days=[]
    for i in range(7):
        target=focuses[i % len(focuses)]
        activity=activities[target["domain"]]
        generated_days.append({
            "day":i+1,
            "focus":target["focus"],
            "domain":target["domain"],
            "score":target["score"],
            "activity":activity,
            "duration_minutes":durations[i],
            "reason":f"Your stored {target['domain']} assessments currently measure {target['focus']} at {target['score']}/100.",
            "success_check":f"Complete the {activity} and review the {target['focus']} feedback.",
            "completed":False
        })

    days = payload.days or generated_days

    db.query(LearningPlan).filter(LearningPlan.user_id==user.id,LearningPlan.status=="active").update({"status":"superseded"})
    p=LearningPlan(user_id=user.id,title="7-Day Adaptive Improvement Plan",days=days,status="active")
    db.add(p);db.commit()
    audit(db,user,"learning_plan_generated",{"plan_id":p.id,"focuses":[x["focus"] for x in focuses]});db.commit()
    return serialize_plan(p)


@app.patch("/api/coaching/plan/{plan_id}/day/{day}")
def complete_plan_day(plan_id:int,day:int,user=Depends(current_user),db:Session=Depends(get_db)):
    p=db.get(LearningPlan,plan_id)
    if not p or p.user_id!=user.id: raise HTTPException(404,"Learning plan not found")
    if day<1 or day>7: raise HTTPException(400,"Day must be between 1 and 7")
    days=list(p.days or [])
    target=next((x for x in days if int(x.get("day",0))==day),None)
    if not target: raise HTTPException(404,"Plan day not found")
    target["completed"]=not bool(target.get("completed"))
    p.days=days
    if days and all(bool(x.get("completed")) for x in days):
        p.status="completed"
        audit(db,user,"learning_plan_completed",{"plan_id":p.id})
    db.commit()
    return serialize_plan(p)


@app.get("/api/friends/search")
def search_friends(q:str="",user=Depends(current_user),db:Session=Depends(get_db)):
    return [user_dict(u) for u in db.query(User).filter(User.id!=user.id,User.name.ilike(f"%{q}%")).limit(20).all()]
@app.post("/api/friends/request")
def friend_request(payload:FriendRequestIn,user=Depends(current_user),db=Depends(get_db)):
    if not db.get(User,payload.user_id): raise HTTPException(404,"User not found")
    f=Friendship(requester_id=user.id,addressee_id=payload.user_id,status="pending");db.add(f);db.commit();notify(db,payload.user_id,"New friend request",f"{user.name} sent you a friend request.","friend_request");return {"status":"pending"}
@app.get("/api/friends/requests")
def friend_requests(user=Depends(current_user),db:Session=Depends(get_db)):
    rows=db.query(Friendship).filter(Friendship.addressee_id==user.id,Friendship.status=="pending").all()
    return [{"id":f.id,"from":user_dict(db.get(User,f.requester_id)),"status":f.status,"created_at":f.created_at.isoformat()} for f in rows]

@app.get("/api/friends")
def friends(user=Depends(current_user),db:Session=Depends(get_db)):
    fs=db.query(Friendship).filter(((Friendship.requester_id==user.id)|(Friendship.addressee_id==user.id)),Friendship.status=="accepted").all();out=[]
    for f in fs: out.append(user_dict(db.get(User,f.addressee_id if f.requester_id==user.id else f.requester_id)))
    return out
@app.post("/api/friends/{friendship_id}/{action}")
def friend_action(friendship_id:int,action:str,user=Depends(current_user),db=Depends(get_db)):
    f=db.get(Friendship,friendship_id)
    if not f or f.addressee_id!=user.id: raise HTTPException(404,"Request not found")
    if action not in {"accept","decline"}: raise HTTPException(400,"Invalid action")
    f.status="accepted" if action=="accept" else "declined";db.commit();return {"status":f.status}

@app.post("/api/invitations")
def invite(payload:InvitationIn,user=Depends(current_user),db=Depends(get_db)):
    d=db.get(Debate,payload.debate_id); recipient=db.get(User,payload.recipient_id)
    if not d or not recipient: raise HTTPException(404,"Debate or recipient not found")
    if not db.query(DebateParticipant).filter(DebateParticipant.debate_id==d.id,DebateParticipant.user_id==user.id).first(): raise HTTPException(403,"You are not a participant in this debate")
    if payload.recipient_id==user.id: raise HTTPException(400,"You cannot invite yourself")
    if not db.query(Friendship).filter(Friendship.status=="accepted",((Friendship.requester_id==user.id)&(Friendship.addressee_id==recipient.id))|((Friendship.requester_id==recipient.id)&(Friendship.addressee_id==user.id))).first(): raise HTTPException(400,"You can invite accepted friends only")
    i=Invitation(debate_id=d.id,sender_id=user.id,recipient_id=recipient.id);db.add(i);db.commit();notify(db,recipient.id,"Debate invitation",f"{user.name} invited you to a live debate.","debate_invitation");return {"id":i.id,"status":"pending","join_code":d.join_code}
@app.get("/api/invitations")
def invitations(user=Depends(current_user),db:Session=Depends(get_db)):
    rows=db.query(Invitation).filter((Invitation.recipient_id==user.id)|(Invitation.sender_id==user.id)).order_by(Invitation.created_at.desc()).limit(50).all()
    return [{"id":i.id,"debate_id":i.debate_id,"sender":user_dict(db.get(User,i.sender_id)),"recipient":user_dict(db.get(User,i.recipient_id)),"status":i.status,"position":(db.get(Debate,i.debate_id).position_b if db.get(Debate,i.debate_id) else "against"),"created_at":i.created_at.isoformat()} for i in rows]

@app.post("/api/invitations/{inv_id}/{action}")
def invitation_action(inv_id:int,action:str,user=Depends(current_user),db=Depends(get_db)):
    i=db.get(Invitation,inv_id)
    if not i or i.recipient_id!=user.id: raise HTTPException(404,"Invitation not found")
    i.status="accepted" if action=="accept" else "declined"
    if action=="accept" and not db.query(DebateParticipant).filter(DebateParticipant.debate_id==i.debate_id,DebateParticipant.user_id==user.id).first():
        d=db.get(Debate,i.debate_id); db.add(DebateParticipant(debate_id=i.debate_id,user_id=user.id,position=d.position_b if d else "against"))
        if d: d.status="active"
        notify(db,i.sender_id,"Debate invitation accepted",f"{user.name} accepted your live debate invitation.","debate_invitation")
    db.commit(); d=db.get(Debate,i.debate_id); return {"status":i.status,"debate_id":i.debate_id,"join_code":d.join_code if d else None}

@app.get("/api/notifications")
def notifications(user=Depends(current_user),db=Depends(get_db)):
    ns=db.query(Notification).filter(Notification.user_id==user.id).order_by(Notification.created_at.desc()).limit(50).all();return [{"id":n.id,"title":n.title,"message":n.message,"type":n.type,"read":n.read,"created_at":n.created_at.isoformat()} for n in ns]
@app.post("/api/notifications/{nid}/read")
def mark_notification(nid:int,user=Depends(current_user),db=Depends(get_db)):
    n=db.get(Notification,nid)
    if not n or n.user_id!=user.id: raise HTTPException(404,"Notification not found")
    n.read=True;db.commit();return {"status":"read"}
@app.post("/api/notifications/read-all")
def read_all(user=Depends(current_user),db=Depends(get_db)):
    db.query(Notification).filter(Notification.user_id==user.id,Notification.read==False).update({"read":True});db.commit();return {"status":"ok"}

@app.get("/api/rankings")
def rankings(user=Depends(current_user),db:Session=Depends(get_db)):
    rows=db.query(User,func.avg(Score.overall).label("avg")).outerjoin(Score,Score.user_id==User.id).group_by(User.id).order_by(func.avg(Score.overall).desc()).limit(20).all()
    return [{"rank":i+1,"name":u.name,"score":round(avg,1)} for i,(u,avg) in enumerate(rows) if avg is not None]

@app.get("/api/coach/students")
def coach_students(user=Depends(require_roles("coach")),db:Session=Depends(get_db)):
    assigned=db.query(CoachAssignment).filter(CoachAssignment.coach_id==user.id).all(); ids=[x.learner_id for x in assigned]
    users=db.query(User).filter(User.id.in_(ids)).all() if ids else []
    return [user_dict(u) for u in users]
@app.get("/api/educator/classes")
def educator_classes(user=Depends(require_roles("educator")),db:Session=Depends(get_db)):
    cs=db.query(Class).filter(Class.educator_id==user.id).all();return [{"id":c.id,"name":c.name,"description":c.description} for c in cs]
@app.get("/api/role-dashboard")
def role_dashboard(user=Depends(current_user),db:Session=Depends(get_db)):
    if user.role=="learner":
        a=analytics(user,db)
        return {"role":"learner","name":user.name,"metrics":a,"owned":{"debates":db.query(Debate).filter(Debate.created_by==user.id).count(),"presentations":db.query(Presentation).filter(Presentation.user_id==user.id).count(),"friends":len(friends(user,db))}}
    if user.role=="coach":
        assignments=db.query(CoachAssignment).filter(CoachAssignment.coach_id==user.id).all()
        rows=[]
        for x in assignments:
            learner=db.get(User,x.learner_id); scores=db.query(Score).filter(Score.user_id==x.learner_id).order_by(Score.created_at.desc()).limit(2).all()
            rows.append({"id":learner.id,"name":learner.name,"email":learner.email,"latest_score":scores[0].overall if scores else None,"previous_score":scores[1].overall if len(scores)>1 else None,"needs_review":db.query(Presentation).filter(Presentation.user_id==learner.id,Presentation.status=="analyzed").count()})
        return {"role":"coach","name":user.name,"learners":rows,"counts":{"assigned":len(rows),"pending_reviews":sum(x["needs_review"] for x in rows)}}
    if user.role=="educator":
        classes=db.query(Class).filter(Class.educator_id==user.id).all(); result=[]
        for c in classes:
            members=db.query(ClassMembership).filter(ClassMembership.class_id==c.id).all(); ids=[m.user_id for m in members]
            scores=db.query(Score).filter(Score.user_id.in_(ids)).all() if ids else []
            result.append({"id":c.id,"name":c.name,"description":c.description,"students":len(ids),"average_score":round(sum(s.overall for s in scores)/len(scores),1) if scores else None})
        return {"role":"educator","name":user.name,"classes":result}
    return {"role":"admin","name":user.name,"total_users":db.query(User).count(),"total_debates":db.query(Debate).count(),"total_presentations":db.query(Presentation).count(),"ai_requests":db.query(AuditLog).filter(AuditLog.action.in_(["argument_analysis","debate_create","ai_referee"])).count()}

class CoachAssignmentIn(BaseModel):
    learner_id:int

@app.get("/api/coach/insights")
def coach_insights(user=Depends(require_roles("coach")),db:Session=Depends(get_db)):
    assignments=db.query(CoachAssignment).filter(CoachAssignment.coach_id==user.id).all()
    learners=[]; skill_totals={k:[] for k in skillKeys} if False else {}
    for assignment in assignments:
        learner=db.get(User,assignment.learner_id)
        scores=db.query(Score).filter(Score.user_id==assignment.learner_id).order_by(Score.created_at.desc()).all()
        latest=scores[0] if scores else None
        gaps=[]
        if latest:
            fields=[("Argument quality","argument_quality"),("Evidence","evidence_usage"),("Logic","logical_consistency"),("Rebuttal","rebuttal_effectiveness"),("Communication","communication_skills")]
            for label,field in fields:
                value=float(getattr(latest,field) or 0)
                if value<75:
                    gaps.append({"skill":label,"score":round(value,1),"coaching":f"Practice {label.lower()} with targeted feedback."})
        learners.append({"id":learner.id,"name":learner.name,"email":learner.email,"latest_score":round(latest.overall,1) if latest else None,"gaps":gaps,"scores_count":len(scores)})
    assessed=[x for x in learners if x["latest_score"] is not None]
    score_values=[x["latest_score"] for x in assessed]
    skill_values={"Argument quality":[],"Evidence":[],"Logic":[],"Rebuttal":[],"Communication":[]}
    field_map={"Argument quality":"argument_quality","Evidence":"evidence_usage","Logic":"logical_consistency","Rebuttal":"rebuttal_effectiveness","Communication":"communication_skills"}
    for assignment in assignments:
        latest=db.query(Score).filter(Score.user_id==assignment.learner_id).order_by(Score.created_at.desc()).first()
        if latest:
            for label,field in field_map.items(): skill_values[label].append(float(getattr(latest,field) or 0))
    averages={k:round(sum(v)/len(v),1) for k,v in skill_values.items() if v}
    return {"summary":{"learners":len(learners),"assessed":len(assessed),"average_score":round(sum(score_values)/len(score_values),1) if score_values else None,"needs_coaching":sum(1 for x in learners if x["gaps"]),"skill_averages":averages},"learners":learners}


class CoachPlanIn(BaseModel):
    learner_id: int
    title: str = "Coach Improvement Plan"
    days: list = Field(default_factory=list)


def coach_assignment_for(coach_id, learner_id, db):
    return db.query(CoachAssignment).filter(
        CoachAssignment.coach_id == coach_id,
        CoachAssignment.learner_id == learner_id
    ).first()


@app.get("/api/coach/coaching/{learner_id}")
def coach_coaching_learner(
    learner_id: int,
    user=Depends(require_roles("coach")),
    db: Session = Depends(get_db)
):
    assignment = coach_assignment_for(user.id, learner_id, db)
    if not assignment:
        raise HTTPException(404, "Learner is not assigned to this coach")

    learner = db.get(User, learner_id)
    if not learner or learner.role != "learner":
        raise HTTPException(404, "Learner not found")

    scores = db.query(Score).filter(
        Score.user_id == learner_id
    ).order_by(Score.created_at.desc()).all()

    history = [{
        "id": s.id,
        "overall": round(float(s.overall), 1),
        "argument_quality": round(float(s.argument_quality or 0), 1),
        "evidence_usage": round(float(s.evidence_usage or 0), 1),
        "logical_consistency": round(float(s.logical_consistency or 0), 1),
        "rebuttal_effectiveness": round(float(s.rebuttal_effectiveness or 0), 1),
        "communication_skills": round(float(s.communication_skills or 0), 1),
        "critical_thinking": round(float(s.critical_thinking or 0), 1),
        "persuasiveness": round(float(s.persuasiveness or 0), 1),
        "clarity": round(float(s.clarity), 1) if s.clarity is not None else None,
        "confidence": round(float(s.confidence), 1) if s.confidence is not None else None,
        "source": s.source,
        "created_at": s.created_at.isoformat()
    } for s in scores]

    latest = scores[0] if scores else None

    fields = [
        ("Argument quality", "argument_quality"),
        ("Evidence", "evidence_usage"),
        ("Logic", "logical_consistency"),
        ("Rebuttal", "rebuttal_effectiveness"),
        ("Communication", "communication_skills"),
        ("Critical thinking", "critical_thinking"),
        ("Persuasiveness", "persuasiveness"),
    ]

    gaps = []
    if latest:
        for label, field in fields:
            value = float(getattr(latest, field) or 0)
            if value < 75:
                gaps.append({
                    "skill": label,
                    "score": round(value, 1),
                    "recommendation": f"Targeted practice for {label.lower()}."
                })

    gaps.sort(key=lambda x: x["score"])

    plan = db.query(LearningPlan).filter(
        LearningPlan.user_id == learner_id,
        LearningPlan.status == "active"
    ).order_by(LearningPlan.created_at.desc()).first()

    return {
        "learner": {
            "id": learner.id,
            "name": learner.name,
            "email": learner.email
        },
        "assessment_count": len(scores),
        "latest_score": round(float(latest.overall), 1) if latest else None,
        "history": history,
        "gaps": gaps,
        "plan": serialize_plan(plan) if plan else None
    }


@app.post("/api/coach/coaching/plan")
async def coach_create_plan(
    payload: CoachPlanIn,
    user=Depends(require_roles("coach")),
    db: Session = Depends(get_db)
):
    assignment = coach_assignment_for(user.id, payload.learner_id, db)
    if not assignment:
        raise HTTPException(404, "Learner is not assigned to this coach")

    learner = db.get(User, payload.learner_id)
    if not learner or learner.role != "learner":
        raise HTTPException(404, "Learner not found")

    scores = db.query(Score).filter(
        Score.user_id == learner.id
    ).order_by(Score.created_at.desc()).all()

    if not scores:
        raise HTTPException(
            400,
            "This learner has no real assessment yet. Complete an assessment before creating a coaching plan."
        )

    latest = scores[0]

    fields = [
        ("Argument quality", "argument_quality"),
        ("Evidence", "evidence_usage"),
        ("Logic", "logical_consistency"),
        ("Rebuttal", "rebuttal_effectiveness"),
        ("Communication", "communication_skills"),
        ("Critical thinking", "critical_thinking"),
        ("Persuasiveness", "persuasiveness"),
    ]

    gaps = []
    for label, field in fields:
        value = float(getattr(latest, field) or 0)
        if value < 75:
            gaps.append((value, label, field))

    gaps.sort(key=lambda x: x[0])

    if not gaps:
        gaps = [(float(latest.overall), "Overall performance", "overall")]

    selected = gaps[:3]

    generated_days = []
    durations = [10, 15, 15, 20, 20, 15, 20]

    for i in range(7):
        value, skill, field = selected[i % len(selected)]

        if field == "argument_quality":
            activity = "Argument Analysis"
        elif field == "evidence_usage":
            activity = "Evidence Practice"
        elif field == "logical_consistency":
            activity = "Logic Practice"
        elif field == "rebuttal_effectiveness":
            activity = "Counterargument Practice"
        elif field == "communication_skills":
            activity = "Presentation Lab"
        elif field == "critical_thinking":
            activity = "Argument Analysis"
        elif field == "persuasiveness":
            activity = "Debate Practice"
        else:
            activity = "Mixed Debate Practice"

        generated_days.append({
            "day": i + 1,
            "focus": skill,
            "score_baseline": round(value, 1),
            "activity": activity,
            "duration_minutes": durations[i],
            "reason": f"Based on the learner's latest measured score of {round(value, 1)} in {skill}."
        })

    days = payload.days or generated_days

    db.query(LearningPlan).filter(
        LearningPlan.user_id == learner.id,
        LearningPlan.status == "active"
    ).update({"status": "superseded"})

    plan = LearningPlan(
        user_id=learner.id,
        title=payload.title or "Coach Improvement Plan",
        days=days,
        status="active"
    )

    db.add(plan)
    db.commit()
    db.refresh(plan)

    notify(
        db,
        learner.id,
        "New coaching plan",
        f"{user.name} created a coaching plan based on your latest measured skills.",
        "coach_plan"
    )

    audit(
        db,
        user,
        "coach_plan_created",
        {
            "learner_id": learner.id,
            "plan_id": plan.id,
            "focuses": [x["focus"] for x in days]
        }
    )

    db.commit()

    return serialize_plan(plan)


@app.get("/api/educator/students")
def educator_students(user=Depends(require_roles("educator")),db:Session=Depends(get_db)):
    classes=db.query(Class).filter(Class.educator_id==user.id).all()
    membership_rows=[]
    for c in classes:
        for m in db.query(ClassMembership).filter(ClassMembership.class_id==c.id).all(): membership_rows.append((m.user_id,c.name))
    by_user={}
    for uid,cname in membership_rows: by_user.setdefault(uid,[]).append(cname)
    out=[]
    for uid,cnames in by_user.items():
        learner=db.get(User,uid); scores=db.query(Score).filter(Score.user_id==uid).order_by(Score.created_at.desc()).limit(2).all()
        out.append({"id":uid,"name":learner.name,"email":learner.email,"classes":cnames,"latest_score":round(scores[0].overall,1) if scores else None,"change":round(scores[0].overall-scores[1].overall,1) if len(scores)>1 else None})
    return {"students":out}

@app.get("/api/educator/insights")
def educator_insights(user=Depends(require_roles("educator")),db:Session=Depends(get_db)):
    classes=db.query(Class).filter(Class.educator_id==user.id).all(); rows=[]; user_ids=set()
    for c in classes:
        ids=[m.user_id for m in db.query(ClassMembership).filter(ClassMembership.class_id==c.id).all()]; user_ids.update(ids)
        scores=db.query(Score).filter(Score.user_id.in_(ids)).all() if ids else []
        rows.append({"id":c.id,"name":c.name,"students":len(ids),"assessed":len(set(s.user_id for s in scores)),"average_score":round(sum(s.overall for s in scores)/len(scores),1) if scores else None})
    latest=[]
    for uid in user_ids:
        learner=db.get(User,uid); scores=db.query(Score).filter(Score.user_id==uid).order_by(Score.created_at.desc()).first()
        if scores: latest.append((learner,scores))
    latest.sort(key=lambda x:x[1].overall,reverse=True)
    rankings=[]
    for i,(learner,score) in enumerate(latest,1):
        cnames=[c.name for c in classes if db.query(ClassMembership).filter(ClassMembership.class_id==c.id,ClassMembership.user_id==learner.id).first()]
        rankings.append({"rank":i,"id":learner.id,"name":learner.name,"score":round(score.overall,1),"classes":cnames})
    fields=[("Argument quality","argument_quality"),("Evidence","evidence_usage"),("Logic","logical_consistency"),("Rebuttal","rebuttal_effectiveness"),("Communication","communication_skills")]
    skill_avgs={}
    for label,field in fields:
        vals=[float(getattr(score,field) or 0) for _,score in latest]
        if vals: skill_avgs[label]=round(sum(vals)/len(vals),1)
    vals=[score.overall for _,score in latest]
    return {"summary":{"classes":len(classes),"learners":len(user_ids),"assessed":len(latest),"average_score":round(sum(vals)/len(vals),1) if vals else None,"skill_averages":skill_avgs},"classes":rows,"rankings":rankings}

@app.get("/api/admin/users")
def admin_users(user=Depends(require_roles("admin")),db:Session=Depends(get_db)):
    return [{"id":u.id,"name":u.name,"email":u.email,"role":u.role,"created_at":u.created_at.isoformat()} for u in db.query(User).order_by(User.created_at.desc()).all()]

@app.post("/api/coach/assign")
def coach_assign(payload:CoachAssignmentIn,user=Depends(require_roles("coach")),db:Session=Depends(get_db)):
    learner=db.get(User,payload.learner_id)
    if not learner or learner.role!="learner": raise HTTPException(404,"Learner not found")
    if db.query(CoachAssignment).filter(CoachAssignment.coach_id==user.id,CoachAssignment.learner_id==learner.id).first(): raise HTTPException(409,"Learner already assigned")
    row=CoachAssignment(coach_id=user.id,learner_id=learner.id);db.add(row);db.commit();notify(db,learner.id,"Coach assigned",f"{user.name} is now your debate coach.","coach_assignment");return {"id":row.id,"learner":user_dict(learner)}

class ClassCreateIn(BaseModel):
    name:str=Field(min_length=2,max_length=150)
    description:str=""
@app.post("/api/educator/classes")
def create_class(payload:ClassCreateIn,user=Depends(require_roles("educator")),db:Session=Depends(get_db)):
    c=Class(educator_id=user.id,name=payload.name,description=payload.description);db.add(c);db.commit();return {"id":c.id,"name":c.name,"description":c.description}
class ClassMemberIn(BaseModel):
    user_id:int
@app.post("/api/educator/classes/{class_id}/members")
def add_class_member(class_id:int,payload:ClassMemberIn,user=Depends(require_roles("educator")),db:Session=Depends(get_db)):
    c=db.get(Class,class_id); learner=db.get(User,payload.user_id)
    if not c or c.educator_id!=user.id: raise HTTPException(404,"Class not found")
    if not learner or learner.role!="learner": raise HTTPException(404,"Learner not found")
    if db.query(ClassMembership).filter(ClassMembership.class_id==class_id,ClassMembership.user_id==learner.id).first(): raise HTTPException(409,"Learner already in class")
    row=ClassMembership(class_id=class_id,user_id=learner.id);db.add(row);db.commit();notify(db,learner.id,"Added to class",f"{user.name} added you to {c.name}.","class_membership");return {"status":"added"}

@app.get("/api/admin/overview")
def admin_overview(user=Depends(require_roles("admin")),db:Session=Depends(get_db)):
    pg="ok"
    try: db.execute(__import__('sqlalchemy').text("SELECT 1"))
    except Exception as e: pg=f"error: {e}"
    return {"total_users":db.query(User).count(),"active_users":db.query(User).count(),"debates":db.query(Debate).count(),"total_presentations":db.query(Presentation).count(),"ai_requests":db.query(AuditLog).filter(AuditLog.action.in_(["argument_analysis","debate_create","ai_referee"])).count(),"postgres":pg,"mongodb":"configured" if settings.mongodb_uri else "not_configured","groq_configured":bool(settings.groq_api_key),"gemini_configured":bool(settings.gemini_api_key),"ollama_required":False}
@app.get("/api/admin/audit")
def admin_audit(user=Depends(require_roles("admin")),db:Session=Depends(get_db)):
    return [{"id":a.id,"action":a.action,"user_id":a.user_id,"details":a.details,"created_at":a.created_at.isoformat()} for a in db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()]

def learner_report_data(kind,user,db):
    scores=db.query(Score).filter(Score.user_id==user.id).order_by(Score.created_at.asc()).all()
    if kind=="debate":
        rows=[s for s in scores if s.debate_id]
        latest=rows[-1] if rows else None
        if not latest: return {"generated_for":user.name,"title":"Debate Report","sections":[{"title":"Status","items":[{"label":"Assessment","value":"No completed debate assessment yet."}]}]}
        d=db.get(Debate,latest.debate_id)
        msgs=db.query(DebateMessage).filter(DebateMessage.debate_id==d.id,DebateMessage.user_id==user.id,DebateMessage.role=="user").order_by(DebateMessage.created_at.asc()).all()
        fields=[("Argument quality",latest.argument_quality),("Evidence",latest.evidence_usage),("Logic",latest.logical_consistency),("Rebuttal",latest.rebuttal_effectiveness),("Communication",latest.communication_skills)]
        strongest=sorted(fields,key=lambda x:x[1],reverse=True)[:2]
        weakest=sorted(fields,key=lambda x:x[1])[:2]
        return {"generated_for":user.name,"title":"Debate Report","sections":[
            {"title":"Debate","items":[{"label":"Topic","value":d.topic},{"label":"Format","value":FORMAT_SPECS.get(d.format,{}).get("label",d.format)},{"label":"Your position","value":next((p.position for p in db.query(DebateParticipant).filter(DebateParticipant.debate_id==d.id).all() if p.user_id==user.id),d.position_a)},{"label":"Completed","value":latest.created_at.strftime("%d %b %Y, %H:%M")}]},
            {"title":"Performance","items":[{"label":"Overall","value":f"{latest.overall:.1f}/100"},{"label":"Argument quality","value":f"{latest.argument_quality:.1f}/100"},{"label":"Evidence","value":f"{latest.evidence_usage:.1f}/100"},{"label":"Logic","value":f"{latest.logical_consistency:.1f}/100"},{"label":"Rebuttal","value":f"{latest.rebuttal_effectiveness:.1f}/100"},{"label":"Communication","value":f"{latest.communication_skills:.1f}/100"}]},
            {"title":"What you actually argued","text":"\\n".join(f"• {m.text}" for m in msgs) or "No learner transcript was stored."},
            {"title":"Strengths","text":"Strongest measured dimensions: "+", ".join(f"{k} ({v:.1f}/100)" for k,v in strongest)},
            {"title":"Weaknesses","text":"Lowest measured dimensions: "+", ".join(f"{k} ({v:.1f}/100)" for k,v in weakest)},
            {"title":"Fallacies and missed opportunities","text":"Fallacies are not inferred from the score record. Review the stored transcript in Fallacy Detection for explicit reasoning-error analysis. Missed opportunities should be checked against the opponent responses and your rebuttals."},
            {"title":"Coaching","text":"Use the lowest measured dimension above as the next practice focus. Review the debate transcript before your next attempt."}
        ]}
    if kind=="presentation":
        rows=[s for s in scores if s.presentation_id]
        latest=rows[-1] if rows else None
        p=db.get(Presentation,latest.presentation_id) if latest else db.query(Presentation).filter(Presentation.user_id==user.id,Presentation.status=="analyzed").order_by(Presentation.created_at.desc()).first()
        if not p: return {"generated_for":user.name,"title":"Presentation Report","sections":[{"title":"Status","items":[{"label":"Assessment","value":"No completed presentation analysis yet."}]}]}
        slide_items=[]
        for slide in (p.slide_data or []):
            speech=slide.get("speech")
            slide_items.append({"label":f"Slide {slide.get('slide_number')}: {slide.get('title','Untitled')}","value":f"Spoken: {speech[:180]}" if speech else "Speech unavailable — no speech was captured."})
        delivery_items=[
            {"label":"Confidence","value":f"{latest.confidence:.1f}/100" if latest and latest.confidence is not None else "Unavailable — insufficient speech"},
            {"label":"Clarity","value":f"{latest.clarity:.1f}/100" if latest and latest.clarity is not None else "Unavailable — insufficient speech"},
            {"label":"Communication","value":f"{latest.communication_skills:.1f}/100" if latest else "Unavailable — insufficient speech"},
        ]
        return {"generated_for":user.name,"title":"Presentation Report","sections":[
            {"title":"Presentation","items":[{"label":"File","value":p.filename},{"label":"Slides","value":str(p.slide_count)},{"label":"Performance score","value":f"{p.overall_score:.1f}/100" if p.overall_score is not None else "Unavailable — insufficient speech"},{"label":"Status","value":p.status}]},
            {"title":"Delivery","items":delivery_items},
            {"title":"Slide-by-slide evidence","items":slide_items},
            {"title":"Coaching","text":"Review the weakest slides and capture your actual speech so delivery feedback can be evidence-based."}
        ]}
    # Performance overview
    if not scores:
        return {"generated_for":user.name,"title":"Performance Report","sections":[{"title":"Status","items":[{"label":"Assessment","value":"No completed assessments yet."}]}]}
    latest=scores[-1]
    def report_change(rows):
        if len(rows)<2 or not rows[0].overall: return "Not enough history"
        return f"{rows[0].overall:.1f} → {rows[-1].overall:.1f} ({rows[-1].overall-rows[0].overall:+.1f} points)"
    debates=[x for x in scores if x.debate_id]
    presentations=[x for x in scores if x.presentation_id]
    arguments=[x for x in scores if x.source=="argument_analysis"]
    counters=[x for x in scores if x.source=="counterargument_analysis"]
    return {"generated_for":user.name,"title":"Performance Report","sections":[
        {"title":"Overview","items":[
            {"label":"Latest assessment","value":f"{latest.overall:.1f}/100"},
            {"label":"Assessment coverage","value":f"{len(set(('debate' if x.debate_id else 'presentation' if x.presentation_id else 'analysis') for x in scores))}/3 domains"},
            {"label":"Debate history","value":report_change(debates)},
            {"label":"Presentation history","value":report_change(presentations)},
            {"label":"Argument history","value":report_change(arguments)},
            {"label":"Counterargument history","value":report_change(counters)}
        ]},
        {"title":"Skill profile","items":[
            {"label":"Argument quality","value":f"{latest.argument_quality:.1f}/100"},
            {"label":"Logic","value":f"{latest.logical_consistency:.1f}/100"},
            {"label":"Evidence","value":f"{latest.evidence_usage:.1f}/100"},
            {"label":"Rebuttal","value":f"{latest.rebuttal_effectiveness:.1f}/100"},
            {"label":"Communication","value":f"{latest.communication_skills:.1f}/100"}
        ]},
        {"title":"Recent activity","items":[{"label":x["type"],"value":x.get("score") if x.get("score") is not None else "Activity"} for x in analytics(user,db).get("recent_activity",[])[:8]]},
        {"title":"Coaching focus","text":f"Current weakest measured skill: {analytics(user,db).get('weakest_skill') or 'Not enough comparable assessment evidence'}. Recommendations are derived from stored activity only."}
    ]}

@app.get("/api/reports/{kind}/data")
def report_data(kind:str,user=Depends(current_user),db:Session=Depends(get_db)):
    if user.role=="learner":
        if kind not in {"performance","debate","presentation"}: raise HTTPException(400,"Unsupported report")
        return learner_report_data(kind,user,db)
    return {"generated_for":user.name,"title":f"{kind.title()} Report","sections":[{"title":"Export","items":[{"label":"Scope","value":"Use the downloadable report for your role."}]}]}

@app.get("/api/reports/{kind}/{fmt}")
def report(kind:str,fmt:str,user=Depends(current_user),db:Session=Depends(get_db)):
    
    if user.role=="coach":
        data={"report_type":kind,"generated_for":user.name,"scope":"Assigned learners",**coach_insights(user,db)}
    elif user.role=="educator":
        data={"report_type":kind,"generated_for":user.name,"scope":"Educator-owned classes",**educator_insights(user,db)}
    elif user.role=="admin":
        data={"report_type":kind,"generated_for":user.name,"scope":"Entire platform",**admin_overview(user,db)}
    else:
        if kind not in {"performance","debate","presentation"}:
            raise HTTPException(400,"Unsupported report")
        data=learner_report_data(kind,user,db)
        data["report_type"]=kind
    if fmt=="pdf":
        buf=pdf_report(f"{kind.title()} Report",data);return StreamingResponse(buf,media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="{kind}-report.pdf"'})
    if fmt in {"xlsx","excel"}:
        buf=excel_report(f"{kind.title()} Report",data);return StreamingResponse(buf,media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",headers={"Content-Disposition":f'attachment; filename="{kind}-report.xlsx"'})
    raise HTTPException(400,"Format must be pdf or xlsx")

@app.post("/api/debates/{debate_id}/referee")
async def referee(debate_id:int,user=Depends(current_user),db:Session=Depends(get_db)):
    d=db.get(Debate,debate_id)
    if not d: raise HTTPException(404,"Debate not found")
    if not db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate_id,DebateParticipant.user_id==user.id).first(): raise HTTPException(403,"You are not a participant")
    participants=db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate_id).all()
    if len(participants)<2: raise HTTPException(400,"Both participants must join before a performance result can be generated")
    transcript=db.query(DebateMessage).filter(DebateMessage.debate_id==debate_id).order_by(DebateMessage.created_at.asc()).all()
    if not transcript: raise HTTPException(400,"No debate messages to assess")
    existing=db.query(Score).filter(Score.debate_id==debate_id).order_by(Score.created_at.asc()).all()
    if len(existing)>=2:
        winner=max(existing,key=lambda x:x.overall).user_id
        return {"topic":d.topic,"format":d.format,"participants":[{"user_id":x.user_id,"position":next((p.position for p in participants if p.user_id==x.user_id),""),"overall":x.overall,"argument_quality":x.argument_quality,"evidence_usage":x.evidence_usage,"logical_consistency":x.logical_consistency,"rebuttal_effectiveness":x.rebuttal_effectiveness,"communication_skills":x.communication_skills,"strengths":[],"weaknesses":[]} for x in existing],"winner_user_id":winner,"explanation":"Result restored from the stored assessment.","source":existing[-1].source}
    prompt = """Evaluate this completed human debate using ONLY the supplied transcript. Return strict JSON with participants:[{user_id, argument_quality,evidence_usage,logical_consistency,rebuttal_effectiveness,communication_skills,overall,strengths,weaknesses,evidence_examples,rebuttal_examples}], winner_user_id, explanation. Scores 0-100. Compare responsiveness, reasoning, evidence actually used, rebuttals and communication. Every feedback item must be grounded in the participant's actual transcript. evidence_examples and rebuttal_examples must quote or closely paraphrase only what that participant actually said. If evidence is absent, say so instead of inventing it. Do not invent activity, evidence, claims, citations, or facts."""
    people=[{"user_id":p.user_id,"position":p.position,"name":db.get(User,p.user_id).name} for p in participants]
    text='\n'.join(f"user_id={m.user_id or 'unknown'} role={m.role}: {m.text}" for m in transcript)
    r=await provider_manager.generate(prompt,f"Topic: {d.topic}\nFormat: {d.format}\nParticipants: {people}\nTranscript:\n{text}",json_mode=True)
    try:
        result=json.loads(r["text"])
        valid={p.user_id for p in participants}
        if not result.get("participants") or not result.get("winner_user_id") or int(result["winner_user_id"]) not in valid:
            raise ValueError("Incomplete referee response")
        source=r["provider"]
        # Normalize provider output to the actual participant set and safe score bounds.
        normalized=[]
        for p in participants:
            item=next((x for x in result["participants"] if int(x.get("user_id",-1))==p.user_id),None)
            if not item: raise ValueError("Missing participant assessment")
            item["user_id"]=p.user_id
            for list_key in ["strengths","weaknesses","evidence_examples","rebuttal_examples"]:
                if not isinstance(item.get(list_key),list): item[list_key]=[str(item[list_key])] if item.get(list_key) else []
            for key in ["argument_quality","evidence_usage","logical_consistency","rebuttal_effectiveness","communication_skills"]:
                item[key]=max(0,min(100,float(item.get(key,0))))
            calc=score_debate({k:item[k] for k in ["argument_quality","evidence_usage","logical_consistency","rebuttal_effectiveness","communication_skills"]})
            item["overall"]=calc["overall"]
            normalized.append(item)
        result["participants"]=normalized
        result["winner_user_id"]=int(result["winner_user_id"])
    except Exception:
        # Demo/final fallback: score only what is observable in the actual transcript.
        by_user={}
        for m in transcript:
            if m.user_id:
                by_user.setdefault(m.user_id,[]).append(m.text or "")
        normalized=[]
        for p in participants:
            texts=by_user.get(p.user_id,[])
            joined=" ".join(texts).strip()
            words=joined.split()
            evidence=len(__import__("re").findall(r"(study|research|data|survey|source|evidence|report|percent|according)",joined,__import__("re").I))
            rebuttal_terms=len(__import__("re").findall(r"(however|but|counter|rebut|yet|although|because)",joined,__import__("re").I))
            sentences=max(1,len(__import__("re").split(r"[.!?]+",joined)))
            argument_quality=min(95,45+min(35,len(words)//8)+min(15,sentences*3))
            evidence_score=min(95,45+evidence*10)
            logic_score=min(95,50+min(30,sentences*5)+(10 if "because" in joined.lower() or "therefore" in joined.lower() else 0))
            rebuttal_score=min(95,45+rebuttal_terms*8)
            communication=min(95,45+min(40,len(words)//7))
            metrics={"argument_quality":argument_quality,"evidence_usage":evidence_score,"logical_consistency":logic_score,
                     "rebuttal_effectiveness":rebuttal_score,"communication_skills":communication}
            calc=score_debate(metrics)
            normalized.append({"user_id":p.user_id,**calc,
                               "strengths":[
                                   "Used a substantive amount of spoken debate text." if words else "No substantive contribution was captured.",
                                   "Included explicit evidence language." if evidence else "Kept the contribution focused on claims and reasoning."
                               ],
                               "weaknesses":[
                                   "Evidence was not explicitly referenced in the captured transcript." if not evidence else "Tie each piece of evidence more directly to the claim.",
                                   "Add clearer rebuttal language when responding to the opponent." if not rebuttal_terms else "Make rebuttals more direct and specific."
                               ]})
        winner=max(normalized,key=lambda x:x["overall"])["user_id"] if normalized else participants[0].user_id
        result={"participants":normalized,"winner_user_id":winner,
                "explanation":"Demo Mode judged the stored transcript using only observable contribution length, evidence language, reasoning markers and rebuttal markers. No outside facts were introduced."}
        source="demo"
    for item in result["participants"]:
        uid=int(item["user_id"])
        if uid not in {p.user_id for p in participants}: continue
        metrics={k:float(item.get(k,0)) for k in ["argument_quality","evidence_usage","logical_consistency","rebuttal_effectiveness","communication_skills"]}
        calc=score_debate(metrics)
        db.add(Score(user_id=uid,debate_id=d.id,source=source,**calc))
    d.status="completed";db.commit();audit(db,user,"ai_referee",{"debate_id":debate_id,"provider":source})
    try:
        await manager.broadcast(d.join_code,{"type":"room_closed","message":"The debate has ended. The room is now locked."})
    except Exception:
        pass
    for item in result["participants"]:
        p=next((x for x in participants if x.user_id==int(item["user_id"])),None)
        item["position"]=p.position if p else None
        item["name"]=db.get(User,int(item["user_id"])).name if p else f"Participant {item['user_id']}"
    result.update({"topic":d.topic,"format":d.format,"source":source})
    return result

class ConnectionManager:
    def __init__(self): self.active={}
    async def connect(self,ws,room): await ws.accept();self.active.setdefault(room,[]).append(ws)
    def disconnect(self,ws,room):
        if room in self.active and ws in self.active[room]: self.active[room].remove(ws)
    async def broadcast(self,room,msg):
        for ws in list(self.active.get(room,[])):
            try: await ws.send_json(msg)
            except Exception: self.disconnect(ws,room)
manager=ConnectionManager()
@app.websocket("/ws/debates/{room}")
async def live_debate(ws:WebSocket,room:str):
    from app.core.security import decode_token
    token=ws.query_params.get("token","")
    try:
        data=decode_token(token); user_id=int(data["sub"])
    except Exception:
        await ws.close(code=1008); return
    db=__import__('app.database.db',fromlist=['SessionLocal']).SessionLocal()
    try:
        debate=db.query(Debate).filter(Debate.join_code==room).first()
        if not debate or debate.status=="completed" or not db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate.id,DebateParticipant.user_id==user_id).first():
            await ws.close(code=1008); return
        await manager.connect(ws,room)
        participant=db.query(DebateParticipant).filter(DebateParticipant.debate_id==debate.id,DebateParticipant.user_id==user_id).first()
        participant_name=db.get(User,user_id).name if db.get(User,user_id) else f"Participant {user_id}"
        participant_position=participant.position if participant else None
        await manager.broadcast(room,{"type":"presence","user_id":user_id,"name":participant_name,
                                      "position":participant_position,"message":"Participant connected","room":room})
        existing_count=db.query(DebateMessage).filter(DebateMessage.debate_id==debate.id,DebateMessage.role=="participant").count()
        state_round,state_phase,state_owner=live_stage(db,debate,existing_count)
        await ws.send_json({"type":"room_state","round_number":state_round,"phase":state_phase,"turn_owner_user_id":state_owner,"message_count":existing_count})
        while True:
            msg=await ws.receive_json()
            db.refresh(debate)
            if debate.status=="completed":
                await ws.send_json({"type":"room_closed","message":"This debate has ended and is locked."})
                await ws.close(code=1000)
                break
            text=str(msg.get("text", "")).strip()
            if not text: continue
            existing_count=db.query(DebateMessage).filter(DebateMessage.debate_id==debate.id,DebateMessage.role=="participant").count()
            round_no,phase,expected=live_stage(db,debate,existing_count)
            if phase=="complete":
                await ws.send_json({"type":"debate_complete","message":"All scheduled rounds, rebuttals and closings are complete. End the debate to receive judging."})
                continue
            if expected and expected!=user_id:
                await ws.send_json({"type":"turn_error","message":"It is not your turn yet.","round_number":round_no,"phase":phase,"turn_owner_user_id":expected})
                continue
            event={"type":"debate_message","room":room,"user_id":user_id,"name":participant_name,
                   "position":participant_position,"round_number":round_no,"phase":phase,
                   "payload":{"text":text},"created_at":datetime.now(timezone.utc).isoformat()}
            db.add(DebateMessage(debate_id=debate.id,user_id=user_id,role="participant",text=text,round_number=round_no,phase=phase));db.commit()
            next_round,next_phase,next_owner=live_stage(db,debate,existing_count+1)
            event["next_turn_owner_user_id"]=next_owner; event["next_phase"]=next_phase; event["next_round_number"]=next_round
            await manager.broadcast(room,event)
    except WebSocketDisconnect:
        manager.disconnect(ws,room)
        await manager.broadcast(room,{"type":"presence","user_id":user_id,"message":"Participant disconnected","room":room})
    finally:
        db.close()

@app.get("/api/voice/status")
def voice_status(): return {"available":True,"browser_recording":True,"transcription":"Groq-supported where configured; Demo Mode fallback","metrics":"Estimated when derived from captured transcript/audio"}
@app.post("/api/voice/transcribe")
async def transcribe(file:UploadFile=File(...),user=Depends(current_user)):
    data=await file.read()
    if len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,"Audio file too large")
    result=await provider_manager.transcribe(data,file.filename or "audio.webm")
    return {"transcript":result["text"],"source":result["provider"],"estimated":result.get("estimated",False)}

@app.get("/api/roles")
def roles(): return {"roles":["learner","coach","educator","admin"]}






