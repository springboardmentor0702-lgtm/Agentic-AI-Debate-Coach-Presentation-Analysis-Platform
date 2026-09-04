from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.llm_client import generate

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Confirms the backend itself is up."""
    return {"status": "ok", "message": "Backend is running."}


class LLMTestRequest(BaseModel):
    prompt: str = "Say hello in exactly five words."


@router.post("/health/llm")
def llm_check(body: LLMTestRequest):
    """
    Confirms the Gemini -> Groq fallback chain actually works with your
    real API keys. Call this after setup to prove the whole pipeline is
    wired correctly before building on top of it.
    """
    try:
        result = generate(body.prompt)
        return {"status": "ok", "response": result}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(e))
