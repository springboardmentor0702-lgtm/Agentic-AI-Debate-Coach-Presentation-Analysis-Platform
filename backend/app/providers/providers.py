import json, time, re, httpx
from abc import ABC, abstractmethod
from app.core.config import settings

class ProviderError(Exception):
    pass

class AIProvider(ABC):
    name = "base"
    @abstractmethod
    async def generate(self, system: str, user: str, json_mode: bool = False) -> str: ...
    async def transcribe(self, audio: bytes, filename: str):
        raise ProviderError("Transcription unavailable")

class GroqProvider(AIProvider):
    name = "groq"
    preferred_models = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ]

    async def transcribe(self, audio, filename):
        if not settings.groq_api_key:
            raise ProviderError("Groq API key is not configured")
        headers={"Authorization":f"Bearer {settings.groq_api_key}"}
        files={"file":(filename,audio),"model":(None,"whisper-large-v3-turbo")}
        async with httpx.AsyncClient(timeout=60) as client:
            r=await client.post("https://api.groq.com/openai/v1/audio/transcriptions",headers=headers,files=files)
            if r.status_code>=400:
                raise ProviderError(f"Groq STT HTTP {r.status_code}: {r.text[:250]}")
            data=r.json(); text=data.get("text")
            if not text:
                raise ProviderError("Invalid Groq transcription response")
            return text

    async def _active_models(self, client):
        try:
            r=await client.get("https://api.groq.com/openai/v1/models",headers={"Authorization":f"Bearer {settings.groq_api_key}"},timeout=15)
            if r.status_code >= 400:
                return []
            rows=r.json().get("data",[])
            return [x["id"] for x in rows if x.get("active") and "text" in x.get("input_modalities",["text"])]
        except Exception:
            return []

    async def generate(self, system, user, json_mode=False):
        if not settings.groq_api_key:
            raise ProviderError("Groq API key is not configured")
        headers={"Authorization":f"Bearer {settings.groq_api_key}","Content-Type":"application/json"}
        requested=settings.groq_model.strip()
        async with httpx.AsyncClient(timeout=45) as client:
            async def call(model):
                payload={"model":model,"messages":[{"role":"system","content":system},{"role":"user","content":user}],"temperature":0.25,"max_tokens":500}
                if json_mode:
                    payload["response_format"]={"type":"json_object"}
                return await client.post("https://api.groq.com/openai/v1/chat/completions",headers=headers,json=payload)

            r=await call(requested)
            if r.status_code == 404:
                active=await self._active_models(client)
                candidates=[]
                for m in self.preferred_models + active:
                    if m not in candidates:
                        candidates.append(m)
                for model in candidates:
                    if model == requested:
                        continue
                    retry=await call(model)
                    if retry.status_code < 400:
                        settings.groq_model=model
                        r=retry
                        break
                if r.status_code == 404:
                    raise ProviderError(f"Groq model '{requested}' is unavailable")
            if r.status_code >= 400:
                raise ProviderError(f"Groq HTTP {r.status_code}: {r.text[:300]}")
            try:
                return r.json()["choices"][0]["message"]["content"]
            except Exception as e:
                raise ProviderError(f"Invalid Groq response: {e}")

class GeminiProvider(AIProvider):
    name = "gemini"
    async def generate(self, system, user, json_mode=False):
        if not settings.gemini_api_key:
            raise ProviderError("Gemini API key is not configured")
        url=f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
        config={"temperature":0.25,"maxOutputTokens":500}
        if json_mode:
            config["responseMimeType"]="application/json"
        payload={"systemInstruction":{"parts":[{"text":system}]},"contents":[{"parts":[{"text":user}]}],"generationConfig":config}
        async with httpx.AsyncClient(timeout=45) as client:
            r=await client.post(url,json=payload)
            if r.status_code >= 400:
                raise ProviderError(f"Gemini HTTP {r.status_code}: {r.text[:300]}")
            try:
                return r.json()["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                raise ProviderError(f"Invalid Gemini response: {e}")

class DemoProvider(AIProvider):
    name="demo"

    async def generate(self, system, user, json_mode=False):
        # Demo mode is deterministic and input-derived. It is never presented as
        # a real external AI response.
        text=user.strip()
        lower=text.lower()
        if "case_overview" in lower or "case review" in lower or lower.startswith("case:"):
            import re as _re
            raw=re.split(r"CASE:\s*",text,maxsplit=1,flags=re.I)[-1].strip()
            sentences=[x.strip() for x in _re.split(r"(?<=[.!?])\s+",raw) if x.strip()]
            claims=sentences[:3] or [raw]
            evidence=[x for x in sentences if _re.search(r"\b(study|research|data|survey|source|evidence|report|percent|according)\b",x,_re.I)]
            fallacies=[]
            if _re.search(r"\b(always|never)\b",raw,_re.I):
                fallacies.append({"name":"Hasty Generalization","location":"Supplied case","explanation":"The case uses a broad universal claim without enough stated examples or support.","statement":raw[:240]})
            if _re.search(r"\b(idiot|stupid|ignorant)\b",raw,_re.I):
                fallacies.append({"name":"Ad Hominem","location":"Supplied case","explanation":"A person is attacked instead of addressing the claim.","statement":raw[:240]})
            evidence_text="; ".join(evidence) if evidence else "No explicit evidence, study, data, survey, source, report, or citation was identified in the supplied case."
            quality=min(95,50+len(claims)*8+len(evidence)*10)
            logic=min(92,52+len(sentences)*5+(10 if _re.search(r"\b(because|therefore|thus|so)\b",raw,_re.I) else 0))
            evidence_score=min(95,40+len(evidence)*15)
            persuasion=min(92,50+min(30,len(raw.split())//12))
            critical=min(92,50+len(claims)*7+(8 if evidence else 0))
            return json.dumps({"case_overview":{"title":claims[0][:100],"topic":claims[0][:180],"main_issue":claims[0],"context":"Derived only from the supplied case text."},"arguments":[{"claim":c,"reasoning":"Reasoning was inferred only from the supplied sentence and its surrounding case text.","evidence":next((e for e in evidence if e in c),"No explicit evidence attached to this claim.")} for c in claims],"fallacies":fallacies,"counterarguments":[{"argument":f"Challenge the premise that: {claims[0][:180]}","response":"Test whether the stated reason is sufficient for the conclusion and compare it with the strongest alternative interpretation."}],"evidence_review":{"provided":evidence_text,"gaps":"Claims without explicit support remain unverified; no outside evidence was assumed.","additional_evidence":"Add verifiable evidence that directly tests the main claim and any causal or comparative assertion."},"overall_case_assessment":{"argument_quality":quality,"logic":logic,"evidence":evidence_score,"persuasiveness":persuasion,"critical_thinking":critical},"ai_conclusion":{"strengths":["The review identifies the actual claims stated in the supplied case."],"weaknesses":["Some conclusions may rely on premises that are not explicitly supported by evidence." if not evidence else "The case should make the warrant between evidence and conclusion more explicit."],"improvements":["Connect each major claim to explicit evidence and test the strongest opposing premise."]}})
        if "counter" in lower or "rebuttal" in lower:
            m=re.search(r"LEARNER ARGUMENT:\s*(.*)", text, re.I|re.S)
            arg=(m.group(1).strip() if m else text).split("\n")[0].strip()
            if len(arg)>180: arg=arg[:180].rstrip()+"…"
            data={
                "logical_rebuttal":f"The opposing side would challenge the premise in your statement: “{arg}”. Show why that premise must lead to your conclusion rather than merely being consistent with it.",
                "evidence_rebuttal":f"Your statement needs evidence tied directly to “{arg}”. Identify the evidence that would distinguish your claim from the strongest alternative explanation.",
                "ethical_counterargument":f"An opponent can question who benefits and who bears the costs if the position in “{arg}” is adopted, and whether the same principle should apply in comparable cases.",
                "practical_counterargument":f"Even if the goal in “{arg}” is desirable, implementation may create trade-offs, incentives or constraints that the argument has not addressed.",
                "policy_counterargument":f"A narrower policy could address the concern behind “{arg}” while avoiding the full commitment of the proposed position.",
                "alternative_perspective":f"Steelman the opposite view: accept the strongest part of “{arg}”, then identify the condition under which that strength would not justify the full conclusion.",
                "challenge_questions":["What evidence would prove the key premise behind your argument?","What is the strongest counterexample to your conclusion?","What trade-off would your proposal create?"],
                "strategy":"Concede any valid point, isolate the disputed premise, then answer it directly without adding unsupported facts.",
                "argument_specificity":min(100,55+len(arg.split())*2),
                "evidence_challenge_score":75,
                "logic_challenge_score":70,
                "directness_score":80,
                "clarity_score":80
            }
            return json.dumps(data)
        if "fallac" in lower:
            return json.dumps({"fallacies":[]})
        if "coach" in lower or "plan" in lower:
            return json.dumps({"answer":"Demo Mode: the real provider was unavailable. Use the stored learner analytics shown in the dashboard as the source of truth.","next_steps":["Complete another real assessment","Review the weakest measured skill","Regenerate the adaptive plan"]})
        if "debate" in lower:
            return json.dumps({"response":"I want to test the strongest assumption in your actual argument. What evidence supports it, and what would you say to the best counterexample?","challenge_type":"evidence_and_logic","difficulty":"adaptive"})
        return json.dumps({"answer":"Demo Mode: the configured real providers were unavailable, so this is a deterministic fallback.","note":"Demo Mode"})


class ProviderManager:
    def __init__(self):
        self.providers={"groq":GroqProvider(),"gemini":GeminiProvider(),"demo":DemoProvider()}

    async def transcribe(self,audio,filename):
        errors=[]
        for name in ["groq","gemini","demo"]:
            try:
                if name=="demo":
                    return {"text":"Demo transcript: no live transcription provider was available.","provider":"demo","estimated":True}
                text=await self.providers[name].transcribe(audio,filename)
                return {"text":text,"provider":name,"estimated":False}
            except Exception as e:
                errors.append(f"{name}: {e}")
        raise ProviderError("; ".join(errors))

    async def generate(self, system, user, requested=None, json_mode=False):
        primary=requested or settings.ai_provider
        order=[primary]
        if settings.ai_fallback_enabled:
            for p in ["groq","gemini","demo"]:
                if p not in order: order.append(p)
        errors=[]
        for name in order:
            try:
                text=await self.providers[name].generate(system,user,json_mode=json_mode)
                if json_mode:
                    try: json.loads(text)
                    except Exception as exc: raise ProviderError(f"{name} returned malformed JSON: {exc}")
                return {"text":text,"provider":name,"fallback_used":name!=primary}
            except Exception as e:
                errors.append(f"{name}: {e}")
        raise ProviderError("; ".join(errors))

provider_manager=ProviderManager()
