from pydantic import BaseModel, Field
from typing import Optional


class FallacyReportSchema(BaseModel):
    """Strict output contract for Agent 1 (The Auditor)."""

    fallacy_detected: bool = Field(
        description="True ONLY if a logical fallacy is clearly present in the argument."
    )
    fallacy_type: str = Field(
        description=(
            "One of: 'Ad Hominem', 'Straw Man', 'False Dilemma', 'Slippery Slope', "
            "'Appeal to Authority', 'Appeal to Popularity', 'Circular Reasoning', "
            "'Hasty Generalization', 'False Cause', 'Red Herring', or 'None' if fallacy_detected is False."
        )
    )
    offending_text: Optional[str] = Field(
        default=None, description="The exact phrase or sentence from the user's argument where the fallacy occurs."
    )
    explanation: Optional[str] = Field(
        default=None, description="Plain-language explanation of why the reasoning fails or constitutes this fallacy."
    )
    severity: Optional[str] = Field(
        default="Moderate", description="Severity level: 'High', 'Moderate', or 'Low'."
    )
    confidence: Optional[int] = Field(
        default=90, description="Confidence score from 0 to 100."
    )
    correction_suggestion: Optional[str] = Field(
        default=None, description="A constructive suggestion for how to fix or reframe the argument."
    )
