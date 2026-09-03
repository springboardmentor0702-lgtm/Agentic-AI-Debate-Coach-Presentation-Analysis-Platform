"""
Test harness for the four new agents (counterargument, opponent, scoring, speech analysis).

Follows the same plain-script convention as test_agents_demo.py - no pytest needed.

Run with:
    python tests/test_new_agents.py            # offline checks only (no API key needed)
    python tests/test_new_agents.py --live      # also hits the LLM (needs GROQ/GEMINI key)

The offline suite is the important one: it proves the deterministic maths, the
validation/clamping, and the never-raises contract without spending API quota.
"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.agents import AGENT_REGISTRY  # noqa: E402
from app.agents.argument_analysis_agent import argument_analysis_agent  # noqa: E402
from app.agents.base_agent import BaseAgent  # noqa: E402
from app.agents.counterargument_agent import REBUTTAL_TYPES, counterargument_agent  # noqa: E402
from app.agents.fallacy_detection_agent import fallacy_detection_agent  # noqa: E402
from app.agents.opponent_agent import DIFFICULTY_LEVELS, PERSONAS, opponent_agent  # noqa: E402
from app.agents.scoring_agent import SCORE_WEIGHTS, SUB_SCORE_KEYS, scoring_agent  # noqa: E402
from app.agents.speech_analysis import speech_analysis_agent, whisper_available  # noqa: E402

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"

_results = {"passed": 0, "failed": 0}


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        _results["passed"] += 1
        print(f"  {GREEN}PASS{RESET}  {label}")
    else:
        _results["failed"] += 1
        print(f"  {RED}FAIL{RESET}  {label}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


def section(title: str) -> None:
    print(f"\n{BOLD}{title}{RESET}\n{'-' * len(title)}")


# ---------------------------------------------------------------------------
# Offline: registry and shared contract
# ---------------------------------------------------------------------------
def test_registry() -> None:
    section("Agent registry")

    check("registry holds 6 agents", len(AGENT_REGISTRY) == 6, f"got {len(AGENT_REGISTRY)}")

    for key, agent in AGENT_REGISTRY.items():
        check(f"{key}: subclasses BaseAgent", isinstance(agent, BaseAgent))
        check(f"{key}: has a run() method", callable(getattr(agent, "run", None)))
        check(f"{key}: name is overridden", agent.name != "BaseAgent", f"name={agent.name}")
        check(f"{key}: role is overridden", agent.role != "An unspecified AI agent.")


# ---------------------------------------------------------------------------
# Offline: scoring maths - the highest-stakes deterministic logic in the repo
# ---------------------------------------------------------------------------
def test_scoring_weights() -> None:
    section("Scoring weights and weighted-total maths")

    check("weights sum to exactly 1.0", round(sum(SCORE_WEIGHTS.values()), 6) == 1.0, str(sum(SCORE_WEIGHTS.values())))
    check("argument_quality is 30%", SCORE_WEIGHTS["argument_quality"] == 0.30)
    check("evidence_usage is 20%", SCORE_WEIGHTS["evidence_usage"] == 0.20)
    check("logical_consistency is 20%", SCORE_WEIGHTS["logical_consistency"] == 0.20)
    check("rebuttal_effectiveness is 15%", SCORE_WEIGHTS["rebuttal_effectiveness"] == 0.15)
    check("communication_skills is 15%", SCORE_WEIGHTS["communication_skills"] == 0.15)

    all_100 = {k: 100.0 for k in SUB_SCORE_KEYS}
    all_0 = {k: 0.0 for k in SUB_SCORE_KEYS}
    all_80 = {k: 80.0 for k in SUB_SCORE_KEYS}
    mixed = {
        "argument_quality": 85.0,
        "evidence_usage": 80.0,
        "logical_consistency": 90.0,
        "rebuttal_effectiveness": 88.0,
        "communication_skills": 82.0,
    }

    check("all 100 -> 100.0", scoring_agent.compute_weighted_score(all_100) == 100.0)
    check("all 0 -> 0.0", scoring_agent.compute_weighted_score(all_0) == 0.0)
    check("all 80 -> 80.0", scoring_agent.compute_weighted_score(all_80) == 80.0)
    check("mixed -> 85.0", scoring_agent.compute_weighted_score(mixed) == 85.0,
          str(scoring_agent.compute_weighted_score(mixed)))

    # A missing dimension must NOT be silently treated as full marks.
    partial = scoring_agent.compute_weighted_score({"argument_quality": 100.0})
    check("missing dimensions count as 0, not 100", partial == 30.0, f"got {partial}")

    # Out-of-range and junk inputs must be clamped, not propagated.
    check("scores above 100 are clamped", scoring_agent.compute_weighted_score({k: 500.0 for k in SUB_SCORE_KEYS}) == 100.0)
    check("negative scores are clamped", scoring_agent.compute_weighted_score({k: -50.0 for k in SUB_SCORE_KEYS}) == 0.0)
    check("non-numeric scores do not raise", scoring_agent.compute_weighted_score({k: "abc" for k in SUB_SCORE_KEYS}) == 0.0)

    section("Grade bands")
    expected = [(95, "A"), (90, "A"), (89.9, "B"), (80, "B"), (79, "C"), (70, "C"), (69, "D"), (60, "D"), (59, "F"), (0, "F")]
    for score, letter in expected:
        got, band = scoring_agent.grade_for(score)
        check(f"{score} -> {letter}", got == letter, f"got {got} ({band})")


# ---------------------------------------------------------------------------
# Offline: speech metrics - pure Python, no Whisper, no API
# ---------------------------------------------------------------------------
def test_speech_metrics() -> None:
    section("Speech metrics (deterministic)")

    # Exactly 150 words in exactly 60 seconds must read as 150.0 wpm.
    sixty_second_speech = " ".join(["word"] * 150) + "."
    metrics = speech_analysis_agent.compute_metrics(sixty_second_speech, duration_seconds=60.0)
    check("150 words / 60s -> 150.0 wpm", metrics["speech_pace_wpm"] == 150.0, str(metrics["speech_pace_wpm"]))
    check("word_count is exact", metrics["word_count"] == 150, str(metrics["word_count"]))

    required_keys = [
        "speech_pace_wpm", "filler_words_count", "filler_words_list",
        "confidence_score", "clarity_score", "engagement_score",
    ]
    check(
        "returns all 6 PresentationMetric column keys",
        all(k in metrics for k in required_keys),
        str([k for k in required_keys if k not in metrics]),
    )

    for key in ["confidence_score", "clarity_score", "engagement_score"]:
        check(f"{key} within 0-100", 0.0 <= metrics[key] <= 100.0, str(metrics[key]))

    # Ideal-band pace must beat both too-slow and too-fast delivery on clarity.
    slow = speech_analysis_agent.compute_metrics(" ".join(["word"] * 70) + ".", duration_seconds=60.0)
    ideal = speech_analysis_agent.compute_metrics(" ".join(["word"] * 145) + ".", duration_seconds=60.0)
    fast = speech_analysis_agent.compute_metrics(" ".join(["word"] * 240) + ".", duration_seconds=60.0)
    check("ideal pace beats slow on clarity", ideal["clarity_score"] > slow["clarity_score"],
          f"ideal={ideal['clarity_score']} slow={slow['clarity_score']}")
    check("ideal pace beats fast on clarity", ideal["clarity_score"] > fast["clarity_score"],
          f"ideal={ideal['clarity_score']} fast={fast['clarity_score']}")

    section("Filler word counting")
    total, breakdown = speech_analysis_agent._count_fillers("So, um, I basically think, you know, like this.")
    check("finds multiple distinct fillers", total >= 5, f"got {total}: {breakdown}")

    # "you know" is one two-word filler; it must not also be counted as separate tokens.
    total_overlap, breakdown_overlap = speech_analysis_agent._count_fillers("you know")
    check("no double-count on multi-word fillers", total_overlap == 1, f"got {total_overlap}: {breakdown_overlap}")

    clean_total, _ = speech_analysis_agent._count_fillers("The proposal reduces cost and improves access.")
    check("clean text has zero fillers", clean_total == 0, str(clean_total))

    # Fillers must actually hurt the confidence score.
    filler_heavy = speech_analysis_agent.compute_metrics(
        "So um like basically you know I mean actually literally um uh.", duration_seconds=6.0
    )
    clean = speech_analysis_agent.compute_metrics(
        "The proposal reduces cost and materially improves access for commuters.", duration_seconds=6.0
    )
    check("fillers lower confidence_score", filler_heavy["confidence_score"] < clean["confidence_score"],
          f"filler={filler_heavy['confidence_score']} clean={clean['confidence_score']}")
    check("filler_words_list is 'None' when clean", clean["filler_words_list"] == "None", clean["filler_words_list"])

    section("Pause detection from word timings")
    words = [
        {"word": "we", "start": 0.0, "end": 0.2},
        {"word": "should", "start": 0.2, "end": 0.5},
        {"word": "act", "start": 0.5, "end": 0.9},
        {"word": "now", "start": 2.4, "end": 2.8},   # 1.5s gap -> a pause
        {"word": "decisively", "start": 2.8, "end": 3.5},
    ]
    stats = speech_analysis_agent._pause_stats(words)
    check("detects the single long pause", stats["pause_count"] == 1, str(stats["pause_count"]))
    check("longest pause is 1.5s", abs(stats["longest_pause_seconds"] - 1.5) < 0.01, str(stats["longest_pause_seconds"]))
    check("speaking time excludes the pause", abs(stats["speaking_time_seconds"] - 2.0) < 0.01,
          str(stats["speaking_time_seconds"]))
    check("no pauses in continuous speech", speech_analysis_agent._pause_stats(words[:3])["pause_count"] == 0)
    check("empty timings do not raise", speech_analysis_agent._pause_stats([])["pause_count"] == 0)
    check("single word does not raise", speech_analysis_agent._pause_stats([words[0]])["pause_count"] == 0)

    section("Whisper availability")
    available = whisper_available()
    if available:
        print(f"  {GREEN}INFO{RESET}  faster-whisper is installed - audio transcription is live")
    else:
        print(f"  {YELLOW}INFO{RESET}  faster-whisper NOT installed - audio path will degrade gracefully")
        print(f"        {DIM}pip install faster-whisper  (plus system ffmpeg){RESET}")
    check("missing audio file returns a clear message, never raises",
          speech_analysis_agent.transcribe("no_such_file.mp3")["status"] == "transcription_unavailable")


# ---------------------------------------------------------------------------
# Offline: opponent persona resolution and configuration
# ---------------------------------------------------------------------------
def test_opponent_config() -> None:
    section("Opponent personas and difficulty")

    check("3 personas defined", len(PERSONAS) == 3, str(list(PERSONAS)))
    for expected in ["The Contrarian", "The Academic", "The Strategist"]:
        check(f"persona '{expected}' exists", expected in PERSONAS)
    for name, data in PERSONAS.items():
        check(f"{name}: has style and opening", bool(data.get("style")) and bool(data.get("opening")))

    check("3 difficulty levels", len(DIFFICULTY_LEVELS) == 3, str(list(DIFFICULTY_LEVELS)))

    resolve = opponent_agent._resolve_persona
    check("exact name resolves", resolve("The Strategist") == "The Strategist")
    check("lowercase resolves", resolve("strategist") == "The Strategist")
    check("uppercase resolves", resolve("CONTRARIAN") == "The Contrarian")
    check("with-article lowercase resolves", resolve("the academic") == "The Academic")
    check("unknown falls back to default", resolve("nonsense") == "The Contrarian")
    check("empty falls back to default", resolve("") == "The Contrarian")

    section("Opponent history formatting")
    fmt = opponent_agent._format_history
    check("empty history is labelled as the opening turn", "opening turn" in fmt([]))
    check("None history does not raise", "opening turn" in fmt(None))

    speaker_shape = fmt([{"speaker": "user", "text": "First point."}, {"speaker": "opponent", "text": "My reply."}])
    check("speaker/text shape renders both sides", "HUMAN: First point." in speaker_shape and "YOU: My reply." in speaker_shape,
          speaker_shape)

    # The backend's DebateTurn rows use this second shape - both must work.
    db_shape = fmt([{"user_argument": "DB point.", "ai_response": "DB reply."}])
    check("user_argument/ai_response shape also renders",
          "HUMAN: DB point." in db_shape and "YOU: DB reply." in db_shape, db_shape)

    long_history = [{"speaker": "user", "text": f"Turn {i}"} for i in range(40)]
    check("long history is truncated to bound the prompt", len(fmt(long_history).splitlines()) <= 12,
          str(len(fmt(long_history).splitlines())))


# ---------------------------------------------------------------------------
# Offline: counterargument configuration and validation
# ---------------------------------------------------------------------------
def test_counterargument_config() -> None:
    section("Counterargument types and validation")

    check("5 rebuttal types defined", len(REBUTTAL_TYPES) == 5, str(REBUTTAL_TYPES))
    for expected in ["Logical", "Evidence-Based", "Ethical", "Practical", "Policy"]:
        check(f"type '{expected}' exists", expected in REBUTTAL_TYPES)

    validate = counterargument_agent._validate_rebuttals

    check("non-list input returns empty", validate("not a list") == [])
    check("None input returns empty", validate(None) == [])
    check("unknown type is dropped", validate([{"rebuttal_type": "Vibes", "rebuttal_text": "x"}]) == [])
    check("empty rebuttal_text is dropped", validate([{"rebuttal_type": "Logical", "rebuttal_text": "  "}]) == [])
    check("non-dict items are skipped", validate(["string", 42, None]) == [])

    duplicated = validate([
        {"rebuttal_type": "Logical", "rebuttal_text": "first"},
        {"rebuttal_type": "Logical", "rebuttal_text": "second"},
    ])
    check("duplicate types are deduplicated", len(duplicated) == 1, str(len(duplicated)))

    # Output must come back in the spec's canonical order, not the model's order.
    shuffled = validate([
        {"rebuttal_type": "Policy", "rebuttal_text": "p"},
        {"rebuttal_type": "Logical", "rebuttal_text": "l"},
        {"rebuttal_type": "Ethical", "rebuttal_text": "e"},
    ])
    check("output is in canonical spec order",
          [r["rebuttal_type"] for r in shuffled] == ["Logical", "Ethical", "Policy"],
          str([r["rebuttal_type"] for r in shuffled]))

    clamped = validate([{"rebuttal_type": "Logical", "rebuttal_text": "x", "strength": 9999}])
    check("strength is clamped to 100", clamped[0]["strength"] == 100, str(clamped[0]["strength"]))
    junk = validate([{"rebuttal_type": "Logical", "rebuttal_text": "x", "strength": "high"}])
    check("non-numeric strength falls back to a default", junk[0]["strength"] == 60, str(junk[0]["strength"]))


# ---------------------------------------------------------------------------
# Offline: the never-raises contract, for every agent
# ---------------------------------------------------------------------------
def test_never_raises() -> None:
    section("Never-raises contract on bad input")

    bad_inputs = ["", "   ", "hi", "\n\t"]

    for text in bad_inputs:
        label = repr(text)
        try:
            result = counterargument_agent.run(text)
            check(f"counterargument({label}) returns a dict", isinstance(result, dict))
            check(f"counterargument({label}) has an explanatory message", bool(result.get("message")))
            check(f"counterargument({label}) has an empty rebuttals list", result.get("rebuttals") == [])
        except Exception as exc:
            check(f"counterargument({label}) did not raise", False, str(exc))

        try:
            result = opponent_agent.run(text, topic="Test motion")
            check(f"opponent({label}) returns a dict", isinstance(result, dict))
            check(f"opponent({label}) still has response_text", bool(result.get("response_text")))
            check(f"opponent({label}) reports a valid persona", result.get("persona") in PERSONAS)
        except Exception as exc:
            check(f"opponent({label}) did not raise", False, str(exc))

        try:
            result = scoring_agent.run(text)
            check(f"scoring({label}) returns a dict", isinstance(result, dict))
            check(f"scoring({label}) scores 0.0", result.get("overall_score") == 0.0, str(result.get("overall_score")))
            check(f"scoring({label}) exposes all 5 sub-scores",
                  set(result.get("sub_scores", {})) == set(SUB_SCORE_KEYS))
            check(f"scoring({label}) exposes the weights", result.get("weights") == SCORE_WEIGHTS)
        except Exception as exc:
            check(f"scoring({label}) did not raise", False, str(exc))

        try:
            result = speech_analysis_agent.run(transcript=text, include_feedback=False)
            check(f"speech({label}) returns a dict", isinstance(result, dict))
            check(f"speech({label}) has a metrics dict", isinstance(result.get("metrics"), dict))
        except Exception as exc:
            check(f"speech({label}) did not raise", False, str(exc))

    # None must be survivable too - routers can pass a null body field through.
    for name, call in [
        ("counterargument", lambda: counterargument_agent.run(None)),
        ("opponent", lambda: opponent_agent.run(None)),
        ("scoring", lambda: scoring_agent.run(None)),
        ("speech", lambda: speech_analysis_agent.run(transcript=None, include_feedback=False)),
    ]:
        try:
            check(f"{name}(None) returns a dict", isinstance(call(), dict))
        except Exception as exc:
            check(f"{name}(None) did not raise", False, str(exc))


# ---------------------------------------------------------------------------
# Live: real LLM calls. Opt-in with --live, since these cost quota.
# ---------------------------------------------------------------------------
def test_live_llm() -> None:
    section("LIVE LLM calls (--live)")

    TOPIC = "Cities should make public transport free."
    ARGUMENT = (
        "Public transport should be free in every major city. Fare collection eats a large share of "
        "the revenue it generates, and removing fares cuts car traffic, which lowers emissions and "
        "road maintenance costs."
    )

    print(f"  {DIM}Calling counterargument_agent...{RESET}")
    counter = counterargument_agent.run(ARGUMENT, topic=TOPIC, position="Affirmative")
    check("counterargument returned rebuttals", len(counter.get("rebuttals", [])) > 0, counter.get("message", ""))
    if counter.get("rebuttals"):
        check("all returned types are valid",
              all(r["rebuttal_type"] in REBUTTAL_TYPES for r in counter["rebuttals"]))
        check("strongest_type is a valid type", counter.get("strongest_type") in REBUTTAL_TYPES,
              str(counter.get("strongest_type")))

    print(f"  {DIM}Calling opponent_agent (turn 1)...{RESET}")
    turn_1 = opponent_agent.run(ARGUMENT, topic=TOPIC, persona="The Academic", history=[], turn_index=0)
    check("opponent generated a response", turn_1.get("status") == "response_generated", turn_1.get("message", ""))
    check("opponent held the requested persona", turn_1.get("persona") == "The Academic")
    check("opponent scored the human's turn", 0 <= turn_1.get("user_argument_strength", -1) <= 100)

    print(f"  {DIM}Calling opponent_agent (turn 2, with history)...{RESET}")
    history = [
        {"speaker": "user", "text": ARGUMENT},
        {"speaker": "opponent", "text": turn_1.get("response_text", "")},
    ]
    turn_2 = opponent_agent.run(
        "Even if fare revenue matters, the congestion savings outweigh it at city scale.",
        topic=TOPIC, persona="The Academic", history=history, turn_index=1,
    )
    check("opponent handled a second turn", turn_2.get("status") == "response_generated", turn_2.get("message", ""))
    check("turn_index is echoed back correctly", turn_2.get("turn_index") == 1)
    check("turn 2 is not a verbatim repeat of turn 1",
          turn_2.get("response_text") != turn_1.get("response_text"))

    print(f"  {DIM}Calling scoring_agent...{RESET}")
    score = scoring_agent.run(ARGUMENT, topic=TOPIC)
    check("scoring returned a score", score.get("status") == "scored", score.get("message", ""))
    if score.get("status") == "scored":
        recomputed = scoring_agent.compute_weighted_score(score["sub_scores"])
        check("overall_score matches a recomputation of the sub-scores",
              abs(recomputed - score["overall_score"]) < 0.01,
              f"stored={score['overall_score']} recomputed={recomputed}")
        check("grade is consistent with the score",
              score["grade"] == scoring_agent.grade_for(score["overall_score"])[0])
        check("improvement suggestions were returned", len(score.get("improvement_suggestions", [])) > 0)

    print(f"  {DIM}Calling speech_analysis_agent (text-only)...{RESET}")
    speech = speech_analysis_agent.run(
        transcript="So, um, I basically think that, you know, free transport is actually a good idea. "
                   "Like, it saves people money. And it reduces traffic.",
        duration_seconds=12.0,
    )
    check("speech analysis completed", speech.get("status") == "analyzed", speech.get("message", ""))
    check("delivery feedback was returned", bool(speech.get("feedback", {}).get("delivery_summary")))
    check("fillers were detected in a filler-heavy sample", speech["metrics"]["filler_words_count"] > 0,
          str(speech["metrics"]["filler_words_count"]))


# ---------------------------------------------------------------------------
# Offline: the LLM-failure path
#
# This is the case the first version of this suite missed. The bad-input tests
# above all return BEFORE the agent reaches the model, so they proved nothing
# about what happens when the provider itself dies. call_llm_json re-raises when
# both Groq and Gemini fail, which would surface as an unhandled 500 in a FastAPI
# route - hence safe_call_llm_json, and hence this test.
#
# Each agent module is patched individually because each imported the function
# into its own namespace.
# ---------------------------------------------------------------------------
def test_llm_failure_path() -> None:
    section("Never-raises contract when the LLM provider is down")

    import importlib

    # NOTE: `import app.agents.opponent_agent as m` does NOT give you the module here.
    # app/agents/__init__.py binds the singleton `opponent_agent` onto the package,
    # which shadows the identically-named submodule, so that import returns the agent
    # instance instead. importlib.import_module resolves the real module.
    counter_mod = importlib.import_module("app.agents.counterargument_agent")
    opponent_mod = importlib.import_module("app.agents.opponent_agent")
    scoring_mod = importlib.import_module("app.agents.scoring_agent")
    speech_mod = importlib.import_module("app.agents.speech_analysis")
    argument_mod = importlib.import_module("app.agents.argument_analysis_agent")
    fallacy_mod = importlib.import_module("app.agents.fallacy_detection_agent")

    modules = [counter_mod, opponent_mod, scoring_mod, speech_mod, argument_mod, fallacy_mod]
    check("resolved all 6 agent modules, not the singletons",
          all(hasattr(mod, "safe_call_llm_json") for mod in modules),
          str([mod.__name__ for mod in modules if not hasattr(mod, "safe_call_llm_json")]))
    originals = {mod.__name__: mod.safe_call_llm_json for mod in modules}

    # Simulate what safe_call_llm_json returns when both providers are unreachable.
    def dead_provider(system_prompt, user_prompt):
        return {"error": "LLM unavailable: simulated total provider outage", "raw_output": ""}

    # And simulate a provider that answers, but with the wrong JSON shape.
    def wrong_shape(system_prompt, user_prompt):
        return {"unexpected_key": "the model ignored the schema"}

    REAL_ARGUMENT = (
        "Cities should make public transport free, because fare collection consumes a large "
        "share of the revenue it generates and removing fares measurably reduces car traffic."
    )

    for label, fake in [("provider down", dead_provider), ("wrong JSON shape", wrong_shape)]:
        print(f"  {DIM}-- {label} --{RESET}")
        for mod in modules:
            mod.safe_call_llm_json = fake

        try:
            result = counterargument_agent.run(REAL_ARGUMENT, topic="Free transport")
            check(f"counterargument survives {label}", isinstance(result, dict))
            check(f"counterargument reports failure cleanly on {label}",
                  result.get("status") == "no_counterarguments_generated" and bool(result.get("message")),
                  str(result.get("status")))
        except Exception as exc:
            check(f"counterargument did not raise on {label}", False, str(exc))

        try:
            result = opponent_agent.run(REAL_ARGUMENT, topic="Free transport", persona="The Academic")
            check(f"opponent survives {label}", isinstance(result, dict))
            check(f"opponent still returns usable response_text on {label}", bool(result.get("response_text")))
            check(f"opponent flags the fallback on {label}", result.get("status") == "fallback_response",
                  str(result.get("status")))
        except Exception as exc:
            check(f"opponent did not raise on {label}", False, str(exc))

        try:
            result = opponent_agent.opening_statement("Free transport", persona="The Strategist")
            check(f"opponent.opening_statement survives {label}", bool(result.get("response_text")))
        except Exception as exc:
            check(f"opponent.opening_statement did not raise on {label}", False, str(exc))

        try:
            result = scoring_agent.run(REAL_ARGUMENT, topic="Free transport")
            check(f"scoring survives {label}", isinstance(result, dict))
            check(f"scoring returns 0.0 rather than a fabricated score on {label}",
                  result.get("overall_score") == 0.0, str(result.get("overall_score")))
            check(f"scoring still exposes all 5 sub-scores on {label}",
                  set(result.get("sub_scores", {})) == set(SUB_SCORE_KEYS))
        except Exception as exc:
            check(f"scoring did not raise on {label}", False, str(exc))

        try:
            result = speech_analysis_agent.run(transcript=REAL_ARGUMENT, duration_seconds=20.0)
            check(f"speech survives {label}", isinstance(result, dict))
            # Delivery metrics are pure Python, so they must still be computed even
            # with no model available at all.
            check(f"speech still returns real measured metrics on {label}",
                  result["metrics"]["speech_pace_wpm"] > 0, str(result["metrics"]["speech_pace_wpm"]))
            check(f"speech status is still 'analyzed' on {label}", result.get("status") == "analyzed",
                  str(result.get("status")))
        except Exception as exc:
            check(f"speech did not raise on {label}", False, str(exc))

        # The two pre-existing agents must honour the same contract, so nobody
        # copies an unsafe pattern from them later.
        try:
            result = argument_analysis_agent.run(REAL_ARGUMENT)
            check(f"argument_analysis survives {label}", isinstance(result, dict))
            check(f"argument_analysis returns 0 rather than a fabricated score on {label}",
                  result.get("strength_score") == 0, str(result.get("strength_score")))
        except Exception as exc:
            check(f"argument_analysis did not raise on {label}", False, str(exc))

        try:
            result = fallacy_detection_agent.run(REAL_ARGUMENT)
            check(f"fallacy_detection survives {label}", isinstance(result, dict))
            check(f"fallacy_detection reports no fallacies rather than inventing them on {label}",
                  result.get("fallacies_found") == [], str(result.get("fallacies_found")))
        except Exception as exc:
            check(f"fallacy_detection did not raise on {label}", False, str(exc))

    # Restore, so a later --live run is not silently neutered.
    for mod in modules:
        mod.safe_call_llm_json = originals[mod.__name__]
    check("patched functions were restored",
          all(mod.safe_call_llm_json is originals[mod.__name__] for mod in modules))


def main() -> None:
    live = "--live" in sys.argv

    print(f"{BOLD}LOGOS.AI - new agent test suite{RESET}")
    print(f"{DIM}Offline checks need no API key. Pass --live to also call the LLM.{RESET}")

    test_registry()
    test_scoring_weights()
    test_speech_metrics()
    test_opponent_config()
    test_counterargument_config()
    test_never_raises()
    test_llm_failure_path()

    if live:
        test_live_llm()
    else:
        section("LIVE LLM calls")
        print(f"  {YELLOW}SKIPPED{RESET}  re-run with --live to exercise the real model")

    total = _results["passed"] + _results["failed"]
    failed = _results["failed"]
    colour = GREEN if failed == 0 else RED
    summary = f"{_results['passed']}/{total} checks passed"
    if failed:
        summary += f", {failed} failed"
    print(f"\n{colour}{BOLD}{summary}{RESET}")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
