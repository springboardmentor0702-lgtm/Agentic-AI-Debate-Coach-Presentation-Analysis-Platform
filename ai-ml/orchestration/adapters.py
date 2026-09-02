"""Adapters for the project's existing AI components."""


class ArgumentAnalysisAdapter:
    output_key = "argument_analysis"

    def __init__(self, agent):
        self.agent = agent

    def run(self, argument, **context):
        return self.agent.run(argument)


class FallacyDetectionAdapter:
    output_key = "fallacy_detection"

    def __init__(self, agent):
        self.agent = agent

    def run(self, argument, **context):
        return self.agent.run(argument)


class RebuttalAdapter:
    output_key = "rebuttal"

    def __init__(self, ai_engine, persona="The Contrarian"):
        self.ai_engine = ai_engine
        self.persona = persona

    def run(self, argument, **context):
        result = self.ai_engine.generate_simulation_response(
            argument,
            self.persona,
        )
        return {
            "opponent_rebuttal": result.get("opponent_rebuttal"),
            "fallacies_detected": result.get("fallacies_detected", []),
            "rebuttal_strength_percent": result.get(
                "rebuttal_strength_percent", 0
            ),
            "coaching_tip": result.get("coaching_tip"),
        }


class CoachingScoringAdapter:
    output_key = "coaching"

    def __init__(self, ai_engine):
        self.ai_engine = ai_engine

    def run(self, argument, **context):
        analysis = context.get("argument_analysis", {})
        rebuttal = context.get("rebuttal", {})

        arg_quality = float(analysis.get("strength_score", 0))
        evidence = self._evidence_score(analysis)
        logic = float(analysis.get("logical_consistency_score", 0))
        rebuttal_score = float(
            rebuttal.get("rebuttal_strength_percent", 0)
        )
        comms = float(analysis.get("clarity_score", 0))

        overall = self.ai_engine.calculate_weighted_score(
            arg_quality,
            evidence,
            logic,
            rebuttal_score,
            comms,
        )

        return {
            "overall_score": overall,
            "strength_label": analysis.get(
                "strength_label", "unknown"
            ),
            "coaching_tip": rebuttal.get("coaching_tip"),
            "scoring_breakdown": {
                "argument_quality": arg_quality,
                "evidence": evidence,
                "logic": logic,
                "rebuttal": rebuttal_score,
                "communication": comms,
            },
        }

    @staticmethod
    def _evidence_score(analysis):
        evidence = analysis.get("evidence") or []
        if not evidence:
            return 0.0
        return min(100.0, 50.0 + len(evidence) * 10.0)
