import re

# Deliberately minimal, real checks — no LLM call needed, so junk input
# never even reaches the 4 agents (saves cost, avoids weird outputs).
_BASIC_PROFANITY = {"fuck", "shit", "bitch", "asshole", "cunt", "nigger", "faggot"}


def validate_input(text: str) -> str | None:
    """Returns a gentle redirect message if input should NOT go to the LLMs, else None."""
    stripped = text.strip()

    if not stripped:
        return "Looks like that came through empty — try writing or recording your argument again."

    words = stripped.split()
    if len(words) < 4:
        return "That's a bit short to analyze as a debate argument — try expanding it to at least a full sentence or two."

    # Gibberish heuristic: mostly non-alphabetic, or excessive character repetition
    alpha_ratio = sum(c.isalpha() or c.isspace() for c in stripped) / len(stripped)
    if alpha_ratio < 0.5:
        return "That doesn't look like readable text — please rephrase your argument in plain sentences."

    if re.search(r"(.)\1{5,}", stripped):  # same character repeated 6+ times
        return "That looks like it might be a typo or test input — try writing your actual argument."

    lowered_words = set(re.findall(r"[a-z']+", stripped.lower()))
    if lowered_words & _BASIC_PROFANITY:
        return "Let's keep the language debate-appropriate — please rephrase without profanity so we can give you real feedback."

    return None
