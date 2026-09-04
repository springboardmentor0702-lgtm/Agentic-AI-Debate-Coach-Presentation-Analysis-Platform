"""Public conceptual agent pipeline boundary; runtime orchestration lives in backend/app."""
from backend.app.agents import AGENTS

def pipeline_names():
    return list(AGENTS.keys())
