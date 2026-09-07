from typing import List, Dict, Any

DEBATE_GLOSSARY: Dict[str, Dict[str, str]] = {
    "warrant": {
        "term": "Warrant",
        "simple_name": "The Proof / Connection",
        "plain_english": "The reason or evidence that explains WHY your claim is true. It connects your fact to your conclusion.",
        "example": "'It is raining outside (Fact), therefore the grass will get wet (Conclusion) BECAUSE water wets soil (Warrant).'"
    },
    "rebuttal": {
        "term": "Rebuttal",
        "simple_name": "Counter-Response",
        "plain_english": "A respectful answer that directly shows why the other speaker's point is incorrect or incomplete.",
        "example": "Answering 'They say technology disconnects people, but actually it allows remote families to stay connected every day.'"
    },
    "empirical": {
        "term": "Empirical",
        "simple_name": "Real-World Evidence",
        "plain_english": "Based on real numbers, scientific tests, studies, or observable facts, rather than just opinions.",
        "example": "'We have empirical data showing a 30% reduction in traffic accidents after adding traffic lights.'"
    },
    "ad hominem": {
        "term": "Ad Hominem",
        "simple_name": "Attacking the Person (Name-Calling)",
        "plain_english": "Insulting or criticizing the speaker instead of dealing with their real argument.",
        "example": "Calling someone 'clueless' or 'unqualified' instead of answering their factual point."
    },
    "straw man": {
        "term": "Straw Man",
        "simple_name": "Twisting the Opponent's Words",
        "plain_english": "Exaggerating or distorting what someone said so it sounds absurd and easy to defeat.",
        "example": "If someone says 'We should spend more on parks', replying 'So you want to bankrupt the city and starve the police?'"
    },
    "false dilemma": {
        "term": "False Dilemma",
        "simple_name": "Only Two Choices (Black or White)",
        "plain_english": "Pretending there are only two extreme options when there are actually many sensible middle options.",
        "example": "'Either you agree with 100% of this proposal or you hate progress completely.'"
    },
    "slippery slope": {
        "term": "Slippery Slope",
        "simple_name": "Exaggerated Chain Reaction",
        "plain_english": "Claiming that taking one small step will automatically trigger a chain of disasters without proving how.",
        "example": "'If we let students use calculators today, tomorrow nobody will know how to think!'"
    },
    "utilitarian": {
        "term": "Utilitarian",
        "simple_name": "The Greatest Good for Most People",
        "plain_english": "A philosophy that says the best choice is whatever brings the greatest happiness or benefit to the largest number of people.",
        "example": "Choosing to build a new public hospital that heals thousands even if parking gets slightly crowded."
    },
    "deontological": {
        "term": "Deontological",
        "simple_name": "Rule of Duty & Principles",
        "plain_english": "A moral belief that certain rules (like honesty and human rights) must never be broken, no matter how good the outcome sounds.",
        "example": "'We must not lie or violate privacy even if doing so might seem convenient.'"
    },
    "externalities": {
        "term": "Externalities",
        "simple_name": "Side Effects on Others",
        "plain_english": "Unintended effects or hidden costs that spill over onto other people who had no say in the decision.",
        "example": "A factory producing smoke creates a negative externality for neighbors who breathe it in."
    },
    "cross-examination": {
        "term": "Cross-Examination",
        "simple_name": "Direct Question Time",
        "plain_english": "A debate period where you ask your opponent direct questions to uncover weaknesses in their story.",
        "example": "Asking 'Can you name a single city where your plan was tested successfully?'"
    },
    "correlation": {
        "term": "Correlation",
        "simple_name": "Things Happening Together",
        "plain_english": "Two things happening at the same time by coincidence, without one necessarily causing the other.",
        "example": "Ice cream sales and shark attacks both rise in summer, not because ice cream attracts sharks, but because people swim more in hot weather."
    },
    "causation": {
        "term": "Causation",
        "simple_name": "Direct Cause and Effect",
        "plain_english": "When event A directly makes event B happen.",
        "example": "Dropping a glass directly causes it to shatter on the tile floor."
    },
    "affirmative": {
        "term": "Affirmative (Pro)",
        "simple_name": "The YES Side",
        "plain_english": "The speaker or team arguing IN FAVOR of the debate motion.",
        "example": "Saying YES to 'Should schools provide free healthy lunches?'"
    },
    "negative": {
        "term": "Negative (Con)",
        "simple_name": "The NO Side",
        "plain_english": "The speaker or team arguing AGAINST the debate motion.",
        "example": "Arguing against or proposing a better alternative to the motion."
    },
    "cadence": {
        "term": "Cadence / WPM",
        "simple_name": "Speaking Speed & Rhythm",
        "plain_english": "How fast or slow you speak, measured in Words Per Minute (WPM). 135 to 160 WPM is the ideal conversational speed.",
        "example": "Speaking at a steady, calm rhythm so the audience can digest every point."
    },
    "counter-plan": {
        "term": "Counter-Plan",
        "simple_name": "A Better Alternative Solution",
        "plain_english": "When you admit there is a problem, but propose a different, smarter solution than your opponent.",
        "example": "'We agree traffic is bad, but instead of building expensive highways, let us expand rapid bus transit.'"
    },
    "cognitive bias": {
        "term": "Cognitive Bias",
        "simple_name": "Mental Shortcut / Blind Spot",
        "plain_english": "A common mistake our human brains make when we jump to conclusions without checking the facts.",
        "example": "Only noticing news stories that confirm what we already believe."
    }
}

def extract_difficult_words(text: str) -> List[Dict[str, str]]:
    """Finds any difficult or debate-specific terms in a text and returns plain English explanations."""
    if not text:
        return []
    
    text_lower = text.lower()
    found = []
    
    for key, info in DEBATE_GLOSSARY.items():
        if key in text_lower:
            found.append(info)
            
    return found[:4] # Return up to 4 most relevant definitions

def get_all_glossary_terms() -> List[Dict[str, str]]:
    return list(DEBATE_GLOSSARY.values())
