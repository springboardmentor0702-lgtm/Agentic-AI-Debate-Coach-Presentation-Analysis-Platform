"""Service wrapping ai-ml agents for argument analysis & fallacy detection."""
import sys
import os

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

_AIML_DIR = os.path.join(_PROJECT_ROOT, 'ai-ml')
if _AIML_DIR not in sys.path:
    sys.path.insert(0, _AIML_DIR)

from backend.config import settings

# Ensure env vars are set before ai-ml config.py runs
os.environ.setdefault('GEMINI_API_KEY', settings.GEMINI_API_KEY)
os.environ.setdefault('GROQ_API_KEY', '')

from app.agents.argument_analysis_agent import argument_analysis_agent
from app.agents.fallacy_detection_agent import fallacy_detection_agent


def analyze_argument(text: str) -> dict:
    """Run the ArgumentAnalysisAgent on the given text."""
    return argument_analysis_agent.run(text)


def detect_fallacies(text: str) -> dict:
    """Run the FallacyDetectionAgent on the given text."""
    return fallacy_detection_agent.run(text)


def full_analysis(text: str) -> dict:
    """Run both argument analysis and fallacy detection."""
    analysis = analyze_argument(text)
    fallacies = detect_fallacies(text)
    return {
        "argument_analysis": analysis,
        "fallacy_detection": fallacies,
    }
