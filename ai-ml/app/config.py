"""
Loads settings from the .env file so no API keys are ever hardcoded in the code.
Checks both ai-ml/.env and backend/.env for credentials.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Try loading from current dir, ai-ml dir, and backend dir
base_dir = Path(__file__).resolve().parent.parent
load_dotenv(base_dir / ".env")
load_dotenv(base_dir.parent / "backend" / ".env")

# --- Primary provider: Groq ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# --- Fallback provider: Gemini ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")

if not GROQ_API_KEY and not GEMINI_API_KEY:
    print("[AI Engine] Note: No external LLM API keys set (GROQ_API_KEY / GEMINI_API_KEY). Using built-in local English reasoning engine.")
