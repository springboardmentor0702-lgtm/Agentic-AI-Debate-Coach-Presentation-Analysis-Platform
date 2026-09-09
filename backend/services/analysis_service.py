"""Service wrapping ai-ml agents for argument analysis & fallacy detection."""
import sys
import os

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

# ai-ml/app is the package; add ai-ml/ to sys.path so 'from app.agents...' works
_AIML_AGENTS_DIR = os.path.join(_PROJECT_ROOT, 'ai-ml')
if _AIML_AGENTS_DIR not in sys.path:
    sys.path.insert(0, _AIML_AGENTS_DIR)

from backend.config import settings

# Ensure env vars are set before ai-ml config.py runs
os.environ.setdefault('GEMINI_API_KEY', settings.GEMINI_API_KEY)
os.environ.setdefault('GROQ_API_KEY', settings.GROQ_API_KEY or '')

# Lazy-load agents to avoid import errors crashing the entire app at startup
_argument_agent = None
_fallacy_agent = None


def _get_argument_agent():
    global _argument_agent
    if _argument_agent is None:
        from app.agents.argument_analysis_agent import argument_analysis_agent
        _argument_agent = argument_analysis_agent
    return _argument_agent


def _get_fallacy_agent():
    global _fallacy_agent
    if _fallacy_agent is None:
        from app.agents.fallacy_detection_agent import fallacy_detection_agent
        _fallacy_agent = fallacy_detection_agent
    return _fallacy_agent


def analyze_argument(text: str) -> dict:
    """Run the ArgumentAnalysisAgent on the given text."""
    try:
        return _get_argument_agent().run(text)
    except Exception as e:
        return {
            "claim": "",
            "evidence": [],
            "strength_label": "unknown",
            "strength_score": 0,
            "clarity_score": 0,
            "relevance_score": 0,
            "logical_consistency_score": 0,
            "notes": f"Analysis service error: {str(e)}. Ensure GEMINI_API_KEY or GROQ_API_KEY is set.",
        }


def detect_fallacies(text: str) -> dict:
    """Run the FallacyDetectionAgent on the given text."""
    try:
        return _get_fallacy_agent().run(text)
    except Exception as e:
        return {
            "fallacies_found": [],
            "status": "error",
            "message": f"Fallacy detection error: {str(e)}. Ensure GEMINI_API_KEY or GROQ_API_KEY is set.",
        }


def full_analysis(text: str) -> dict:
    """Run both argument analysis and fallacy detection."""
    analysis = analyze_argument(text)
    fallacies = detect_fallacies(text)
    return {
        "argument_analysis": analysis,
        "fallacy_detection": fallacies,
    }
