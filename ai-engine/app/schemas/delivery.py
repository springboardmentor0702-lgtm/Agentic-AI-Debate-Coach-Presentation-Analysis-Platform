from pydantic import BaseModel, Field
from typing import List

class GrammarIssue(BaseModel):
    original_text: str
    corrected_text: str
    explanation: str

class DeliveryAssessmentSchema(BaseModel):
    grammar_issues: List[GrammarIssue] = Field(default_factory=list)
    confidence_score: int = Field(description="0-100, based on phrasing (hedging lowers, assertive raises).")
    clarity_score: int = Field(description="0-100. Speech delivery clarity.")
    engagement_score: int = Field(description="0-100. How dynamic, vivid, and engaging the delivery is — varied sentence rhythm, rhetorical devices, concrete imagery vs. flat/monotone phrasing.")
    overall_feedback: str = Field(description="One encouraging, constructive sentence.")
