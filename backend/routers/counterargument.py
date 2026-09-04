from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from models import User
from security import current_user
from services.ai_engine import analyze_argument

router = APIRouter(
    prefix="/api/counterargument",
    tags=["Counterargument"]
)


class CounterargumentRequest(BaseModel):
    argument: str = Field(min_length=10, max_length=10000)
    topic: str = ""
    counter_type: str = "logical"  # logical, evidence, ethical, practical, policy


def build_counterargument(
    argument: str,
    topic: str,
    counter_type: str
):
    analysis = analyze_argument(argument, topic)
    evaluation = analysis["evaluation"]
    fallacies = analysis["fallacies"]

    if counter_type == "logical":
        response = (
            "The conclusion does not necessarily follow from the stated reasoning. "
            "A stronger analysis should examine the underlying assumptions connecting "
            "the premises to the conclusion."
        )
        strategy = "Challenge the logical connection between premises and conclusion."

    elif counter_type == "evidence":
        response = (
            "The claim would be substantially stronger if supported by empirical, "
            "reproducible research. Consider whether statistical counter-examples "
            "challenge the premise."
        )
        strategy = "Demand credible source citations, sample sizes, and quantitative evidence."

    elif counter_type == "ethical":
        response = (
            "Even if the proposal is practical, it raises significant ethical questions "
            "regarding fairness, human rights, distributive justice, and impact on vulnerable groups."
        )
        strategy = "Introduce ethical frameworks (utilitarianism, rights, equity) to challenge moral foundations."

    elif counter_type == "practical":
        response = (
            "The proposal fails to account for real-world logistical, financial, "
            "and administrative bottlenecks that would hinder successful implementation."
        )
        strategy = "Highlight implementation costs, enforcement barriers, and resource scarcity."

    elif counter_type == "policy":
        response = (
            "From a policy perspective, alternative regulatory interventions offer higher "
            "benefit-to-cost ratios with significantly fewer negative externalities."
        )
        strategy = "Propose viable policy alternatives and compare risk-adjusted outcomes."

    else:
        response = (
            "Consider alternative viewpoints and evaluate whether the primary premise "
            "holds under varying social and economic conditions."
        )
        strategy = "Question baseline assumptions and introduce alternative interpretations."

    challenges = []
    for fallacy in fallacies:
        challenges.append({
            "fallacy": fallacy["name"],
            "challenge": (
                f"The argument exhibits {fallacy['name']}. Can this stance be defended "
                "without relying on this argumentative fallacy?"
            )
        })

    question = "What empirical evidence or counter-example would cause you to modify your conclusion?"
    if evaluation["evidence_strength"] < 60:
        question = "What verified external studies or data points directly substantiate this claim?"
    elif evaluation["logical_consistency"] < 60:
        question = "How do you reconcile the apparent tension between your premises and the stated outcome?"

    return {
        "counterargument": response,
        "type": counter_type,
        "counter_type": counter_type,
        "strategy": strategy,
        "challenge_question": question,
        "fallacy_challenges": challenges,
        "analysis_reference": {
            "argument_strength": evaluation["argument_strength"],
            "evidence_strength": evaluation["evidence_strength"],
            "logical_consistency": evaluation["logical_consistency"]
        }
    }


@router.post("")
@router.post("/generate")
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
