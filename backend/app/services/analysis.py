import json,re
from app.providers import provider_manager

FALLACIES=["Ad Hominem","Straw Man","False Dilemma","Slippery Slope","Appeal to Authority","Circular Reasoning","Hasty Generalization","Red Herring"]
SYSTEM="""You are an educational debate intelligence engine. Return concise structured JSON when requested. Never invent measurements. Distinguish estimates and unavailable values. Analyze claims, evidence, reasoning, strength, clarity, relevance, evidence quality, logical consistency and persuasiveness."""

def heuristic_analysis(text):
    sentences=[s.strip() for s in re.split(r'[.!?]+',text) if s.strip()]
    claims=sentences[:3] or [text]
    evidence=[s for s in sentences if re.search(r'\b(study|research|data|survey|according|percent|evidence|report)\b',s,re.I)]
    words=text.split(); evidence_score=min(95,55+len(evidence)*12); clarity=max(45,min(95,90-(len(words)//30)*5))
    strength=round((clarity+evidence_score+70+72+68)/5)
    return {"claims":claims,"evidence":evidence,"reasoning":"The argument is evaluated from its explicit premises and stated conclusion.","strength":strength,"problems":["Evidence should be tied explicitly to each claim."] if not evidence else ["Make the warrant between evidence and conclusion explicit."],"improvement":"State the claim, cite the strongest evidence, explain the warrant, and address the best counterexample.","clarity":clarity,"relevance":78,"evidence_quality":evidence_score,"logical_consistency":72,"persuasiveness":68,"source":"demo"}

async def analyze_argument(text):
    r=await provider_manager.generate(SYSTEM,"Return strict JSON with keys claims,evidence,reasoning,strength,problems,improvement,clarity,relevance,evidence_quality,logical_consistency,persuasiveness for this argument. strength,clarity,relevance,evidence_quality,logical_consistency,persuasiveness MUST each be a number from 0 to 100, never a label or sentence. problems must be an array of strings. claims and evidence must be arrays of strings. Do not put explanations inside numeric fields. Argument:\n"+text,json_mode=True)
    try:
        data=json.loads(r["text"])
        data["source"]=r["provider"]
        return data
    except Exception:
        return heuristic_analysis(text) | {"source":r["provider"]}

async def detect_fallacies(text):
    r=await provider_manager.generate(SYSTEM,"Return JSON {fallacies:[{name,statement,explanation,why_problematic,correction,improved_version}]} and only use supported names from this list: "+", ".join(FALLACIES)+". Text:\n"+text,json_mode=True)
    try:
        data=json.loads(r["text"]); data["source"]=r["provider"]; return data
    except Exception:
        f=[]
        low=text.lower()
        if any(x in low for x in ["idiot","stupid","ignorant"]): f.append({"name":"Ad Hominem","statement":text,"explanation":"The response attacks a person instead of addressing the argument.","why_problematic":"Personal traits do not establish whether a claim is true.","correction":"Address the claim and evidence directly.","improved_version":"Evaluate the evidence and reasoning rather than the speaker."})
        if "always" in low or "never" in low: f.append({"name":"Hasty Generalization","statement":text,"explanation":"A broad conclusion may exceed the available examples.","why_problematic":"Limited evidence cannot support a universal conclusion.","correction":"Narrow the claim to what the evidence supports.","improved_version":"The examples suggest this may happen under specific conditions."})
        return {"fallacies":f,"source":r["provider"]}

async def counterarguments(text):
    prompt = """Analyze the learner's EXACT argument below and build the strongest opposing case.
Return strict JSON with:
logical_rebuttal, evidence_rebuttal, ethical_counterargument, practical_counterargument,
policy_counterargument, alternative_perspective, challenge_questions (array), strategy,
argument_specificity, evidence_challenge_score, logic_challenge_score, directness_score, clarity_score.
Scores are 0-100 and describe the quality of the generated counterargument, not the learner.
Every response must refer to the actual claims/premises in the supplied argument. Do not use generic
placeholders. Do not invent facts, studies, statistics, citations, or context not supplied by the learner.
If the learner provides no evidence, explicitly identify that evidence gap instead of inventing evidence."""
    r = await provider_manager.generate(SYSTEM, prompt + "\\n\\nLEARNER ARGUMENT:\\n" + text, json_mode=True)
    try:
        d = json.loads(r["text"])
        required = [
            "logical_rebuttal", "evidence_rebuttal", "ethical_counterargument",
            "practical_counterargument", "policy_counterargument", "alternative_perspective",
            "challenge_questions", "strategy"
        ]
        if not all(d.get(k) for k in required):
            raise ValueError("Incomplete counterargument response")
        d["challenge_questions"] = d["challenge_questions"] if isinstance(d["challenge_questions"], list) else [str(d["challenge_questions"])]
        # Guard against a provider returning a generic canned answer: require at
        # least one substantive learner term to appear in the generated case.
        learner_terms={x.lower() for x in re.findall(r"[A-Za-z]{6,}", text)}
        generated=" ".join(str(d.get(k,"")) for k in required).lower()
        if learner_terms and not any(term in generated for term in learner_terms):
            raise ValueError("Provider response was not sufficiently specific to the learner argument")
        d["source"] = r["provider"]
        return d
    except Exception:
        # Final fallback remains input-derived. It never claims outside evidence.
        sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
        claim = sentences[0] if sentences else text
        terms = re.findall(r"[A-Za-z]{5,}", text)
        focus = ", ".join(terms[:5]) if terms else "the stated premise"
        return {
            "logical_rebuttal": f"Your position depends on the premise that “{claim}”. The strongest logical challenge is to test whether that premise necessarily supports the conclusion.",
            "evidence_rebuttal": f"The argument does not establish what evidence would support “{claim}”. Specify the evidence needed to distinguish your claim from alternatives involving {focus}.",
            "ethical_counterargument": f"An opposing view can ask whether the benefits claimed for “{claim}” are distributed fairly and whether the same principle should apply in comparable cases.",
            "practical_counterargument": f"Even if the goal in “{claim}” is desirable, implementation may create trade-offs, incentives, or constraints that the argument has not addressed.",
            "policy_counterargument": f"A narrower policy could address the concern behind “{claim}” while avoiding the full commitment implied by the proposed position.",
            "alternative_perspective": f"Steelman the opposite view by accepting the strongest part of “{claim}”, then identify the condition under which that strength would not justify the full conclusion.",
            "challenge_questions": [
                f"What evidence would prove the key premise behind “{claim}”?",
                "What is the strongest counterexample to your conclusion?",
                "What trade-off would your proposal create?"
            ],
            "strategy": "Concede any valid point, isolate the disputed premise, then answer it directly without adding unsupported facts.",
            "argument_specificity": min(100, 55 + len(claim.split()) * 2),
            "evidence_challenge_score": 55 if re.search(r"(study|research|data|survey|source|evidence|report|percent)", text, re.I) else 75,
            "logic_challenge_score": min(95, 55 + len(sentences) * 8),
            "directness_score": min(95, 60 + min(30, len(claim.split()) * 2)),
            "clarity_score": max(50, min(95, 88 - max(0, len(text.split()) - 120) * 0.1)),
            "source": "demo"
        }
