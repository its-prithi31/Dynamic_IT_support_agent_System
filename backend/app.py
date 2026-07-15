"""Aegis API: secure, runnable hybrid IT-support service."""
import base64, hashlib, io, json, os, re, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import asyncio
from typing import Optional
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, create_engine, func
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session
from .ai.prompt_manager import PromptManager
from .ai.guardrails import Guardrails
from .ai.router import AIRouter
from .ai.verifier import ResponseVerifier
from .ai.monitor import Monitor
from fastapi import WebSocket, WebSocketDisconnect
from .ai.embeddings import get_embedding
try:
 from redis import Redis
except ImportError:
 Redis=None

def utcnow(): return datetime.now(timezone.utc)

DATABASE_URL=os.getenv("DATABASE_URL","sqlite:///./aegis.db")
SECRET_KEY=os.getenv("JWT_SECRET","change-me-before-production")
if SECRET_KEY == "change-me-before-production" and os.getenv("ENVIRONMENT")=="production": raise RuntimeError("JWT_SECRET is required")
_encryption_key=os.getenv("DATA_ENCRYPTION_KEY") or base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest())
if not os.getenv("DATA_ENCRYPTION_KEY") and os.getenv("ENVIRONMENT")=="production": raise RuntimeError("DATA_ENCRYPTION_KEY is required")
_CIPHER=Fernet(_encryption_key)
engine=create_engine(DATABASE_URL, connect_args={"check_same_thread":False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal=sessionmaker(bind=engine, autocommit=False, autoflush=False); Base=declarative_base()
pwd=CryptContext(schemes=["bcrypt"],deprecated="auto"); oauth=OAuth2PasswordBearer(tokenUrl="/api/auth/login")
UPLOADS=Path(os.getenv("UPLOAD_DIR","uploads")); UPLOADS.mkdir(exist_ok=True)
_rate_redis = Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True) if Redis and os.getenv("REDIS_URL") else None
PERMISSIONS={
 "employee": {"support:use", "ticket:read", "ticket:comment", "feedback:write"},
 "technician": {"support:use", "ticket:read", "ticket:comment", "ticket:assign", "ticket:resolve", "monitor:read", "feedback:write"},
 "admin": {"*"},
}

class User(Base):
 __tablename__="users"; id=Column(Integer,primary_key=True); name=Column(String(120)); email=Column(String(255),unique=True,index=True); hashed_password=Column(String(255)); role=Column(String(30),default="employee"); created_at=Column(DateTime,default=datetime.utcnow)
class Ticket(Base):
 __tablename__="tickets"; id=Column(Integer,primary_key=True); title=Column(String(240)); description=Column(Text); category=Column(String(80)); priority=Column(String(30)); status=Column(String(30),default="Open"); department=Column(String(100)); solution=Column(Text,default=""); confidence=Column(Integer,default=0); owner_id=Column(Integer,ForeignKey("users.id"),nullable=True); assigned_at=Column(DateTime,nullable=True); created_at=Column(DateTime,default=datetime.utcnow); updated_at=Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow)
class Knowledge(Base):
 __tablename__="knowledge_base"; id=Column(Integer,primary_key=True); title=Column(String(255)); content=Column(Text); source=Column(String(255)); sha256=Column(String(64),unique=True); created_at=Column(DateTime,default=datetime.utcnow)
class KnowledgeVersion(Base):
 __tablename__="knowledge_versions"; id=Column(Integer,primary_key=True); knowledge_id=Column(Integer,ForeignKey("knowledge_base.id")); title=Column(String(255)); content=Column(Text); source=Column(String(255)); version=Column(Integer,default=1); created_at=Column(DateTime,default=datetime.utcnow)
class AIRequest(Base):
 __tablename__="ai_requests"; id=Column(Integer,primary_key=True); request_id=Column(String(36),index=True); user_id=Column(Integer,ForeignKey("users.id")); query=Column(Text); category=Column(String(80)); priority=Column(String(30)); department=Column(String(100)); auto_decision=Column(String(40)); status=Column(String(40),default="pending"); created_at=Column(DateTime,default=datetime.utcnow)
class AIResponse(Base):
 __tablename__="ai_responses"; id=Column(Integer,primary_key=True); request_id=Column(String(36),index=True); response=Column(Text); verification=Column(Text); confidence=Column(Integer); model=Column(String(100)); success=Column(Integer); detail=Column(Text); created_at=Column(DateTime,default=datetime.utcnow)
class AuditLog(Base):
 __tablename__="audit_logs"; id=Column(Integer,primary_key=True); event_type=Column(String(120)); details=Column(Text); created_at=Column(DateTime,default=datetime.utcnow)
class Escalation(Base):
 __tablename__="escalations"; id=Column(Integer,primary_key=True); ticket_id=Column(Integer,ForeignKey("tickets.id")); request_id=Column(String(36),index=True); reason=Column(Text); technician_id=Column(Integer,ForeignKey("users.id"),nullable=True); created_at=Column(DateTime,default=datetime.utcnow)
class TechnicianProfile(Base):
 __tablename__="technician_profiles"; id=Column(Integer,primary_key=True); user_id=Column(Integer,ForeignKey("users.id"),unique=True); skills=Column(Text,default="General IT Support"); availability=Column(String(30),default="available"); specialization=Column(String(120),default="General IT Support"); last_assigned_at=Column(DateTime,nullable=True)
class ChatHistory(Base):
 __tablename__="chat_history"; id=Column(Integer,primary_key=True); user_id=Column(Integer,ForeignKey("users.id"),nullable=True); query=Column(Text); response=Column(Text); created_at=Column(DateTime,default=datetime.utcnow)
class PromptExecution(Base):
 __tablename__="prompt_executions"; id=Column(Integer,primary_key=True); request_id=Column(String(36),index=True); prompt_id=Column(String(100)); prompt_version=Column(String(20)); role=Column(String(30)); content=Column(Text); model=Column(String(100)); created_at=Column(DateTime,default=datetime.utcnow)
class AILog(Base):
 __tablename__="ai_logs"; id=Column(Integer,primary_key=True); request_id=Column(String(36)); route=Column(String(30)); success=Column(Integer); detail=Column(Text); created_at=Column(DateTime,default=datetime.utcnow)
class Application(Base): __tablename__="applications"; id=Column(Integer,primary_key=True); name=Column(String(100),unique=True); recovery_url=Column(String(500))

class UserApplicationHistory(Base): __tablename__="user_application_history"; id=Column(Integer,primary_key=True); user_id=Column(Integer,ForeignKey("users.id")); application_id=Column(Integer,ForeignKey("applications.id")); action=Column(String(80)); created_at=Column(DateTime,default=datetime.utcnow)


class MonitorEvent(Base):
    __tablename__ = "monitor_events"
    id = Column(Integer, primary_key=True)
    name = Column(String(200))
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class TicketComment(Base):
    __tablename__ = "ticket_comments"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class Embedding(Base):
    __tablename__ = "embeddings"
    id = Column(Integer, primary_key=True)
    knowledge_id = Column(Integer, ForeignKey("knowledge_base.id"))
    vector = Column(Text)  # JSON array
    created_at = Column(DateTime, default=datetime.utcnow)
class AIFeedback(Base):
 __tablename__="ai_feedback"; id=Column(Integer,primary_key=True); request_id=Column(String(36),index=True); user_id=Column(Integer,ForeignKey("users.id")); helpful=Column(Integer); comment=Column(Text,default=""); successful=Column(Integer,default=0); created_at=Column(DateTime,default=datetime.utcnow)
class KnowledgeCandidate(Base):
 __tablename__="knowledge_candidates"; id=Column(Integer,primary_key=True); ticket_id=Column(Integer,ForeignKey("tickets.id"),unique=True); title=Column(String(255)); content=Column(Text); quality_score=Column(Integer,default=0); status=Column(String(30),default="Pending Approval"); reviewed_by=Column(Integer,ForeignKey("users.id"),nullable=True); created_at=Column(DateTime,default=datetime.utcnow)
class PromptTemplateModel(Base):
 __tablename__="prompt_templates"; id=Column(Integer,primary_key=True); prompt_id=Column(String(100),index=True); role=Column(String(30)); template=Column(Text); version=Column(String(20),default="1.0"); meta_json=Column("metadata",Text,default='{}'); created_at=Column(DateTime,default=datetime.utcnow)
class GuardrailLog(Base):
 __tablename__="guardrail_logs"; id=Column(Integer,primary_key=True); request_id=Column(String(36),index=True); event_type=Column(String(80)); reason=Column(String(120)); details=Column(Text); created_at=Column(DateTime,default=datetime.utcnow)
class AgentExecutionLog(Base):
 __tablename__="agent_execution_logs"; id=Column(Integer,primary_key=True); request_id=Column(String(36),index=True); step=Column(String(80)); status=Column(String(40)); detail=Column(Text); created_at=Column(DateTime,default=datetime.utcnow)
class ConfidencePolicy(Base):
 __tablename__="confidence_policies"; id=Column(Integer,primary_key=True); auto_resolve_threshold=Column(Integer,default=85); updated_by=Column(Integer,ForeignKey("users.id"),nullable=True); updated_at=Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow)
class ResolutionApproval(Base):
 __tablename__="resolution_approvals"; id=Column(Integer,primary_key=True); ticket_id=Column(Integer,ForeignKey("tickets.id"),unique=True); submitted_by=Column(Integer,ForeignKey("users.id")); approved_by=Column(Integer,ForeignKey("users.id"),nullable=True); status=Column(String(30),default="Pending Approval"); resolution=Column(Text); created_at=Column(DateTime,default=datetime.utcnow); decided_at=Column(DateTime,nullable=True)
class LearningSignal(Base):
 __tablename__="learning_signals"; id=Column(Integer,primary_key=True); request_id=Column(String(36),index=True); signal_type=Column(String(80)); recommendation=Column(Text); status=Column(String(30),default="Pending Review"); created_at=Column(DateTime,default=datetime.utcnow)
class TicketAttachment(Base):
 __tablename__="ticket_attachments"; id=Column(Integer,primary_key=True); ticket_id=Column(Integer,ForeignKey("tickets.id")); file_name=Column(String(255)); file_key=Column(String(255)); created_at=Column(DateTime,default=datetime.utcnow)
Base.metadata.create_all(engine)

def load_prompt_templates_from_db():
 d=SessionLocal()
 try:
  templates=[]
  for row in d.query(PromptTemplateModel).order_by(PromptTemplateModel.prompt_id,PromptTemplateModel.version).all():
   templates.append({"id":row.prompt_id,"role":row.role,"template":row.template,"version":row.version,"metadata":json.loads(row.meta_json or "{}")})
  return templates
 finally:
  d.close()


def ensure_prompt_templates_persisted():
 d=SessionLocal()
 try:
  existing = { (row.prompt_id,row.version) for row in d.query(PromptTemplateModel).all() }
  for tmpl in _PM.list_templates():
   key=(tmpl.id,tmpl.version)
   if key in existing: continue
   d.add(PromptTemplateModel(prompt_id=tmpl.id, role=tmpl.role, template=tmpl.template, version=tmpl.version, meta_json=json.dumps(tmpl.metadata)))
  d.commit()
 finally:
  d.close()

def confidence_threshold(d: Session) -> int:
 policy=d.query(ConfidencePolicy).order_by(ConfidencePolicy.id.asc()).first()
 return policy.auto_resolve_threshold if policy else 85

class Register(BaseModel): name:str=Field(min_length=2,max_length=120); email:EmailStr; password:str=Field(min_length=10,max_length=128)
class Refresh(BaseModel): refresh_token:str
class Chat(BaseModel): query:str=Field(min_length=2,max_length=12000); attachment_ids:list[str]=[]
class TicketIn(BaseModel): title:str; description:str; category:str="General"; priority:str="Medium"
class Verify(BaseModel): successful:bool; feedback:str=""
class FeedbackIn(BaseModel): request_id:str; helpful:bool; successful:bool=False; satisfaction_score:int=Field(default=3,ge=1,le=5); comment:str=""
app=FastAPI(title="Aegis Autonomous IT Support",version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=os.getenv("CORS_ORIGINS","http://localhost:3000").split(","),allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
rate={}
@app.middleware("http")
async def limit(request:Request, call_next):
 key=request.client.host if request.client else "unknown"
 if _rate_redis:
  try:
   count=_rate_redis.incr(f"aegis:rate:{key}")
   if count == 1: _rate_redis.expire(f"aegis:rate:{key}",60)
   if count > 120: raise HTTPException(429,"Rate limit exceeded")
  except HTTPException: raise
  except Exception: pass
 now=utcnow().timestamp(); hits=[t for t in rate.get(key,[]) if now-t<60]
 if len(hits)>=120: raise HTTPException(429,"Rate limit exceeded")
 rate[key]=hits+[now]; return await call_next(request)
def db():
 d=SessionLocal()
 try: yield d
 finally:d.close()
def token(user,kind,mins): return jwt.encode({"sub":user.email,"role":user.role,"typ":kind,"exp":utcnow()+timedelta(minutes=mins)},SECRET_KEY,algorithm="HS256")
def current(t:str=Depends(oauth),d:Session=Depends(db)):
 try: p=jwt.decode(t,SECRET_KEY,algorithms=["HS256"]); assert p.get("typ")=="access"; u=d.query(User).filter_by(email=p["sub"]).first(); assert u; return u
 except (JWTError,AssertionError,KeyError): raise HTTPException(401,"Invalid access token")
def has_permission(user, permission):
 role=user.role.lower().replace("it technician","technician")
 return "*" in PERMISSIONS.get(role,set()) or permission in PERMISSIONS.get(role,set())
def require_permission(permission):
 def check(u=Depends(current)):
  if not has_permission(u,permission): raise HTTPException(403,"Permission denied")
  return u
 return check
def admin(u=Depends(require_permission("admin:manage"))): return u
def technician(u=Depends(require_permission("ticket:resolve"))): return u
def masked(text): return re.sub(r"(?i)(password|token|api[_ -]?key)\s*[:=]\s*\S+",r"\1=[REDACTED]",text)
def classify(q):
 q=q.lower(); rules=[("Network","High","Network Team",["vpn","wifi","network","dns","internet"]),("Identity","High","Identity Team",["password","mfa","login","sign in","account"]),("Printing","Medium","Desktop Support",["printer","spooler","print"]),("Performance","Medium","Desktop Support",["slow","freeze","memory","cpu"])]
 for c,p,d,words in rules:
  if any(w in q for w in words):return c,p,d
 return "General","Medium","IT Support"
def answer(q, context):
 c,p,dept=classify(q); source=(context[0].title if context else "standard IT support runbook")
 steps={"Network":["Check whether the Wi-Fi icon shows a connection and confirm other websites or company services are also affected.","Turn Wi-Fi off and on, then reconnect to the approved network. If you are remote, reconnect the approved VPN profile.","Open Command Prompt and run `ipconfig /renew`, then run `ipconfig /flushdns` to refresh the network lease and DNS cache.","Test one approved internal service and one public website. This identifies whether the failure is local Wi-Fi, VPN, DNS, or wider internet access.","If the issue persists, record the Wi-Fi network name, exact error, time it started, and whether other devices are affected before escalating."],"Identity":["Use only the official sign-in or recovery page; never share a password, recovery code, or one-time passcode.","Complete approved MFA and check whether the account is locked or the password has expired.","Try the service in a private browser window to rule out stale session data.","If access is still blocked, provide the time, application name, and exact message to the Identity Team."],"Printing":["Check power, paper, toner, cable or network connection, and the printer display for errors.","Open the print queue, cancel stuck jobs, and restart the Print Spooler service.","Print a Windows test page to confirm whether the problem is the printer or the affected application.","If it still fails, capture the printer name, error message, and job time before escalating."],"Performance":["Open Task Manager and identify any application with sustained high CPU, memory, or disk use.","Save work, close non-essential applications, and restart the device.","Confirm available disk space and install pending approved updates when appropriate.","If the problem returns, record the affected application, time, and resource usage for Desktop Support."]}.get(c,["Capture the affected application, exact error message, and the time the issue started.","Restart the affected application and confirm network connectivity.","Try the same action once more and note whether the result changes.","Escalate with sanitized logs or a screenshot if the issue continues."])
 return {"category":c,"priority":p,"department":dept,"root_cause":f"The reported symptoms are most consistent with a {c.lower()} configuration, connectivity, or service issue. Current guidance is based on {source}.","solution":steps,"verification":"After each step, repeat the original action. The issue is resolved only when the service works normally without a new error.","confidence":min(95,72+len(context)*8),"sources":[x.title for x in context]}
@app.get("/health")
def health():return {"status":"ok","time":utcnow()}

# Initialize AI components
_PM=PromptManager(load_prompt_templates_from_db())
_GR=Guardrails(); _MON=Monitor(); _ROUTER=AIRouter(_PM,_GR); _VER=ResponseVerifier()
ensure_prompt_templates_persisted()


@app.post("/api/ai/route")
def ai_route(payload:dict, u=Depends(current), d:Session=Depends(db)):
    # payload expects {"query":..., "context":{}}
    q=payload.get("query","")
    ctx=payload.get("context",{}) or {}
    # attach DB session to context for RAG
    ctx["db"] = d
    inspection = _GR.inspect_input(q)
    _MON.log_event("received_query",{"user":u.email,"query":q})
    d.add(MonitorEvent(name="received_query", details=json.dumps({"user":u.email,"query":q})))
    res=_ROUTER.route(q,ctx)
    _MON.log_event("routed",{"request_id":res.get("request_id")})
    d.add(MonitorEvent(name="routed", details=json.dumps({"request_id":res.get("request_id")})))
    v=_VER.evaluate(res)
    _MON.log_event("verified",{"request_id":res.get("request_id"),"ok":v.get("ok"),"confidence":v.get("confidence")})
    d.add(MonitorEvent(name="verified", details=json.dumps({"request_id":res.get("request_id"),"ok":v.get("ok"),"confidence":v.get("confidence")})))
    threshold=confidence_threshold(d)
    should_auto_resolve=v.get("ok") and v.get("source_available", False) and v.get("confidence",0) >= threshold
    request_id=res.get("request_id")
    # Persist every guardrail, prompt, and agent step so the audit trail is complete.
    for reason in inspection.get("reasons", []):
        d.add(GuardrailLog(request_id=request_id,event_type="input_blocked",reason=reason,details=json.dumps({"sanitized":inspection.get("sanitized","")})))
    for reason in res.get("security_reasons", []):
        if reason not in inspection.get("reasons", []):
            d.add(GuardrailLog(request_id=request_id,event_type="output_blocked",reason=reason,details=json.dumps({})))
    if not res.get("allowed", False) and not res.get("security_reasons"):
        d.add(GuardrailLog(request_id=request_id,event_type="output_blocked",reason="unsafe_response",details=json.dumps({})))
    for record in res.get("prompt_records", []):
        d.add(PromptExecution(request_id=request_id,prompt_id=record["id"],prompt_version=record["version"],role=record["role"],content=record["content"],model=record["model"]))
    for step in res.get("workflow", []):
        d.add(AgentExecutionLog(request_id=request_id,step=step,status="completed" if res.get("allowed") else "blocked",detail=json.dumps({"model":res.get("model"),"sources":res.get("sources",[]),"usage":res.get("usage",{})})))
    # Store AI request and response for governance and confidence decisions.
    d.add(AIRequest(request_id=request_id, user_id=u.id, query=masked(q), category=res.get("classification", "General"), priority=res.get("priority", "Medium"), department=res.get("department", "IT Support"), auto_decision=("auto_resolve" if should_auto_resolve else "escalate"), status=("auto_resolved" if should_auto_resolve else "escalated")))
    d.add(AIResponse(request_id=res.get("request_id"), response=res.get("response"), verification=res.get("verification"), confidence=v.get("confidence", 0), model=res.get("model"), success=1 if v.get("ok") else 0, detail=json.dumps({"res":res,"verifier":v,"workflow":res.get("workflow",""),"model":res.get("model")})))
    d.add(AILog(request_id=res.get("request_id"),route="ai_route",success=1 if v.get("ok") else 0,detail=json.dumps({"res":res,"verifier":v,"workflow":res.get("workflow",""),"model":res.get("model")})))
    d.commit()
    # Return a structured, deterministic briefing even when the model response
    # is escalated. This keeps the support UI useful while a technician reviews.
    triage=answer(q, [])
    if not should_auto_resolve:
        category, priority, department = classify(q)
        ticket=Ticket(
            title=f"AI escalation: {q[:120]}",
            description=masked(q),
            category=category,
            priority="High" if not v.get("ok") else priority,
            department=department,
            status="Waiting Approval",
            confidence=v.get("confidence", 0),
            owner_id=None,
        )
        d.add(ticket)
        d.commit()
        d.refresh(ticket)
        d.add(TicketComment(ticket_id=ticket.id,user_id=u.id,comment=f"AI low-confidence escalation: issues={v.get('issues')}, model={res.get('model')}, sources={res.get('sources')}"))
        _MON.log_event("human_escalation",{"request_id":res.get("request_id"),"ticket_id":ticket.id,"reason":v.get("issues")})
        d.add(MonitorEvent(name="human_escalation", details=json.dumps({"request_id":res.get("request_id"),"ticket_id":ticket.id,"reason":v.get("issues")})))
        d.commit()
        return {
            "escalate":True,
            "reason":v.get("issues"),
            "confidence":v.get("confidence"),
            "request_id":res.get("request_id"),
            "ticket_id":ticket.id,
            "sources":res.get("sources",[]),
            "model":res.get("model"),
            "category":triage["category"],
            "priority":triage["priority"],
            "department":triage["department"],
            "root_cause":triage["root_cause"],
            "solution":triage["solution"],
            "verification":triage["verification"],
        }
    return {"escalate":False,"response":res.get("response"),"confidence":v.get("confidence"),"request_id":res.get("request_id"),"sources":res.get("sources",[]),"model":res.get("model"),"category":triage["category"],"priority":triage["priority"],"department":triage["department"],"root_cause":triage["root_cause"],"solution":triage["solution"],"verification":triage["verification"]}



@app.get("/api/ai/monitor/recent")
def ai_monitor_recent(u=Depends(current)):
    return _MON.recent()


@app.get("/api/knowledge")
def list_knowledge(u=Depends(current), d:Session=Depends(db)):
    docs = []
    for k in d.query(Knowledge).order_by(Knowledge.created_at.desc()).all():
        versions = d.query(KnowledgeVersion).filter_by(knowledge_id=k.id).count()
        docs.append({
            "id": k.id,
            "title": k.title,
            "source": k.source,
            "content": k.content,
            "version_count": max(1, versions),
            "created_at": k.created_at.isoformat(),
        })
    return docs


@app.get("/api/knowledge/versions")
def knowledge_versions(u=Depends(admin), d:Session=Depends(db)):
    return [
        {
            "id": v.id,
            "knowledge_id": v.knowledge_id,
            "title": v.title,
            "source": v.source,
            "version": v.version,
            "created_at": v.created_at.isoformat(),
        }
        for v in d.query(KnowledgeVersion).order_by(KnowledgeVersion.created_at.desc()).all()
    ]


@app.get("/api/ai/prompts")
def list_ai_prompts(u=Depends(admin), d:Session=Depends(db)):
    templates = d.query(PromptTemplateModel).order_by(PromptTemplateModel.prompt_id, PromptTemplateModel.version).all()
    return [
        {
            "id": tmpl.prompt_id,
            "role": tmpl.role,
            "template": tmpl.template,
            "version": tmpl.version,
            "metadata": json.loads(tmpl.meta_json or "{}"),
        }
        for tmpl in templates
    ]

@app.get("/api/ai/prompts/{prompt_id}/versions")
def prompt_versions(prompt_id:str,u=Depends(admin),d:Session=Depends(db)):
    templates = d.query(PromptTemplateModel).filter_by(prompt_id=prompt_id).order_by(PromptTemplateModel.version).all()
    return [
        {"id":tmpl.prompt_id,"version":tmpl.version,"template":tmpl.template,"metadata":json.loads(tmpl.meta_json or "{}")} for tmpl in templates
    ]

@app.post("/api/ai/prompts")
def create_prompt_template(payload:dict,u=Depends(admin),d:Session=Depends(db)):
    prompt_id=payload.get("prompt_id")
    role=payload.get("role","assistant")
    template=payload.get("template","")
    version=payload.get("version","1.0")
    metadata=json.dumps(payload.get("metadata",{}))
    if not prompt_id or not template:
        raise HTTPException(400,"prompt_id and template are required")
    existing=d.query(PromptTemplateModel).filter_by(prompt_id=prompt_id,version=version).first()
    if existing:
        raise HTTPException(409,"Prompt version already exists")
    entry=PromptTemplateModel(prompt_id=prompt_id,role=role,template=template,version=version,meta_json=metadata)
    d.add(entry); d.commit();
    _PM.register(PromptTemplate(id=prompt_id,role=role,template=template,version=version,metadata=json.loads(metadata)))
    return {"ok":True,"prompt_id":prompt_id,"version":version}

@app.put("/api/ai/prompts/{prompt_id}/{version}")
def update_prompt_template(prompt_id:str, version:str, payload:dict, u=Depends(admin), d:Session=Depends(db)):
    entry = d.query(PromptTemplateModel).filter_by(prompt_id=prompt_id, version=version).first()
    if not entry:
        raise HTTPException(404, "Prompt template version not found")
    entry.template = payload.get("template", entry.template)
    entry.role = payload.get("role", entry.role)
    metadata = json.loads(entry.meta_json or "{}")
    metadata.update(payload.get("metadata", {}))
    entry.meta_json = json.dumps(metadata)
    d.add(entry)
    d.commit()
    _PM.register(PromptTemplate(id=prompt_id,role=entry.role,template=entry.template,version=version,metadata=metadata))
    return {"ok":True,"prompt_id":prompt_id,"version":version}

@app.delete("/api/ai/prompts/{prompt_id}/{version}")
def delete_prompt_template(prompt_id:str, version:str, u=Depends(admin), d:Session=Depends(db)):
    entry = d.query(PromptTemplateModel).filter_by(prompt_id=prompt_id, version=version).first()
    if not entry:
        raise HTTPException(404, "Prompt template version not found")
    d.delete(entry)
    d.commit()
    if prompt_id in _PM.templates:
        _PM.templates[prompt_id] = [tmpl for tmpl in _PM.templates[prompt_id] if tmpl.version != version]
    return {"ok":True,"prompt_id":prompt_id,"version":version}

@app.patch("/api/technicians/{technician_id}")
def update_technician_profile(technician_id:int, payload:dict, u=Depends(admin), d:Session=Depends(db)):
    tech = d.query(User).filter_by(id=technician_id).first()
    if not tech or tech.role.lower() not in ("it technician","technician","admin"):
        raise HTTPException(404, "Technician not found")
    profile = d.query(TechnicianProfile).filter_by(user_id=technician_id).first()
    if not profile:
        profile = TechnicianProfile(user_id=technician_id)
    profile.skills = payload.get("skills", profile.skills)
    profile.availability = payload.get("availability", profile.availability)
    profile.specialization = payload.get("specialization", profile.specialization)
    d.add(profile)
    d.commit()
    return {"ok":True, "technician_id": technician_id}

@app.get("/api/guardrails/logs")
def guardrail_logs(u=Depends(admin),d:Session=Depends(db)):
    return [
        {"id":r.id,"request_id":r.request_id,"event_type":r.event_type,"reason":r.reason,"details":json.loads(r.details or "{}"),"created_at":r.created_at.isoformat()} for r in d.query(GuardrailLog).order_by(GuardrailLog.created_at.desc()).limit(200).all()
    ]

@app.get("/api/ai/requests")
def ai_requests(u=Depends(admin),d:Session=Depends(db)):
    return [
        {"request_id":r.request_id,"user_id":r.user_id,"query":r.query,"category":r.category,"priority":r.priority,"department":r.department,"auto_decision":r.auto_decision,"status":r.status,"created_at":r.created_at.isoformat()} for r in d.query(AIRequest).order_by(AIRequest.created_at.desc()).limit(200).all()
    ]

@app.get("/api/ai/responses")
def ai_responses(u=Depends(admin),d:Session=Depends(db)):
    return [
        {"request_id":r.request_id,"confidence":r.confidence,"model":r.model,"success":bool(r.success),"detail":json.loads(r.detail or "{}"),"created_at":r.created_at.isoformat()} for r in d.query(AIResponse).order_by(AIResponse.created_at.desc()).limit(200).all()
    ]


@app.get("/api/ai/audit")
def ai_audit(u=Depends(admin), d:Session=Depends(db)):
    logs = [
        {
            "id": log.id,
            "request_id": log.request_id,
            "route": log.route,
            "success": bool(log.success),
            "detail": json.loads(log.detail) if log.detail else {},
            "created_at": log.created_at.isoformat(),
        }
        for log in d.query(AILog).order_by(AILog.created_at.desc()).limit(200).all()
    ]
    events = [
        {
            "id": event.id,
            "name": event.name,
            "details": json.loads(event.details) if event.details else {},
            "created_at": event.created_at.isoformat(),
        }
        for event in d.query(MonitorEvent).order_by(MonitorEvent.created_at.desc()).limit(200).all()
    ]
    return {"logs": logs, "events": events}


@app.get("/api/analytics/feedback")
def feedback_analytics(u=Depends(admin), d:Session=Depends(db)):
    total = d.query(AIFeedback).count()
    positive = d.query(AIFeedback).filter_by(helpful=1).count()
    negative = total - positive
    success = d.query(AIFeedback).filter_by(successful=1).count()
    by_request = d.query(AIFeedback.request_id, func.count(AIFeedback.id).label("count")).group_by(AIFeedback.request_id).all()
    satisfaction=[int(re.search(r"satisfaction=(\d)", f.comment or "") .group(1)) for f in d.query(AIFeedback).all() if re.search(r"satisfaction=(\d)", f.comment or "")]
    learning=d.query(LearningSignal).count()
    return {
        "total_feedback": total,
        "positive": positive,
        "negative": negative,
        "successful": success,
        "requests_with_feedback": len(by_request),
        "average_satisfaction": round(sum(satisfaction)/len(satisfaction),2) if satisfaction else 0,
        "learning_signals": learning,
    }


@app.get("/api/ai/metrics")
def ai_metrics(u=Depends(admin), d:Session=Depends(db)):
    ticket_count = d.query(Ticket).count()
    waiting = d.query(Ticket).filter_by(status="Waiting Approval").count()
    resolved = d.query(Ticket).filter_by(status="Resolved").count()
    feedback = d.query(AIFeedback).count()
    avg_confidence = 0
    logs = d.query(AILog).all()
    if logs:
        try:
            confidences = [json.loads(log.detail).get("verifier", {}).get("confidence", 0) for log in logs]
            avg_confidence = sum([c for c in confidences if isinstance(c, (int, float))]) / max(1, len(confidences))
        except Exception:
            avg_confidence = 0
    responses=d.query(AIResponse).all()
    usage=[json.loads(r.detail or "{}").get("res",{}).get("usage",{}) for r in responses]
    return {
        "ticket_count": ticket_count,
        "waiting_approval": waiting,
        "resolved_tickets": resolved,
        "feedback_count": feedback,
        "avg_confidence": round(avg_confidence, 1),
        "auto_resolve_threshold": confidence_threshold(d),
        "estimated_prompt_tokens": sum(x.get("prompt_tokens_estimate",0) for x in usage),
        "estimated_completion_tokens": sum(x.get("completion_tokens_estimate",0) for x in usage),
        "average_processing_ms": round(sum(x.get("processing_ms",0) for x in usage)/max(1,len(usage)),1),
    }

@app.get("/api/ai/confidence-policy")
def get_confidence_policy(u=Depends(admin), d:Session=Depends(db)):
    return {"auto_resolve_threshold": confidence_threshold(d)}

@app.put("/api/ai/confidence-policy")
def set_confidence_policy(payload:dict, u=Depends(admin), d:Session=Depends(db)):
    threshold=payload.get("auto_resolve_threshold")
    if not isinstance(threshold, int) or not 0 <= threshold <= 100:
        raise HTTPException(400,"auto_resolve_threshold must be an integer from 0 to 100")
    policy=d.query(ConfidencePolicy).order_by(ConfidencePolicy.id.asc()).first()
    if not policy:
        policy=ConfidencePolicy(auto_resolve_threshold=threshold,updated_by=u.id)
    else:
        policy.auto_resolve_threshold=threshold; policy.updated_by=u.id
    d.add(policy); d.add(AuditLog(event_type="confidence_policy_updated",details=json.dumps({"threshold":threshold,"user_id":u.id})))
    d.commit()
    return {"ok":True,"auto_resolve_threshold":threshold}


@app.post("/api/ai/feedback")
def ai_feedback(x:FeedbackIn,u=Depends(current),d:Session=Depends(db)):
    f=AIFeedback(request_id=x.request_id,user_id=u.id,helpful=int(x.helpful),successful=int(x.successful),comment=masked(f"satisfaction={x.satisfaction_score}; {x.comment}"))
    d.add(f)
    if not x.helpful or not x.successful:
        recommendation="Review prompt wording, retrieved sources, and verification policy for this failed outcome."
        d.add(LearningSignal(request_id=x.request_id,signal_type="failed_solution",recommendation=recommendation))
    d.commit()
    _MON.log_event("feedback_received",{"request_id":x.request_id,"user":u.email,"helpful":x.helpful,"successful":x.successful})
    d.add(MonitorEvent(name="feedback_received", details=json.dumps({"request_id":x.request_id,"user":u.email,"helpful":x.helpful,"successful":x.successful})))
    d.commit()
    return {"ok":True}

@app.get("/api/learning/signals")
def learning_signals(u=Depends(admin),d:Session=Depends(db)):
    return [{"id":s.id,"request_id":s.request_id,"signal_type":s.signal_type,"recommendation":s.recommendation,"status":s.status,"created_at":s.created_at.isoformat()} for s in d.query(LearningSignal).order_by(LearningSignal.created_at.desc()).limit(200)]

@app.post("/api/learning/signals/{signal_id}/apply")
def apply_learning_signal(signal_id:int,u=Depends(admin),d:Session=Depends(db)):
    signal=d.query(LearningSignal).filter_by(id=signal_id).first()
    if not signal: raise HTTPException(404,"Learning signal not found")
    signal.status="Applied"; d.add(signal); d.add(AuditLog(event_type="learning_signal_applied",details=json.dumps({"signal_id":signal_id,"admin_id":u.id}))); d.commit()
    return {"ok":True,"status":signal.status}


@app.get("/api/knowledge/candidates")
def knowledge_candidates(u=Depends(admin),d:Session=Depends(db)):
    return [
        {
            "id":c.id,
            "ticket_id":c.ticket_id,
            "title":c.title,
            "content":c.content,
            "quality_score":c.quality_score,
            "status":c.status,
            "reviewed_by":c.reviewed_by,
            "created_at":c.created_at.isoformat(),
        }
        for c in d.query(KnowledgeCandidate).order_by(KnowledgeCandidate.created_at.desc()).all()
    ]


@app.post("/api/knowledge/candidates/{candidate_id}/approve")
def approve_candidate(candidate_id:int,u=Depends(admin),d:Session=Depends(db)):
    c=d.query(KnowledgeCandidate).filter_by(id=candidate_id).first()
    if not c: raise HTTPException(404,"Knowledge candidate not found")
    if c.status != "Pending Approval":
        raise HTTPException(400,"Knowledge candidate already reviewed")
    digest = hashlib.sha256(c.content.encode()).hexdigest()
    k = d.query(Knowledge).filter_by(sha256=digest).first()
    if not k:
        k = Knowledge(title=c.title,content=masked(c.content),source="ticket_resolution",sha256=digest)
        d.add(k)
    c.status = "Approved"
    c.reviewed_by = u.id
    d.add(c)
    d.commit()
    d.refresh(k)
    _MON.log_event("knowledge_approved",{"candidate_id":c.id,"knowledge_id":k.id})
    d.add(MonitorEvent(name="knowledge_approved", details=json.dumps({"candidate_id":c.id,"knowledge_id":k.id})))
    d.commit()
    return {"ok":True,"knowledge_id":k.id}


@app.post("/api/ai/embeddings/build")
def build_embeddings(u=Depends(admin), d:Session=Depends(db)):
    # Build embeddings for all knowledge documents (admin only)
    from .ai.embeddings import get_embedding as _get_emb
    count = 0
    for k in d.query(Knowledge).all():
        vec = _get_emb((k.title or "") + "\n\n" + (k.content or ""))
        if not vec:
            continue
        # upsert
        existing = d.query(Embedding).filter_by(knowledge_id=k.id).first()
        if existing:
            existing.vector = json.dumps(vec)
        else:
            d.add(Embedding(knowledge_id=k.id, vector=json.dumps(vec)))
        count += 1
    d.commit()
    return {"built":count}


@app.websocket("/ws/ai/monitor")
async def ws_monitor(ws: WebSocket):
    raw_token=ws.query_params.get("token")
    if not raw_token:
        await ws.close(code=1008, reason="Authentication required")
        return
    try:
        payload=jwt.decode(raw_token,SECRET_KEY,algorithms=["HS256"])
        if payload.get("typ") != "access" or payload.get("role","").lower().replace("it technician","technician") not in ("technician","admin"):
            raise JWTError()
    except JWTError:
        await ws.close(code=1008, reason="Technician or administrator access required")
        return
    await ws.accept()
    await _MON.register(ws)
    # if Redis is configured, also subscribe and forward redis pubsub messages
    redis_task = None
    try:
        if hasattr(_MON, '_redis') and _MON._redis:
            redis_task = asyncio.create_task(_MON.redis_subscribe_to_ws(ws))
    except Exception:
        redis_task = None
    try:
        await ws.send_json({"type":"recent","events":_MON.recent(50)})
        # keep connection open until client disconnects
        while True:
            try:
                await ws.receive_text()
            except WebSocketDisconnect:
                break
            except Exception:
                # ignore other receive errors and continue
                await asyncio.sleep(1)
    finally:
        if redis_task:
            try:
                redis_task.cancel()
            except Exception:
                pass
        await _MON.unregister(ws)
@app.post("/api/auth/register")
def register(x:Register,d:Session=Depends(db)):
 if d.query(User).filter_by(email=str(x.email)).first():raise HTTPException(409,"Email already registered")
 u=User(name=x.name,email=str(x.email),hashed_password=pwd.hash(x.password),role="employee");d.add(u);d.commit();return {"id":u.id,"email":u.email,"role":u.role}
@app.post("/api/auth/login")
def login(x:OAuth2PasswordRequestForm=Depends(),d:Session=Depends(db)):
 u=d.query(User).filter_by(email=x.username).first()
 if not u or not pwd.verify(x.password,u.hashed_password):raise HTTPException(401,"Invalid credentials")
 return {"access_token":token(u,"access",30),"refresh_token":token(u,"refresh",60*24*7),"token_type":"bearer"}
@app.post("/api/auth/refresh")
def refresh(x:Refresh,d:Session=Depends(db)):
 try:p=jwt.decode(x.refresh_token,SECRET_KEY,algorithms=["HS256"]);assert p.get("typ")=="refresh";u=d.query(User).filter_by(email=p["sub"]).first();assert u;return {"access_token":token(u,"access",30),"token_type":"bearer"}
 except Exception:raise HTTPException(401,"Invalid refresh token")
@app.get("/api/auth/me")
def me(u=Depends(current)):return {"id":u.id,"name":u.name,"email":u.email,"role":u.role}
@app.get("/api/admin/users")
def admin_users(u=Depends(admin),d:Session=Depends(db)):
 return [{"id":v.id,"name":v.name,"email":v.email,"role":v.role,"created_at":v.created_at.isoformat()} for v in d.query(User).order_by(User.created_at.desc()).all()]
@app.patch("/api/admin/users/{user_id}/role")
def set_user_role(user_id:int,payload:dict,u=Depends(admin),d:Session=Depends(db)):
 role=str(payload.get("role","")).lower()
 if role not in {"employee","technician","it technician","admin"}: raise HTTPException(400,"Role must be employee, technician, or admin")
 target=d.query(User).filter_by(id=user_id).first()
 if not target: raise HTTPException(404,"User not found")
 target.role="IT Technician" if role in {"technician","it technician"} else role
 d.add(target); d.add(AuditLog(event_type="user_role_updated",details=json.dumps({"user_id":target.id,"role":target.role,"admin_id":u.id}))); d.commit()
 return {"id":target.id,"role":target.role}
@app.post("/api/upload")
async def upload(file:UploadFile=File(...),u=Depends(current),d:Session=Depends(db)):
 allowed={"image/png","image/jpeg","application/pdf","text/plain","text/x-log","application/json"}; raw=await file.read()
 if file.content_type not in allowed or len(raw)>10*1024*1024:raise HTTPException(415,"Only PNG, JPEG, PDF, text, JSON or log files up to 10MB are accepted")
 if b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE" in raw.upper(): raise HTTPException(422,"Upload blocked by malware signature scan")
 if file.content_type=="application/pdf" and not raw.startswith(b"%PDF-"): raise HTTPException(415,"The uploaded file is not a valid PDF")
 name=f"{uuid.uuid4()}-{Path(file.filename or 'upload').name}"; (UPLOADS/name).write_bytes(_CIPHER.encrypt(raw)); text=raw.decode("utf-8",errors="ignore") if file.content_type!="application/pdf" else "PDF uploaded; text extraction requires PyMuPDF-enabled worker."
 return {"id":name,"filename":file.filename,"extracted_text":masked(text[:6000])}
@app.post("/api/chat")
def chat(x:Chat,u=Depends(current),d:Session=Depends(db)):
 inspection=_GR.inspect_input(x.query)
 if not inspection["allowed"]:
  request_id=str(uuid.uuid4()); d.add(GuardrailLog(request_id=request_id,event_type="input_blocked",reason=",".join(inspection["reasons"]),details=json.dumps({"route":"chat"}))); d.commit()
  raise HTTPException(400,"Your request was blocked by the IT-support safety policy.")
 words=[w for w in re.findall(r"[a-zA-Z]{4,}",inspection["sanitized"].lower())][:12]; qs=d.query(Knowledge)
 docs=[k for k in qs.all() if any(w in k.content.lower() or w in k.title.lower() for w in words)][:3]; result=answer(inspection["sanitized"],docs); d.add(ChatHistory(user_id=u.id,query=inspection["sanitized"],response=json.dumps(result)));d.add(AILog(request_id=str(uuid.uuid4()),route="hybrid-local",success=1,detail=result["category"]));d.commit();return result
@app.post("/api/chat/verify")
def verify(x:Verify,u=Depends(current)):
 return {"verified":x.successful,"next_action":"Close ticket after user confirmation" if x.successful else "Recovery agent will retrieve alternate trusted remediation.","feedback":masked(x.feedback)}
@app.get("/api/tickets")
def tickets(u=Depends(current),d:Session=Depends(db)):
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "category": t.category,
            "priority": t.priority,
            "department": t.department,
            "status": t.status,
            "owner_id": t.owner_id,
            "solution": t.solution,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            "confidence": getattr(t, 'confidence', 0) if hasattr(t, 'confidence') else 0,
        }
        for t in d.query(Ticket).order_by(Ticket.created_at.desc()).all()
    ]
@app.post("/api/tickets")
def create_ticket(x:TicketIn,u=Depends(current),d:Session=Depends(db)):
 c,p,dept=classify(x.description);t=Ticket(title=x.title,description=masked(x.description),category=x.category or c,priority=x.priority or p,department=dept,owner_id=u.id);d.add(t);d.commit();d.refresh(t);return t
@app.get("/api/analytics")
def analytics(u=Depends(admin),d:Session=Depends(db)):
 total=d.query(Ticket).count(); resolved=d.query(Ticket).filter_by(status="Resolved").count();return {"total_tickets":total,"resolved_tickets":resolved,"pending_tickets":total-resolved,"ai_success_rate":round(100*resolved/max(total,1),1),"categories":[list(x) for x in d.query(Ticket.category,func.count(Ticket.id)).group_by(Ticket.category).all()]}
@app.post("/api/knowledge")
def ingest(title:str=Form(...),content:str=Form(...),u=Depends(admin),d:Session=Depends(db)):
 content=masked(content); digest=hashlib.sha256(content.encode()).hexdigest();k=d.query(Knowledge).filter_by(sha256=digest).first()
 if not k:
  k=Knowledge(title=title,content=content,source="admin",sha256=digest);d.add(k);d.commit();d.refresh(k);d.add(KnowledgeVersion(knowledge_id=k.id,title=title,content=content,source="admin",version=1));d.add(AuditLog(event_type="knowledge_created",details=json.dumps({"knowledge_id":k.id,"user_id":u.id})));d.commit()
 return {"id":k.id,"title":k.title}
@app.get("/api/recovery/{application}")
def recovery(application:str,u=Depends(current)):
 urls={"google":"https://accounts.google.com/signin/recovery","microsoft":"https://account.live.com/password/reset","github":"https://github.com/password_reset","amazon":"https://www.amazon.com/ap/forgotpassword"};return {"application":application,"official_url":urls.get(application.lower()),"rules":["Never provide passwords, recovery codes or OTPs.","Use only the official recovery flow.","Escalate company application access to an approved administrator."]}


@app.get("/api/technicians")
def list_technicians(u=Depends(current), d:Session=Depends(db)):
    technicians = d.query(User).filter(User.role.in_(["IT Technician","technician","admin"]))
    result = []
    for v in technicians:
        profile = d.query(TechnicianProfile).filter_by(user_id=v.id).first()
        if not profile:
            profile = TechnicianProfile(user_id=v.id)
            d.add(profile)
            d.commit()
        result.append({
            "id": v.id,
            "name": v.name,
            "email": v.email,
            "role": v.role,
            "availability": profile.availability,
            "specialization": profile.specialization,
            "skills": profile.skills,
        })
    return result

@app.get("/api/technicians/dashboard")
def technician_dashboard(u=Depends(technician), d:Session=Depends(db)):
    assigned=d.query(Ticket).filter_by(owner_id=u.id).all()
    return {"technician_id":u.id,"open_tickets":sum(t.status != "Resolved" for t in assigned),"waiting_approval":sum(t.status == "Waiting Approval" for t in assigned),"resolved_tickets":sum(t.status == "Resolved" for t in assigned),"tickets":[{"id":t.id,"title":t.title,"priority":t.priority,"status":t.status} for t in assigned]}


@app.post("/api/tickets/{ticket_id}/assign")
def assign_ticket(ticket_id:int, payload:dict, u=Depends(technician), d:Session=Depends(db)):
    tech_id = payload.get("technician_id")
    t = d.query(Ticket).filter_by(id=ticket_id).first()
    if not t: raise HTTPException(404,"Ticket not found")
    tech = d.query(User).filter_by(id=tech_id).first()
    if not tech or tech.role.lower() not in ("it technician","technician","admin"):
        raise HTTPException(400,"Invalid technician selected")
    t.owner_id = tech_id
    t.assigned_at = utcnow()
    t.status = "In Progress"
    d.add(TicketComment(ticket_id=t.id,user_id=u.id,comment=f"Assigned to technician {tech.name} ({tech.id})"))
    profile = d.query(TechnicianProfile).filter_by(user_id=tech.id).first()
    if profile:
        profile.last_assigned_at = utcnow()
        profile.availability = "busy"
        d.add(profile)
    d.add(t)
    d.commit(); d.refresh(t)
    _MON.log_event("ticket_assigned",{"ticket":t.id,"technician":tech_id})
    d.add(MonitorEvent(name="ticket_assigned", details=json.dumps({"ticket":t.id,"technician":tech_id})))
    d.commit()
    return {"ok":True}


@app.post("/api/tickets/{ticket_id}/auto-assign")
def auto_assign_ticket(ticket_id:int, u=Depends(technician), d:Session=Depends(db)):
    t = d.query(Ticket).filter_by(id=ticket_id).first()
    if not t: raise HTTPException(404,"Ticket not found")
    candidate = (
        d.query(User)
        .join(TechnicianProfile, TechnicianProfile.user_id == User.id)
        .filter(User.role.in_(["IT Technician","technician","admin"]), TechnicianProfile.availability == "available")
        .order_by(TechnicianProfile.last_assigned_at.nullsfirst(), User.id)
        .first()
    )
    if not candidate:
        raise HTTPException(400, "No available technician for auto-assignment")
    t.owner_id = candidate.id
    t.status = "In Progress"
    t.assigned_at = utcnow()
    profile = d.query(TechnicianProfile).filter_by(user_id=candidate.id).first()
    if profile:
        profile.last_assigned_at = utcnow()
        profile.availability = "busy"
        d.add(profile)
    d.add(TicketComment(ticket_id=t.id,user_id=u.id,comment=f"Auto-assigned to {candidate.name} ({candidate.id})"))
    d.add(t)
    d.commit()
    _MON.log_event("ticket_auto_assigned",{"ticket":t.id,"technician":candidate.id})
    d.add(MonitorEvent(name="ticket_auto_assigned", details=json.dumps({"ticket":t.id,"technician":candidate.id})))
    d.commit()
    return {"ok":True,"technician_id":candidate.id,"technician_name":candidate.name}


@app.post("/api/tickets/{ticket_id}/comment")
def comment_ticket(ticket_id:int, payload:dict, u=Depends(current), d:Session=Depends(db)):
    text = payload.get("comment","")
    t = d.query(Ticket).filter_by(id=ticket_id).first()
    if not t: raise HTTPException(404,"Ticket not found")
    c = TicketComment(ticket_id=t.id,user_id=u.id,comment=text)
    d.add(c); d.commit()
    _MON.log_event("ticket_comment",{"ticket":t.id,"user":u.email})
    d.add(MonitorEvent(name="ticket_comment", details=json.dumps({"ticket":t.id,"user":u.email})))
    d.commit()
    return {"ok":True}


@app.post("/api/tickets/{ticket_id}/resolve")
def resolve_ticket(ticket_id:int, payload:dict, u=Depends(technician), d:Session=Depends(db)):
    resolution = payload.get("resolution","")
    t = d.query(Ticket).filter_by(id=ticket_id).first()
    if not t: raise HTTPException(404,"Ticket not found")
    t.solution = masked(resolution)
    t.status = "Waiting Approval"
    approval=ResolutionApproval(ticket_id=t.id,submitted_by=u.id,resolution=t.solution)
    d.add(approval); d.add(TicketComment(ticket_id=t.id,user_id=u.id,comment=f"Resolution submitted for approval: {t.solution}"))
    d.commit(); d.refresh(t)
    _MON.log_event("resolution_submitted",{"ticket":t.id,"by":u.email})
    d.add(MonitorEvent(name="resolution_submitted", details=json.dumps({"ticket":t.id,"by":u.email})))
    d.commit()
    candidate=KnowledgeCandidate(ticket_id=t.id,title=f"Resolved ticket: {t.title}",content=f"Issue: {t.description}\n\nVerified resolution: {t.solution}",quality_score=min(100,70+len(t.solution)//20))
    d.add(candidate); d.commit()
    return {"ok":True,"knowledge_candidate_id":candidate.id,"resolution_approval_id":approval.id,"approval_required":True}

@app.get("/api/resolution-approvals")
def resolution_approvals(u=Depends(admin),d:Session=Depends(db)):
    return [{"id":a.id,"ticket_id":a.ticket_id,"submitted_by":a.submitted_by,"status":a.status,"resolution":a.resolution,"created_at":a.created_at.isoformat()} for a in d.query(ResolutionApproval).order_by(ResolutionApproval.created_at.desc()).all()]

@app.post("/api/resolution-approvals/{approval_id}/decide")
def decide_resolution(approval_id:int,payload:dict,u=Depends(admin),d:Session=Depends(db)):
    approval=d.query(ResolutionApproval).filter_by(id=approval_id).first()
    if not approval or approval.status != "Pending Approval": raise HTTPException(404,"Pending resolution approval not found")
    approve=bool(payload.get("approve")); approval.status="Approved" if approve else "Rejected"; approval.approved_by=u.id; approval.decided_at=utcnow()
    ticket=d.query(Ticket).filter_by(id=approval.ticket_id).first(); ticket.status="Resolved" if approve else "In Progress"
    d.add(approval); d.add(ticket); d.add(AuditLog(event_type="resolution_approved" if approve else "resolution_rejected",details=json.dumps({"approval_id":approval.id,"ticket_id":ticket.id,"admin_id":u.id}))); d.commit()
    return {"ok":True,"status":approval.status}
