import re
from typing import List, Dict


# ============================================================
# BASIC TEXT UTILITIES
# ============================================================

STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were",
    "and", "or", "but", "to", "of", "in", "on",
    "for", "with", "this", "that", "it", "be",
    "as", "at", "by", "from", "about", "into",
    "than", "then", "they", "them", "their",
    "we", "our", "you", "your", "i", "my"
}


def clean_text(text: str) -> str:

    return re.sub(
        r"\s+",
        " ",
        text.strip()
    )


def sentences(text: str) -> List[str]:

    text = clean_text(text)

    if not text:
        return []

    return [
        s.strip()
        for s in re.split(
            r"(?<=[.!?])\s+",
            text
        )
        if s.strip()
    ]


def words(text: str) -> List[str]:

    return re.findall(
        r"\b[\w'-]+\b",
        text.lower()
    )


def keyword_set(text: str):

    return {
        word
        for word in words(text)
        if len(word) > 2
        and word not in STOP_WORDS
    }


# ============================================================
# CLAIM IDENTIFICATION
# ============================================================

CLAIM_PATTERNS = [
    r"\bshould\b",
    r"\bmust\b",
    r"\bneed to\b",
    r"\bought to\b",
    r"\btherefore\b",
    r"\bthus\b",
    r"\bclearly\b",
    r"\bin my opinion\b",
    r"\bi believe\b",
    r"\bwe should\b",
    r"\bthis means\b",
    r"\bthe best\b"
]


def identify_claims(text: str) -> List[Dict]:

    result = []

    for index, sentence in enumerate(
        sentences(text)
    ):

        lower = sentence.lower()

        matched = any(
            re.search(
                pattern,
                lower
            )
            for pattern in CLAIM_PATTERNS
        )

        if matched or index == len(sentences(text)) - 1:

            result.append({
                "sentence": sentence,
                "type": "claim",
                "confidence": 0.78
                if matched
                else 0.60
            })

    if not result and text.strip():

        result.append({
            "sentence": sentences(text)[0],
            "type": "claim",
            "confidence": 0.55
        })

    return result


# ============================================================
# EVIDENCE EVALUATION
# ============================================================

EVIDENCE_MARKERS = [
    "because",
    "according to",
    "research",
    "study",
    "studies",
    "data",
    "evidence",
    "survey",
    "report",
    "statistics",
    "percent",
    "percentage",
    "experiment",
    "published",
    "source"
]


def evaluate_evidence(text: str) -> Dict:

    lower = text.lower()

    matched = [
        marker
        for marker in EVIDENCE_MARKERS
        if marker in lower
    ]

    numbers = re.findall(
        r"\b\d+(?:\.\d+)?%?\b",
        text
    )

    if matched and numbers:

        strength = 90

    elif matched:

        strength = 72

    elif numbers:

        strength = 62

    else:

        strength = 35

    return {
        "score": strength,
        "strength": (
            "strong"
            if strength >= 75
            else "moderate"
            if strength >= 55
            else "weak"
        ),
        "evidence_markers": matched,
        "numeric_claims": numbers,
        "explanation": (
            "The argument contains evidence-related "
            "language and supporting information."
            if strength >= 70
            else
            "The argument contains limited explicit "
            "evidence. Adding reliable sources or data "
            "would improve credibility."
        )
    }


# ============================================================
# REASONING QUALITY
# ============================================================

REASONING_MARKERS = [
    "because",
    "therefore",
    "however",
    "although",
    "since",
    "thus",
    "so",
    "consequently",
    "as a result",
    "for this reason"
]


def analyze_reasoning(text: str) -> Dict:

    lower = text.lower()

    found = [
        marker
        for marker in REASONING_MARKERS
        if marker in lower
    ]

    sentence_count = max(
        len(sentences(text)),
        1
    )

    marker_score = min(
        len(found) * 12,
        45
    )

    structure_score = min(
        sentence_count * 8,
        35
    )

    score = min(
        20 + marker_score + structure_score,
        100
    )

    if score >= 75:

        quality = "strong"

    elif score >= 55:

        quality = "moderate"

    else:

        quality = "weak"

    return {
        "score": score,
        "quality": quality,
        "reasoning_markers": found,
        "explanation": (
            "The response presents recognizable "
            "connections between claims and reasons."
            if score >= 65
            else
            "The reasoning would benefit from clearer "
            "connections between claims, evidence and conclusions."
        )
    }


# ============================================================
# CLARITY
# ============================================================

def clarity_score(text: str) -> int:

    ws = words(text)
    ss = sentences(text)

    if not ws:
        return 0

    avg_sentence_length = (
        len(ws) / max(len(ss), 1)
    )

    score = 90

    if avg_sentence_length > 30:
        score -= 20

    elif avg_sentence_length > 22:
        score -= 10

    if len(ws) < 15:
        score -= 15

    return max(
        min(score, 100),
        20
    )


# ============================================================
# RELEVANCE
# ============================================================

def relevance_score(
    text: str,
    topic: str = ""
) -> int:

    if not topic.strip():

        return 70

    text_words = keyword_set(text)
    topic_words = keyword_set(topic)

    if not topic_words:

        return 70

    overlap = (
        len(text_words & topic_words)
        /
        len(topic_words)
    )

    return max(
        20,
        min(
            100,
            int(50 + overlap * 50)
        )
    )


# ============================================================
# LOGICAL CONSISTENCY
# ============================================================

def logical_consistency(text: str) -> int:

    lower = text.lower()

    score = 75

    contradictory_pairs = [
        ("always", "never"),
        ("everyone", "no one"),
        ("all", "none"),
        ("must", "cannot")
    ]

    for first, second in contradictory_pairs:

        if first in lower and second in lower:

            score -= 15

    if "however" in lower:
        score += 5

    if "therefore" in lower:
        score += 5

    return max(
        20,
        min(score, 100)
    )


# ============================================================
# PERSUASIVENESS
# ============================================================

def persuasiveness_score(
    evidence: int,
    reasoning: int,
    clarity: int
) -> int:

    return int(
        evidence * 0.35
        +
        reasoning * 0.35
        +
        clarity * 0.30
    )


# ============================================================
# FALLACY DETECTION
# ============================================================

FALLACIES = {

    "ad_hominem": {
        "name": "Ad Hominem",
        "patterns": [
            r"\bidiot\b",
            r"\bstupid\b",
            r"\bdumb\b",
            r"\buneducated\b",
            r"\bignorant\b",
            r"\bthey are a liar\b",
            r"\bhe is a liar\b",
            r"\bshe is a liar\b"
        ],
        "explanation":
            "The argument attacks a person instead of addressing their claim.",
        "correction":
            "Focus on the evidence and reasoning behind the opposing claim."
    },

    "straw_man": {
        "name": "Straw Man",
        "patterns": [
            r"\bso you are saying\b",
            r"\bso you're saying\b",
            r"\byou basically want\b",
            r"\byou want everyone to\b",
            r"\bthey want everyone to\b"
        ],
        "explanation":
            "The opponent's position is represented in an exaggerated or distorted form.",
        "correction":
            "Restate the opponent's actual position accurately before responding."
    },

    "false_dilemma": {
        "name": "False Dilemma",
        "patterns": [
            r"\beither\b.*\bor\b",
            r"\bonly two choices\b",
            r"\beither we\b.*\bor we\b",
            r"\byou are either\b"
        ],
        "explanation":
            "The argument presents limited options as if they were the only possible choices.",
        "correction":
            "Consider additional alternatives and intermediate positions."
    },

    "slippery_slope": {
        "name": "Slippery Slope",
        "patterns": [
            r"\bif we allow\b",
            r"\bnext thing you know\b",
            r"\beventually\b.*\bwill\b",
            r"\bthen everyone will\b",
            r"\bthis will lead to\b"
        ],
        "explanation":
            "The argument assumes that one event will inevitably lead to extreme consequences.",
        "correction":
            "Provide evidence for each causal step instead of assuming the chain is inevitable."
    },

    "appeal_to_authority": {
        "name": "Appeal to Authority",
        "patterns": [
            r"\ban expert said\b",
            r"\ba celebrity said\b",
            r"\bfamous person said\b",
            r"\bbecause .* expert\b",
            r"\baccording to .* authority\b"
        ],
        "explanation":
            "An authority is treated as sufficient proof without examining relevant evidence.",
        "correction":
            "Evaluate the quality of the authority's evidence and expertise."
    },

    "circular_reasoning": {
        "name": "Circular Reasoning",
        "patterns": [
            r"\bit is true because it is true\b",
            r"\btrue because .* true\b",
            r"\bbecause .* therefore .* because\b"
        ],
        "explanation":
            "The conclusion is effectively used as its own justification.",
        "correction":
            "Support the conclusion with independent evidence or premises."
    },

    "hasty_generalization": {
        "name": "Hasty Generalization",
        "patterns": [
            r"\beveryone\b",
            r"\bno one\b",
            r"\ball people\b",
            r"\bpeople always\b",
            r"\bpeople never\b",
            r"\bthey always\b",
            r"\bthey never\b"
        ],
        "explanation":
            "A broad conclusion is drawn from insufficient evidence.",
        "correction":
            "Use a representative sample and avoid unsupported universal claims."
    },

    "red_herring": {
        "name": "Red Herring",
        "patterns": [
            r"\bbut what about\b",
            r"\bwhat about .* instead\b",
            r"\bthat reminds me\b",
            r"\bthe real issue is\b"
        ],
        "explanation":
            "The argument introduces an unrelated issue that distracts from the original question.",
        "correction":
            "Return to the original claim and address its relevant evidence."
    }
}


def detect_fallacies(text: str) -> List[Dict]:

    lower = text.lower()

    detected = []

    for key, data in FALLACIES.items():

        matches = []

        for pattern in data["patterns"]:

            result = re.search(
                pattern,
                lower
            )

            if result:

                matches.append(
                    result.group(0)
                )

        if matches:

            detected.append({
                "type": key,
                "name": data["name"],
                "confidence": min(
                    0.95,
                    0.65 + len(matches) * 0.08
                ),
                "evidence": matches,
                "explanation":
                    data["explanation"],
                "correction":
                    data["correction"]
            })

    return detected


# ============================================================
# ARGUMENT STRENGTH
# ============================================================

def argument_strength(
    evidence: int,
    reasoning: int,
    clarity: int,
    relevance: int,
    consistency: int
) -> int:

    score = (
        evidence * 0.25
        +
        reasoning * 0.25
        +
        clarity * 0.15
        +
        relevance * 0.15
        +
        consistency * 0.20
    )

    return round(score)


# ============================================================
# COMPLETE ANALYSIS
# ============================================================

def analyze_argument(
    text: str,
    topic: str = ""
) -> Dict:

    text = clean_text(text)

    if not text:

        raise ValueError(
            "Argument text cannot be empty."
        )

    claims = identify_claims(text)

    evidence = evaluate_evidence(text)

    reasoning = analyze_reasoning(text)

    clarity = clarity_score(text)

    relevance = relevance_score(
        text,
        topic
    )

    consistency = logical_consistency(
        text
    )

    persuasion = persuasiveness_score(
        evidence["score"],
        reasoning["score"],
        clarity
    )

    fallacies = detect_fallacies(text)

    strength = argument_strength(
        evidence["score"],
        reasoning["score"],
        clarity,
        relevance,
        consistency
    )

    return {

        "text": text,

        "claims": claims,

        "evidence": evidence,

        "reasoning": reasoning,

        "evaluation": {

            "clarity": clarity,

            "relevance": relevance,

            "evidence_strength":
                evidence["score"],

            "logical_consistency":
                consistency,

            "persuasiveness":
                persuasion,

            "argument_strength":
                strength
        },

        "fallacies": fallacies,

        "fallacy_count":
            len(fallacies),

        "overall_feedback":
            generate_feedback(
                clarity,
                relevance,
                evidence["score"],
                consistency,
                persuasion,
                fallacies
            )
    }


# ============================================================
# FEEDBACK
# ============================================================

def generate_feedback(
    clarity,
    relevance,
    evidence,
    consistency,
    persuasion,
    fallacies
):

    feedback = []

    if clarity < 60:

        feedback.append(
            "Use shorter and more direct sentences."
        )

    else:

        feedback.append(
            "The argument is reasonably clear."
        )

    if relevance < 60:

        feedback.append(
            "Connect each point more directly "
            "to the debate topic."
        )

    if evidence < 60:

        feedback.append(
            "Add reliable evidence, data or sources."
        )

    if consistency < 60:

        feedback.append(
            "Check whether the conclusion follows "
            "from the premises."
        )

    if persuasion < 60:

        feedback.append(
            "Strengthen the argument with evidence "
            "and a clearer reasoning chain."
        )

    if fallacies:

        feedback.append(
            f"Review the {len(fallacies)} "
            "detected logical fallacy/fallacies."
        )

    if not feedback:

        feedback.append(
            "The argument demonstrates a solid "
            "combination of reasoning and evidence."
        )

    return feedback
