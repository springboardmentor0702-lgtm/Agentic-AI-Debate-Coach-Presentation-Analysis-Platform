class Agent:
    def __init__(self,name,task): self.name=name; self.task=task
AGENTS={
"argument_analysis":Agent("Argument Analysis Agent","claims, evidence, reasoning, strength"),
"fallacy":Agent("Fallacy Detection Agent","supported logical fallacies"),
"counterargument":Agent("Counterargument Agent","rebuttals and challenge questions"),
"evidence_reasoning":Agent("Evidence/Reasoning Agent","evidence and warrants"),
"debate":Agent("Debate Agent","adaptive multi-turn opponent"),
"speech":Agent("Speech Analysis Agent","delivery metrics"),
"presentation":Agent("Presentation Agent","slide intelligence"),
"coaching":Agent("Coaching Agent","personalized guidance"),
"analytics":Agent("Analytics Agent","stored-data interpretation"),
"report":Agent("Report Agent","professional exports"),
}
