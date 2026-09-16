from pydantic import BaseModel
from typing import Optional
from app.schemas.fallacy import FallacyReportSchema
from app.schemas.presentation import PresentationMetricsSchema
from app.schemas.delivery import DeliveryAssessmentSchema
from app.schemas.argument_analysis import ArgumentAnalysisSchema


class DebateTurnResponseSchema(BaseModel):
    session_id: str
    user_transcript: str
    ai_rebuttal: str
    presentation_metrics: PresentationMetricsSchema
    fallacy_metrics: FallacyReportSchema
    delivery_metrics: DeliveryAssessmentSchema
    argument_analysis: ArgumentAnalysisSchema
    context_summary: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str
