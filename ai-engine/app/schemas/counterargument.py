from pydantic import BaseModel, Field
from typing import List


class CounterargumentItem(BaseModel):
    type: str = Field(description="One of: 'Logical Rebuttal', 'Evidence-Based Rebuttal', 'Ethical Counterargument', 'Practical Counterargument', 'Policy Counterargument'.")
    content: str = Field(description="The actual counterargument text, 1-2 sentences.")


class CounterargumentSchema(BaseModel):
    counterarguments: List[CounterargumentItem] = Field(
        default_factory=list,
        description="3-5 distinct counterarguments across different types. Only include types that genuinely fit the topic — don't force all 5."
    )
    challenge_questions: List[str] = Field(
        default_factory=list,
        description="2-3 probing questions a real opponent would ask to pressure-test this position — genuinely hard, specific questions, not generic ones like 'why do you think that?'."
    )
    debate_strategy: List[str] = Field(
        default_factory=list,
        description="2-3 concrete strategic suggestions for how to argue against this position effectively (e.g. which angle to attack, what to concede vs. contest)."
    )
