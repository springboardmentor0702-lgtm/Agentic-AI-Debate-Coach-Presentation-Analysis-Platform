from pydantic import BaseModel, Field
from typing import List

class WeaknessWithFix(BaseModel):
    issue: str = Field(description="The specific weakness, stated plainly.")
    stronger_version: str = Field(description="A concrete rewrite of the relevant part of the argument that fixes this specific issue — not generic advice, an actual example sentence.")

class ArgumentAnalysisSchema(BaseModel):
    clarity_score: int = Field(description="0-100. How clearly the claim and reasoning are expressed.")
    relevance_score: int = Field(description="0-100. How directly evidence relates to the claim.")
    evidence_strength_score: int = Field(description="0-100. Strength/credibility of supporting evidence.")
    logical_consistency_score: int = Field(description="0-100. Does the conclusion follow from the premises?")
    persuasiveness_score: int = Field(description="0-100. How convincing to a neutral audience.")
    claims_found: List[str] = Field(default_factory=list, description="The distinct factual/normative claims made in the argument.")
    evidence_found: List[str] = Field(default_factory=list, description="The distinct pieces of evidence/support used.")
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[WeaknessWithFix] = Field(
        default_factory=list,
        description="2-4 weaknesses, EACH paired with a concrete rewritten example fixing that specific issue."
    )
