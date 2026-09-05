"""
Loads settings from the .env file so no API keys are ever hardcoded in the code.
"""
import os

try:
    from dotenv import load_dotenv
except ImportError:  # Local deterministic mode does not require python-dotenv.
    def load_dotenv() -> bool:
        return False

load_dotenv()

# --- Primary provider: Groq ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# --- Fallback provider: Gemini (used automatically if Groq fails/quota runs out) ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")
# `auto` uses providers when keys are available and falls back locally; `local`
# never calls external providers; `provider` preserves provider-only behavior.
AI_ML_MODE = os.getenv("AI_ML_MODE", "auto").lower()
if AI_ML_MODE not in {"auto", "local", "provider"}:
    AI_ML_MODE = "auto"

if not GROQ_API_KEY and AI_ML_MODE == "provider":
    print("WARNING: GROQ_API_KEY is not set. Provider-only calls will fail until you add it to .env")

if not GEMINI_API_KEY and AI_ML_MODE == "provider":
    print("WARNING: GEMINI_API_KEY is not set. No provider fallback is available if Groq fails.")
