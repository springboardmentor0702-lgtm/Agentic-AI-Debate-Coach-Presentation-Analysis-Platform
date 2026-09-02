"""
Loads settings from the .env file so no API keys are hardcoded.
"""
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set. LLM calls will fail until you add it to .env")

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is not set. No fallback available if Groq quota runs out.")
