from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    ai_mock_mode: bool

