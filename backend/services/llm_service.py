"""Unified LLM service — initializes a Gemini-powered LLMClient for the pipeline."""
import sys
import os

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

_AIML_DIR = os.path.join(_PROJECT_ROOT, 'ai-ml')
if _AIML_DIR not in sys.path:
    sys.path.insert(0, _AIML_DIR)

from backend.config import settings

# Set environment variables BEFORE importing AIML modules
os.environ['GEMINI_API_KEY'] = settings.GEMINI_API_KEY
os.environ.setdefault('GROK_API_KEY', '')  # Not used but prevents import errors
os.environ.setdefault('GROQ_API_KEY', settings.GEMINI_API_KEY)  # ai-ml fallback
os.environ.setdefault('GEMINI_API_KEY', settings.GEMINI_API_KEY)

def get_aiml_llm_client():
    """Returns an LLMClient instance from the aiml/ pipeline (Gemini-powered)."""
    from aiml.llm_client import LLMClient
    return LLMClient(gemini_api_key=settings.GEMINI_API_KEY)
