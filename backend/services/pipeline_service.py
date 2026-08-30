"""Service wrapping the full aiml debate coaching pipeline."""
import sys
import os

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from backend.config import settings
os.environ.setdefault('GEMINI_API_KEY', settings.GEMINI_API_KEY)
os.environ.setdefault('GROK_API_KEY', '')

from aiml.llm_client import LLMClient
from aiml.counterargument import run_counterargument_stage
from aiml.evaluation import evaluate_performance
from aiml.coaching import run_coaching_stage
from aiml.Main import run_pipeline


def _get_llm() -> LLMClient:
    return LLMClient(gemini_api_key=settings.GEMINI_API_KEY)


def generate_counterarguments(topic: str, user_argument: str) -> dict:
    """Stage 1: Extract claims, analyze argument, generate counterarguments."""
    llm = _get_llm()
    return run_counterargument_stage(llm, topic, user_argument)


def evaluate_debate(topic: str, transcript: list[dict]) -> dict:
    """Stage 3: Evaluate user's debate performance."""
    llm = _get_llm()
    return evaluate_performance(llm, topic, transcript)


def generate_coaching(evaluation: dict) -> dict:
    """Stages 4+5: Generate coaching feedback + personalized learning plan."""
    llm = _get_llm()
    return run_coaching_stage(llm, evaluation)


def run_full_pipeline(topic: str, user_argument: str, opponent_stance: str,
                      user_turns: list[str], difficulty: str = "intermediate") -> dict:
    """Run the complete end-to-end pipeline (all 5 stages)."""
    return run_pipeline(topic, user_argument, opponent_stance, user_turns, difficulty)
