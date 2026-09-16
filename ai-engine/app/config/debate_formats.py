"""
Real, config-driven debate format definitions. Each format is a plain data
structure — adding or changing a format means editing this file, not the
engine code. The state machine (debate_state_machine.py) reads these and
builds its LangGraph purely from the phase list; it has no per-format
special-casing.
"""
from app.schemas.debate_session import DebateFormatConfig, PhaseConfig

# Reused by every format as the "extra round" when the user chooses to
# continue past the format's normal phase list, instead of ending.
EXTENSION_ROUND = [
    PhaseConfig(phase_id="extra_user_rebuttal", speaker="user", speech_type="Extra Rebuttal", time_limit_seconds=120, rules=["Address points raised so far"]),
    PhaseConfig(phase_id="extra_ai_rebuttal", speaker="ai", speech_type="Extra Rebuttal", time_limit_seconds=120, rules=["Address points raised so far"]),
]

DEBATE_FORMATS: dict[str, DebateFormatConfig] = {

    "One-on-One Debate": DebateFormatConfig(
        format_name="One-on-One Debate",
        description="Direct, fast-paced exchange between two debaters.",
        phases=[
            PhaseConfig(phase_id="user_opening", speaker="user", speech_type="Opening", time_limit_seconds=180, rules=[]),
            PhaseConfig(phase_id="ai_opening", speaker="ai", speech_type="Opening", time_limit_seconds=180, rules=[]),
            PhaseConfig(phase_id="user_rebuttal", speaker="user", speech_type="Rebuttal", time_limit_seconds=120, rules=[]),
            PhaseConfig(phase_id="ai_rebuttal", speaker="ai", speech_type="Rebuttal", time_limit_seconds=120, rules=[]),
            PhaseConfig(phase_id="user_closing", speaker="user", speech_type="Closing", time_limit_seconds=90, rules=["No new arguments in closing"]),
            PhaseConfig(phase_id="ai_closing", speaker="ai", speech_type="Closing", time_limit_seconds=90, rules=["No new arguments in closing"]),
        ]
    ),

    "Parliamentary Debate": DebateFormatConfig(
        format_name="Parliamentary Debate",
        description="Government vs. Opposition, formal political terminology, motion-based.",
        phases=[
            PhaseConfig(phase_id="user_constructive", speaker="user", speech_type="Constructive", time_limit_seconds=420, rules=["Points of Information (POIs) may be raised by the opponent"]),
            PhaseConfig(phase_id="ai_constructive", speaker="ai", speech_type="Constructive", time_limit_seconds=420, rules=["Points of Information (POIs) may be raised by the opponent"]),
            PhaseConfig(phase_id="user_rebuttal", speaker="user", speech_type="Rebuttal", time_limit_seconds=240, rules=["Must directly address opponent's constructive"]),
            PhaseConfig(phase_id="ai_rebuttal", speaker="ai", speech_type="Rebuttal", time_limit_seconds=240, rules=["Must directly address opponent's constructive"]),
        ]
    ),

    "Oxford Debate": DebateFormatConfig(
        format_name="Oxford Debate",
        description="Formal for/against motion debate, prioritizing data and statistics.",
        phases=[
            PhaseConfig(phase_id="user_opening", speaker="user", speech_type="Opening", time_limit_seconds=300, rules=["Must state a clear position on the motion"]),
            PhaseConfig(phase_id="ai_opening", speaker="ai", speech_type="Opening", time_limit_seconds=300, rules=["Must strictly oppose the motion"]),
            PhaseConfig(phase_id="user_rebuttal", speaker="user", speech_type="Rebuttal", time_limit_seconds=240, rules=["Prioritize data/statistics over rhetoric"]),
            PhaseConfig(phase_id="ai_rebuttal", speaker="ai", speech_type="Rebuttal", time_limit_seconds=240, rules=["Prioritize data/statistics over rhetoric"]),
            PhaseConfig(phase_id="user_closing", speaker="user", speech_type="Closing", time_limit_seconds=180, rules=[]),
            PhaseConfig(phase_id="ai_closing", speaker="ai", speech_type="Closing", time_limit_seconds=180, rules=[]),
        ]
    ),

    "Policy Debate": DebateFormatConfig(
        format_name="Policy Debate",
        description="Evidence-heavy debate on implementation, cost, and feasibility of a policy.",
        phases=[
            PhaseConfig(phase_id="user_constructive", speaker="user", speech_type="Constructive", time_limit_seconds=480, rules=["Evidence/citations expected", "Cross-examination allowed after this speech"]),
            PhaseConfig(phase_id="ai_constructive", speaker="ai", speech_type="Constructive", time_limit_seconds=480, rules=["Evidence/citations expected", "Cross-examination allowed after this speech"]),
            PhaseConfig(phase_id="user_rebuttal", speaker="user", speech_type="Rebuttal", time_limit_seconds=300, rules=["Focus on real-world implementation flaws"]),
            PhaseConfig(phase_id="ai_rebuttal", speaker="ai", speech_type="Rebuttal", time_limit_seconds=300, rules=["Focus on real-world implementation flaws"]),
        ]
    ),

    "Public Forum Debate": DebateFormatConfig(
        format_name="Public Forum Debate",
        description="Accessible, audience-focused debate with concise arguments.",
        phases=[
            PhaseConfig(phase_id="user_constructive", speaker="user", speech_type="Constructive", time_limit_seconds=240, rules=["Keep language accessible to a general audience"]),
            PhaseConfig(phase_id="ai_constructive", speaker="ai", speech_type="Constructive", time_limit_seconds=240, rules=["Keep language accessible to a general audience"]),
            PhaseConfig(phase_id="user_rebuttal", speaker="user", speech_type="Rebuttal", time_limit_seconds=180, rules=[]),
            PhaseConfig(phase_id="ai_rebuttal", speaker="ai", speech_type="Rebuttal", time_limit_seconds=180, rules=[]),
            PhaseConfig(phase_id="user_summary", speaker="user", speech_type="Summary", time_limit_seconds=120, rules=["No new evidence in summary"]),
            PhaseConfig(phase_id="ai_summary", speaker="ai", speech_type="Summary", time_limit_seconds=120, rules=["No new evidence in summary"]),
        ]
    ),

    "AI Debate Simulation": DebateFormatConfig(
        format_name="AI Debate Simulation",
        description="Flexible, learner-paced practice against an adaptive AI opponent.",
        phases=[
            PhaseConfig(phase_id="user_opening", speaker="user", speech_type="Opening", time_limit_seconds=240, rules=[]),
            PhaseConfig(phase_id="ai_opening", speaker="ai", speech_type="Opening", time_limit_seconds=240, rules=["Vary tone and strategy turn to turn"]),
            PhaseConfig(phase_id="user_rebuttal", speaker="user", speech_type="Rebuttal", time_limit_seconds=180, rules=[]),
            PhaseConfig(phase_id="ai_rebuttal", speaker="ai", speech_type="Rebuttal", time_limit_seconds=180, rules=["Vary tone and strategy turn to turn"]),
            PhaseConfig(phase_id="user_closing", speaker="user", speech_type="Closing", time_limit_seconds=120, rules=[]),
            PhaseConfig(phase_id="ai_closing", speaker="ai", speech_type="Closing", time_limit_seconds=120, rules=[]),
        ]
    ),
}


def get_format_config(format_name: str) -> DebateFormatConfig:
    if format_name not in DEBATE_FORMATS:
        raise ValueError(f"Unknown debate format: {format_name}")
    return DEBATE_FORMATS[format_name]
