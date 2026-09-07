"""English-only guard for anything a model writes back to the user.

Why this exists
---------------
The debate UI shows the opponent's reply verbatim. If a model ever drifts into
another language, emits CJK/Cyrillic/Devanagari characters, or leaks raw JSON or
chain-of-thought scaffolding, the learner sees noise they cannot debate against.

So every model-authored string that reaches the transcript passes through
`enforce_english()`. It is deliberately cheap and dependency-free - no langdetect,
no model call - because it sits on the hot path of every turn.

Three-step contract used by callers:
  1. generate
  2. `is_probably_english()` - if it fails, re-prompt ONCE with an explicit
     English-only instruction
  3. `enforce_english()` - sanitize whatever came back, so something readable is
     always displayed even if step 2 also failed
"""

from __future__ import annotations

import re
import unicodedata

# Scripts that should never appear in an English debate reply. Checked by
# codepoint range rather than by name lookup, which would be far slower per call.
NON_LATIN_RANGES = (
    (0x0400, 0x04FF),  # Cyrillic
    (0x0500, 0x052F),  # Cyrillic supplement
    (0x0590, 0x05FF),  # Hebrew
    (0x0600, 0x06FF),  # Arabic
    (0x0700, 0x074F),  # Syriac
    (0x0900, 0x097F),  # Devanagari
    (0x0980, 0x09FF),  # Bengali
    (0x0E00, 0x0E7F),  # Thai
    (0x1100, 0x11FF),  # Hangul Jamo
    (0x3040, 0x30FF),  # Hiragana + Katakana
    (0x3400, 0x4DBF),  # CJK extension A
    (0x4E00, 0x9FFF),  # CJK unified
    (0xAC00, 0xD7AF),  # Hangul syllables
)

# Very common English function words. A genuine English debate sentence of any
# length will hit several of these; a translated or garbled one usually will not.
ENGLISH_MARKERS = frozenset(
    """
    the a an and or but if then than that this these those is are was were be been being
    to of in on for with without from by as at into about over under not no nor
    you your i we they it he she them us our their my me his her its
    do does did done have has had will would can could should may might must
    because therefore however although while whereas moreover furthermore thus hence
    argument evidence claim reason point position case premise conclusion
    """.split()
)

MIN_WORDS_FOR_MARKER_TEST = 6
MIN_MARKER_RATIO = 0.10
MAX_NON_LATIN_RATIO = 0.05

# Scaffolding that sometimes leaks out of a model when it is asked for prose:
# leading role labels, markdown fences, or an internal reasoning preamble.
_SCAFFOLD_PATTERNS = (
    re.compile(r"^\s*```[a-zA-Z]*\s*", re.MULTILINE),
    re.compile(r"```\s*$", re.MULTILINE),
    re.compile(r"^\s*(assistant|system|user|ai|opponent|response|output|answer)\s*[:>-]\s*", re.IGNORECASE),
    re.compile(r"^\s*<(thinking|thought|reasoning|scratchpad)>.*?</\1>\s*", re.IGNORECASE | re.DOTALL),
    re.compile(r"^\s*(here is|here's)\s+(my|the)\s+(rebuttal|response|reply|answer)\s*[:.]\s*", re.IGNORECASE),
)

_WORD_RE = re.compile(r"[A-Za-z']+")


def _is_non_latin(char: str) -> bool:
    code = ord(char)
    return any(low <= code <= high for low, high in NON_LATIN_RANGES)


def non_latin_ratio(text: str) -> float:
    """Share of letter characters that belong to a non-Latin script."""
    letters = [char for char in (text or "") if char.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for char in letters if _is_non_latin(char)) / len(letters)


def english_marker_ratio(text: str) -> float:
    """Share of words that are common English function words."""
    words = _WORD_RE.findall((text or "").lower())
    if not words:
        return 0.0
    return sum(1 for word in words if word in ENGLISH_MARKERS) / len(words)


def is_probably_english(text: str) -> bool:
    """
    Conservative check: only returns False when the text looks genuinely wrong.

    Short replies skip the marker test entirely - "I disagree." is perfectly good
    English but contains no marker words, and failing it would trigger a pointless
    re-prompt on a valid reply.
    """
    clean = (text or "").strip()
    if not clean:
        return False
    if non_latin_ratio(clean) > MAX_NON_LATIN_RATIO:
        return False
    words = _WORD_RE.findall(clean.lower())
    if len(words) < MIN_WORDS_FOR_MARKER_TEST:
        return True
    return english_marker_ratio(clean) >= MIN_MARKER_RATIO


def strip_scaffolding(text: str) -> str:
    """Remove markdown fences, role labels, and reasoning preambles."""
    clean = text or ""
    for pattern in _SCAFFOLD_PATTERNS:
        clean = pattern.sub("", clean)
    return clean.strip().strip('"').strip()


def strip_non_latin(text: str) -> str:
    """
    Drop non-Latin characters, keeping sentence structure intact.

    Accents are folded to ASCII rather than deleted, so 'naïve' becomes 'naive'
    instead of 'nave'. Whitespace is collapsed afterwards so removed runs do not
    leave visible gaps.
    """
    folded = unicodedata.normalize("NFKD", text or "")
    kept = [char for char in folded if not _is_non_latin(char) and not unicodedata.combining(char)]
    return " ".join("".join(kept).split())


def enforce_english(text: str, fallback: str = "") -> str:
    """
    Return a display-safe English string, or `fallback` if nothing usable remains.

    This never calls a model and never raises. It is the last line of defence
    before text reaches the transcript.
    """
    clean = strip_scaffolding(text or "")
    if not clean:
        return fallback

    if non_latin_ratio(clean) > MAX_NON_LATIN_RATIO:
        clean = strip_non_latin(clean)

    clean = " ".join(clean.split())
    # A couple of stray words left after stripping is not a usable reply.
    if len(_WORD_RE.findall(clean)) < 2:
        return fallback
    return clean


ENGLISH_ONLY_INSTRUCTION = (
    "CRITICAL: Write every field in clear, grammatically correct, natural English. "
    "Use only standard Latin characters. Do not use any other language, do not "
    "transliterate, and do not include your reasoning, labels, or markdown."
)


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    samples = [
        "Your premise assumes liability follows autonomy, but that does not hold.",
        "我不同意你的前提，因为责任属于制造商。",
        "```json\n{\"a\": 1}\n```",
        "Assistant: Here is my rebuttal: I reject the claim outright.",
        "I disagree.",
        "naïve café résumé",
        "",
    ]
    for sample in samples:
        print(f"{sample[:45]!r:50} english={is_probably_english(sample)!s:6} -> {enforce_english(sample, '[unusable]')!r}")
