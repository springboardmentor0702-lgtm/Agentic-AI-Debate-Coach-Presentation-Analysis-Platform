from .argument_analysis_agent import argument_analysis_agent
from .counterargument_agent import counterargument_agent
from .fallacy_detection_agent import fallacy_detection_agent
from .opponent_agent import opponent_agent
from .scoring_agent import scoring_agent
from .speech_analysis import speech_analysis_agent

AGENT_REGISTRY = {
    "argument_analysis": argument_analysis_agent,
    "counterargument": counterargument_agent,
    "fallacy_detection": fallacy_detection_agent,
    "opponent": opponent_agent,
    "scoring": scoring_agent,
    "speech_analysis": speech_analysis_agent,
}