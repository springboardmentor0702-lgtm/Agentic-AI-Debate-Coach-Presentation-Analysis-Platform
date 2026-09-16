from pydantic import BaseModel, Field
from typing import List


class SlideFeedback(BaseModel):
    slide_number: int
    feedback: str


class ContentReviewSchema(BaseModel):
    structure_score: int = Field(description="0-100. Does the deck/document follow a logical structure (intro, body, conclusion)?")
    clarity_score: int = Field(description="0-100. Is each slide/page's point clear and unambiguous?")
    claim_support_score: int = Field(description="0-100. Are claims made in the content actually backed up within the material, or just asserted?")
    flow_score: int = Field(description="0-100. Does one slide/page lead logically into the next?")
    slide_feedback: List[SlideFeedback] = Field(default_factory=list, description="Specific feedback per slide/page — only for slides with real, substantive text.")
    overall_content_feedback: str = Field(description="2-3 sentence overall assessment of the content itself, separate from delivery.")
