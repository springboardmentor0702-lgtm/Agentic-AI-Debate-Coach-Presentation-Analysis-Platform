from fastapi import APIRouter
from fastapi import Depends

from pydantic import BaseModel
from pydantic import Field

from models import User
from security import current_user

from services.ai_engine import (
    analyze_argument
)


router = APIRouter(
    prefix="/api/counterargument",
    tags=["Counterargument"]
)


class CounterargumentRequest(BaseModel):

    argument: str = Field(
        min_length=10,
        max_length=10000
    )

    topic: str = ""

    counter_type: str = "logical"


def build_counterargument(
    argument: str,
    topic: str,
    counter_type: str
):

    analysis = analyze_argument(
        argument,
        topic
    )

    evaluation = analysis[
        "evaluation"
    ]

    fallacies = analysis[
        "fallacies"
    ]

    # -----------------------------------------
    # LOGICAL REBUTTAL
    # -----------------------------------------

    if counter_type == "logical":

        response = (
            "The conclusion does not necessarily "
            "follow from the stated reasoning. "
            "A stronger analysis should examine "
            "the assumptions connecting the evidence "
            "to the conclusion."
        )

        strategy = (
            "Challenge the logical connection "
            "between the premises and conclusion."
        )

    # -----------------------------------------
    # EVIDENCE BASED
    # -----------------------------------------

    elif counter_type == "evidence":

        response = (
            "The claim would be stronger if it were "
            "supported by reliable and relevant "
            "evidence. Consider whether the available "
            "data actually supports the conclusion."
        )

        strategy = (
            "Ask for credible sources, data and "
            "representative evidence."
        )

    # -----------------------------------------
    # ETHICAL
    # -----------------------------------------

    elif counter_type == "ethical":

        response = (
            "Even if the proposed outcome is practical, "
            "the argument should also consider fairness, "
            "rights, responsibilities and possible "
            "effects on different groups."
        )

        strategy = (
            "Introduce ethical principles and "
            "consider affected stakeholders."
        )

    # -----------------------------------------
    # PRACTICAL
    # -----------------------------------------

    elif counter_type == "practical":

        response = (
            "The proposal should be evaluated against "
            "real-world constraints such as cost, "
            "implementation difficulty, resources "
            "and unintended consequences."
        )

        strategy = (
            "Test whether the proposed solution "
            "is realistically implementable."
        )

    # -----------------------------------------
    # POLICY
    # -----------------------------------------

    elif counter_type == "policy":

        response = (
            "A policy argument should compare the "
            "proposed approach with realistic "
            "alternatives and evaluate measurable "
            "outcomes."
        )

        strategy = (
            "Compare alternatives and identify "
            "measurable policy outcomes."
        )

    else:

        response = (
            "Consider the assumptions behind the "
            "argument and identify evidence that "
            "could support an alternative conclusion."
        )

        strategy = (
            "Question assumptions and provide "
            "an alternative perspective."
        )

    # -----------------------------------------
    # FALLACY-SPECIFIC CHALLENGE
    # -----------------------------------------

    challenges = []

    for fallacy in fallacies:

        challenges.append({
            "fallacy":
                fallacy["name"],

            "challenge":
                (
                    f"The argument appears to use "
                    f"{fallacy['name']}. Can the claim "
                    "be supported without relying "
                    "on this reasoning pattern?"
                )
        })

    # -----------------------------------------
    # CHALLENGE QUESTION
    # -----------------------------------------

    question = (
        "What evidence would change your conclusion?"
    )

    if evaluation[
        "evidence_strength"
    ] < 60:

        question = (
            "What reliable evidence supports "
            "your main claim?"
        )

    elif evaluation[
        "logical_consistency"
    ] < 60:

        question = (
            "How does your evidence logically "
            "lead to your conclusion?"
        )

    return {

        "counterargument": response,

        "type": counter_type,

        "strategy": strategy,

        "challenge_question": question,

        "fallacy_challenges": challenges,

        "analysis_reference": {

            "argument_strength":
                evaluation["argument_strength"],

            "evidence_strength":
                evaluation["evidence_strength"],

            "logical_consistency":
                evaluation["logical_consistency"]
        }
    }


@router.post("")
def generate_counterargument(
    request: CounterargumentRequest,

    user: User = Depends(current_user)
):

    result = build_counterargument(
        request.argument,
        request.topic,
        request.counter_type
    )

    result["user_id"] = user.id

    return result
