"""Service managing multi-turn debate simulation sessions."""
import sys
import os
import uuid
from datetime import datetime

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

# Add aiml/ directory to sys.path so bare imports inside those modules work
_AIML_DIR = os.path.join(_PROJECT_ROOT, 'aiml')
if _AIML_DIR not in sys.path:
    sys.path.insert(0, _AIML_DIR)

from backend.config import settings

os.environ.setdefault('GEMINI_API_KEY', settings.GEMINI_API_KEY)
os.environ.setdefault('GROK_API_KEY', '')
os.environ.setdefault('GROQ_API_KEY', settings.GROQ_API_KEY or '')

# In-memory session store: session_id -> {simulator, metadata}
_sessions: dict = {}


def _get_llm():
    """Lazy-load LLMClient from aiml/ package."""
    from llm_client import LLMClient  # bare import works because aiml/ is in sys.path
    return LLMClient(gemini_api_key=settings.GEMINI_API_KEY)


def _get_simulator(llm, topic: str, opponent_stance: str, difficulty: str):
    from debate_simulation import DebateSimulator  # bare import
    return DebateSimulator(llm, topic, opponent_stance, difficulty)


def create_session(topic: str, opponent_stance: str, difficulty: str = "intermediate") -> dict:
    """Create a new debate session and get the AI's opening statement."""
    session_id = str(uuid.uuid4())
    llm = _get_llm()
    simulator = _get_simulator(llm, topic, opponent_stance, difficulty)

    opening = simulator.opening_statement()

    _sessions[session_id] = {
        "simulator": simulator,
        "topic": topic,
        "opponent_stance": opponent_stance,
        "difficulty": difficulty,
        "status": "active",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    return {
        "session_id": session_id,
        "opening_statement": opening,
        "topic": topic,
        "difficulty": difficulty,
    }


def submit_turn(session_id: str, user_message: str) -> dict:
    """Submit a user turn and get the opponent's response."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found")
    if session["status"] != "active":
        raise ValueError(f"Session '{session_id}' is already completed")

    simulator = session["simulator"]
    response = simulator.respond(user_message)
    session["updated_at"] = datetime.utcnow()

    transcript = simulator.get_transcript()
    turn_number = len([t for t in transcript if t["role"] == "user"])

    return {
        "opponent_response": response,
        "turn_number": turn_number,
        "session_id": session_id,
    }


def get_transcript(session_id: str) -> dict:
    """Get the full transcript for a session."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found")

    simulator = session["simulator"]
    return {
        "session_id": session_id,
        "topic": session["topic"],
        "transcript": simulator.get_transcript(),
        "status": session["status"],
    }


def end_session(session_id: str) -> dict:
    """End a debate session and return final transcript."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found")

    session["status"] = "completed"
    session["updated_at"] = datetime.utcnow()

    simulator = session["simulator"]
    return {
        "session_id": session_id,
        "topic": session["topic"],
        "transcript": simulator.get_transcript(),
        "status": "completed",
    }


def list_sessions() -> list:
    """List all debate sessions."""
    result = []
    for sid, session in _sessions.items():
        simulator = session["simulator"]
        transcript = simulator.get_transcript()
        result.append({
            "id": sid,
            "topic": session["topic"],
            "opponent_stance": session["opponent_stance"],
            "difficulty": session["difficulty"],
            "status": session["status"],
            "created_at": session["created_at"].isoformat(),
            "turn_count": len(transcript),
        })
    return result


def get_session_detail(session_id: str) -> dict:
    """Get full session details including transcript."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found")

    simulator = session["simulator"]
    return {
        "id": session_id,
        "topic": session["topic"],
        "opponent_stance": session["opponent_stance"],
        "difficulty": session["difficulty"],
        "transcript": [{"role": t["role"], "text": t["text"]} for t in simulator.get_transcript()],
        "status": session["status"],
        "created_at": session["created_at"].isoformat(),
        "updated_at": session.get("updated_at", session["created_at"]).isoformat(),
    }


def delete_session(session_id: str) -> bool:
    """Delete a session from memory."""
    if session_id in _sessions:
        del _sessions[session_id]
        return True
    return False
