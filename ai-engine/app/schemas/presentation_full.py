from pydantic import BaseModel
from app.schemas.presentation import PresentationMetricsSchema
from app.schemas.delivery import DeliveryAssessmentSchema
from app.schemas.content_review import ContentReviewSchema


class PresentationFullAnalysisResponse(BaseModel):
    transcript: str
    filename: str
    slide_count: int
    presentation_metrics: PresentationMetricsSchema
    delivery_metrics: DeliveryAssessmentSchema
    content_review: ContentReviewSchema
