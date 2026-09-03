"""
Offline test suite for services/agent_bridge.py.

Run from the backend/ folder:
    python tests/test_agent_bridge.py

No API key, no network, no database, no pytest - same plain-script convention as
ai-ml/tests/. Safe to run on a laptop with nothing configured.

Why fake agents instead of real ones: the bridge's job is translation, and
translation bugs (a renamed key, an unclamped number, a model's invented total
being trusted) only show up when you control exactly what the agent returns. The
fakes are injected into the bridge's own cache, so the real LLM is never called.
"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services import agent_bridge as bridge  # noqa: E402

_results = {"passed": 0, "failed": 0}


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        _results["passed"] += 1
        print(f"  [PASS] {label}")
    else:
        _results["failed"] += 1
        print(f"  [FAIL] {label}" + (f" -> {detail}" if detail else ""))


def section(title: str) -> None:
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


# ---------------------------------------------------------------------------
# Fake agents. Each mimics one ai-ml agent's real return shape, including the
# hostile cases: wrong types, invented categories, duplicate entries, and a model
# that tries to set the final score itself.
# ---------------------------------------------------------------------------
class FakeArgumentAgent:
    def run(self, argument_text):
        return {
            "claim": "Cities should make public transport free",
            "evidence": ["fares cost 30% of revenue", "less car traffic", "lower emissions"],
            "strength_label": "strong",
            "strength_score": 80,
            "clarity_score": "90",          # string on purpose
            "relevance_score": 150,         # out of range on purpose
            "logical_consistency_score": 70,
            "notes": "Quantified and coherent.",
        }


class FakeFallacyAgent:
    def run(self, argument_text):
        return {
            "fallacies_found": [
                {
                    "type": "Ad Hominem",
                    "excerpt": "never finished university",
                    "explanation": "Attacks the person.",
                    "correction_suggestion": "Address the policy.",
                    "confidence": 95,
                },
                {"type": "Ad Hominem", "explanation": "duplicate", "correction_suggestion": "x"},
                {"type": "Vibes Fallacy", "explanation": "invented", "correction_suggestion": "y"},
                "not even a dict",
            ],
            "status": "fallacies_detected",
            "message": "Detected fallacies.",
        }


class FakeCounterAgent:
    def run(self, argument_text, topic="", position=""):
        return {
            "claim_targeted": "Free public transport",
            "rebuttals": [
                {"rebuttal_type": "Policy", "rebuttal_text": "Target the subsidy.", "challenge_question": "Why universal?", "strategy_tip": "Cost per rider.", "strength": 80},
                {"rebuttal_type": "Logical", "rebuttal_text": "Does not follow.", "challenge_question": "Which premise?", "strategy_tip": "Attack inference.", "strength": "75"},
                {"rebuttal_type": "Logical", "rebuttal_text": "duplicate type", "challenge_question": "q", "strategy_tip": "t"},
                {"rebuttal_type": "Vibes", "rebuttal_text": "invented type", "challenge_question": "q", "strategy_tip": "t"},
                {"rebuttal_type": "Ethical", "rebuttal_text": "", "challenge_question": "q", "strategy_tip": "t"},
            ],
            "strongest_type": "Policy",
            "overall_strategy": "Lead with policy.",
            "status": "counterarguments_generated",
            "message": "Generated.",
        }


class FakeOpponentAgent:
    def run(self, user_argument, topic="", persona="", history=None, user_position="", difficulty="", turn_index=0):
        self.last_history = history
        self.last_difficulty = difficulty
        return {
            "persona": persona,
            "response_text": "Your 30 percent figure is unsourced.",
            "tactic_used": "Burden of proof",
            "attacked_point": "the 30 percent claim",
            "challenge_question": "Who reported that?",
            "user_argument_strength": 72,
            "coach_note": "Cite it first.",
            "turn_index": turn_index,
            "status": "response_generated",
            "message": "ok",
        }

    def opening_statement(self, topic="", persona="", user_position=""):
        return {
            "persona": persona,
            "response_text": f"I oppose {topic}.",
            "tactic_used": "Frame the motion",
            "challenge_question": "What is your strongest reason?",
            "coach_note": "Open with your best point.",
            "status": "opening_generated",
            "message": "ok",
        }


class FakeScoringAgent:
    def run(self, argument_text, topic="", transcript=None, fallacies_found=None, speech_metrics=None):
        return {
            "sub_scores": {
                "argument_quality": 80,
                "evidence_usage": 60,
                "logical_consistency": 90,
                "rebuttal_effectiveness": 40,
                "communication_skills": 70,
            },
            # The model tries to grade itself. Both must be ignored.
            "overall_score": 999.0,
            "grade": "A++",
            "band": "Flawless",
            "rationale": {"argument_quality": "Clear."},
            "strengths": ["Clear thesis"],
            "weaknesses": ["Thin evidence"],
            "improvement_suggestions": ["Cite the figure"],
            "judge_summary": "Solid but under-sourced.",
            "status": "scored",
            "message": "ok",
        }


class FakeSpeechAgent:
    def run(self, audio_path=None, transcript="", duration_seconds=0.0, language=None):
        return {
            "transcript": transcript or "transcribed words here",
            "language": "en",
            "metrics": {
                "speech_pace_wpm": 172.5,      # legitimately over 100
                "filler_words_count": 4,
                "filler_words_list": "um:2, like:2",
                "confidence_score": 68.0,
                "clarity_score": 74.0,
                "engagement_score": 71.0,
                "word_count": 120,
                "duration_seconds": 41.7,
                "pause_count": 3,
            },
            "feedback": {"delivery_summary": "Brisk.", "tone": "Confident"},
            "transcription_status": "transcribed" if audio_path else "skipped",
            "status": "analyzed",
            "message": "ok",
        }

    def transcribe(self, audio_path, language=None):
        return {
            "transcript": "hello world",
            "language": "en",
            "duration_seconds": 2.5,
            "words": [{"word": "hello", "start": 0.0, "end": 0.4}],
            "segments": [{"start": 0.0, "end": 2.5, "text": "hello world"}],
            "status": "transcribed",
            "message": "ok",
        }


class DeadAgent:
    """Every agent's documented failure mode: no raise, empty shape-stable dict."""

    def run(self, *args, **kwargs):
        return {"status": "not_scored", "message": "LLM unavailable: no API key"}

    def opening_statement(self, *args, **kwargs):
        return {"status": "fallback_response", "message": "LLM unavailable"}

    def transcribe(self, *args, **kwargs):
        return {"transcript": "", "status": "transcription_unavailable", "message": "no whisper"}


class ChaosAgent:
    """A model that ignores the schema entirely."""

    def run(self, *args, **kwargs):
        return {"lol": None, "sub_scores": "not a dict", "rebuttals": 42, "fallacies_found": None}

    def opening_statement(self, *args, **kwargs):
        return {"nope": True}

    def transcribe(self, *args, **kwargs):
        return {"garbage": 1}


def use_agents(**overrides):
    """
    Point the bridge at fake agents. Sets _load_attempted so the real import is
    never triggered, and returns a restore callable.
    """
    previous = (bridge._agents, bridge._load_attempted, bridge._load_error, bridge._scoring_class)
    registry = {
        "argument_analysis": FakeArgumentAgent(),
        "fallacy_detection": FakeFallacyAgent(),
        "counterargument": FakeCounterAgent(),
        "opponent": FakeOpponentAgent(),
        "scoring": FakeScoringAgent(),
        "speech_analysis": FakeSpeechAgent(),
    }
    registry.update(overrides)
    bridge._agents = registry
    bridge._load_attempted = True
    bridge._load_error = None
    bridge._scoring_class = None  # exercise the bridge's own arithmetic

    def restore():
        bridge._agents, bridge._load_attempted, bridge._load_error, bridge._scoring_class = previous

    return registry, restore


def use_no_agents():
    """Force the deterministic path, as if no API key were configured."""
    previous = (bridge._agents, bridge._load_attempted, bridge._load_error, bridge._scoring_class)
    bridge._agents = None
    bridge._load_attempted = True
    bridge._load_error = "test: agents disabled"
    bridge._scoring_class = None

    def restore():
        bridge._agents, bridge._load_attempted, bridge._load_error, bridge._scoring_class = previous

    return restore


SAMPLE = (
    "Cities should make public transport free. Fare collection eats roughly 30 percent of the "
    "revenue it raises, and removing fares cuts car traffic, which lowers emissions."
)


# ---------------------------------------------------------------------------
def test_weighted_scoring():
    section("Weighted scoring model (30/20/20/15/15)")
    check("weights sum to exactly 1.0", abs(sum(bridge.SCORE_WEIGHTS.values()) - 1.0) < 1e-9)
    check("argument_quality is 30%", bridge.SCORE_WEIGHTS["argument_quality"] == 0.30)
    check("evidence_usage is 20%", bridge.SCORE_WEIGHTS["evidence_usage"] == 0.20)
    check("logical_consistency is 20%", bridge.SCORE_WEIGHTS["logical_consistency"] == 0.20)
    check("rebuttal_effectiveness is 15%", bridge.SCORE_WEIGHTS["rebuttal_effectiveness"] == 0.15)
    check("communication_skills is 15%", bridge.SCORE_WEIGHTS["communication_skills"] == 0.15)

    full = {key: 100 for key in bridge.SUB_SCORE_KEYS}
    check("all 100 -> 100.0", bridge.compute_weighted_score(full) == 100.0)
    check("all 0 -> 0.0", bridge.compute_weighted_score({key: 0 for key in bridge.SUB_SCORE_KEYS}) == 0.0)
    check("empty dict -> 0.0 (not full marks)", bridge.compute_weighted_score({}) == 0.0)
    check("only argument_quality=100 -> 30.0", bridge.compute_weighted_score({"argument_quality": 100}) == 30.0)
    check("None dict -> 0.0", bridge.compute_weighted_score(None) == 0.0)
    check("negatives clamped to 0", bridge.compute_weighted_score({key: -50 for key in bridge.SUB_SCORE_KEYS}) == 0.0)
    check("above 100 clamped", bridge.compute_weighted_score({key: 500 for key in bridge.SUB_SCORE_KEYS}) == 100.0)
    check("non-numeric counts as 0", bridge.compute_weighted_score({key: "high" for key in bridge.SUB_SCORE_KEYS}) == 0.0)

    known = {"argument_quality": 80, "evidence_usage": 60, "logical_consistency": 90,
             "rebuttal_effectiveness": 40, "communication_skills": 70}
    expected = round(0.30 * 80 + 0.20 * 60 + 0.20 * 90 + 0.15 * 40 + 0.15 * 70, 1)
    check(f"hand-computed case -> {expected}", bridge.compute_weighted_score(known) == expected,
          f"got {bridge.compute_weighted_score(known)}")

    for score, expected_grade in [(100, "A"), (90, "A"), (89.9, "B"), (80, "B"), (70, "C"),
                                  (69.9, "D"), (60, "D"), (59.9, "F"), (0, "F")]:
        grade, _ = bridge.grade_for(score)
        check(f"score {score} -> grade {expected_grade}", grade == expected_grade, f"got {grade}")


def test_api_score_mapping():
    section("Sub-score name mapping (evidence_usage <-> evidence_use)")
    scored = {"sub_scores": {"argument_quality": 80, "evidence_usage": 60, "logical_consistency": 90,
                             "rebuttal_effectiveness": 40, "communication_skills": 70}}
    api = bridge.to_api_scores(scored)
    check("uses the DB/API name evidence_use", "evidence_use" in api)
    check("drops the agent name evidence_usage", "evidence_usage" not in api)
    check("value survives the rename", api["evidence_use"] == 60.0)
    # 0.30(80) + 0.20(60) + 0.20(90) + 0.15(40) + 0.15(70) = 24 + 12 + 18 + 6 + 10.5
    check("total recomputed, not copied", api["overall_weighted_score"] == 70.5,
          f"got {api['overall_weighted_score']}")
    check("all six API keys present", set(api) == {
        "argument_quality", "evidence_use", "logical_consistency",
        "rebuttal_effectiveness", "communication_skills", "overall_weighted_score"})

    round_trip = bridge.from_api_scores(api)
    check("round trip restores agent keys", set(round_trip) == set(bridge.SUB_SCORE_KEYS))
    check("round trip preserves values", round_trip["evidence_usage"] == 60.0)
    check("garbage payload -> zeros", bridge.from_api_scores(None) == {k: 0.0 for k in bridge.SUB_SCORE_KEYS})


def test_llm_path_normalization():
    section("LLM path: agent output -> one API shape")
    _, restore = use_agents()
    try:
        result = bridge.analyze_argument(SAMPLE, topic="Transit")
        check("engine is llm_agent", result["engine"] == bridge.ENGINE_LLM)
        check("string score coerced to float", result["clarity_score"] == 90.0)
        check("out-of-range score clamped to 100", result["relevance_score"] == 100.0,
              f"got {result['relevance_score']}")
        check("claim carries the shared prefix", result["claim_identified"].startswith("Main Proposition: "))
        check("evidence items passed through", len(result["evidence_items"]) == 3)
        check("evidence_strength = full credit at 3+ items", result["evidence_strength"] == 80.0,
              f"got {result['evidence_strength']}")
        check("reasoning_quality is the documented mean",
              result["reasoning_quality"] == round((80.0 + 70.0 + 90.0) / 3.0, 1),
              f"got {result['reasoning_quality']}")
        check("status is analyzed", result["status"] == "analyzed")

        check("invented fallacy dropped", all(f["fallacy_type"] != "Vibes Fallacy" for f in result["fallacies"]))
        check("duplicate fallacy collapsed", len(result["fallacies"]) == 1, f"got {len(result['fallacies'])}")
        check("non-dict fallacy entry ignored", isinstance(result["fallacies"][0], dict))
        check("confidence preserved from the model", result["fallacies"][0]["confidence"] == 95)

        types = [r["rebuttal_type"] for r in result["counterarguments"]]
        check("invented rebuttal type dropped", "Vibes" not in types)
        check("duplicate rebuttal type collapsed", types.count("Logical") == 1)
        check("empty rebuttal_text dropped", "Ethical" not in types)
        check("canonical spec order enforced", types == ["Logical", "Policy"], f"got {types}")
        check("string strength coerced to int", isinstance(
            next(r for r in result["counterarguments"] if r["rebuttal_type"] == "Logical")["strength"], int))

        # Evidence coverage heuristic is monotone and never inflates.
        one_item = bridge.analyze_argument("x", include_fallacies=False, include_counterarguments=False)
        check("short text still returns the full shape", set(one_item) == set(result))
    finally:
        restore()


def test_llm_scoring_cannot_self_grade():
    section("LLM path: the model is not allowed to grade itself")
    _, restore = use_agents()
    try:
        scored = bridge.score_performance(SAMPLE)
        check("engine is llm_agent", scored["engine"] == bridge.ENGINE_LLM)
        check("model's overall_score 999 ignored", scored["overall_score"] == 70.5, f"got {scored['overall_score']}")
        check("model's grade 'A++' ignored", scored["grade"] == "C", f"got {scored['grade']}")
        check("band derived from the real score", scored["band"] == "Competent", f"got {scored['band']}")
        check("weights echoed for transparency", scored["weights"] == dict(bridge.SCORE_WEIGHTS))
        check("every dimension has a rationale key", set(scored["rationale"]) == set(bridge.SUB_SCORE_KEYS))
        check("missing rationale becomes empty string", scored["rationale"]["evidence_usage"] == "")
        check("coaching lists carried through", scored["improvement_suggestions"] == ["Cite the figure"])
    finally:
        restore()


def test_llm_opponent_and_speech():
    section("LLM path: opponent and speech mapping")
    registry, restore = use_agents()
    try:
        history = [{"user_argument": "a", "ai_response": "b"}]
        turn = bridge.simulate_opponent(SAMPLE, topic="Transit", persona="academic",
                                        history=history, difficulty="brutal", turn_index=3)
        check("engine is llm_agent", turn["engine"] == bridge.ENGINE_LLM)
        check("loose persona resolved", turn["persona"] == "The Academic")
        check("response_text -> opponent_rebuttal", turn["opponent_rebuttal"].startswith("Your 30 percent"))
        check("coach_note -> coaching_tip", turn["coaching_tip"] == "Cite it first.")
        check("user_argument_strength -> rebuttal_strength_percent", turn["rebuttal_strength_percent"] == 72.0)
        check("turn_index echoed", turn["turn_index"] == 3)
        check("history reached the agent", registry["opponent"].last_history == history)
        check("invalid difficulty coerced to medium", registry["opponent"].last_difficulty == "medium")
        check("fallacies filled in for the turn", len(turn["fallacies_detected"]) == 1)

        opening = bridge.opening_statement("Free transit", persona="strategist")
        check("opening resolves persona", opening["persona"] == "The Strategist")
        check("opening has text", "Free transit" in opening["opponent_rebuttal"])
        check("opening turn_index is 0", opening["turn_index"] == 0)

        speech = bridge.analyze_speech(transcript="um like so", duration_seconds=10.0)
        check("engine is llm_agent", speech["engine"] == bridge.ENGINE_LLM)
        check("wpm above 100 not clamped", speech["metrics"]["speech_pace_wpm"] == 172.5,
              f"got {speech['metrics']['speech_pace_wpm']}")
        check("all metric keys present", set(speech["metrics"]) == set(bridge._METRIC_DEFAULTS))
        check("missing prosody key defaults, not KeyError", speech["metrics"]["pace_variability"] == 0.0)
        check("filler list is a string", isinstance(speech["metrics"]["filler_words_list"], str))
        check("feedback passed through", speech["feedback"]["tone"] == "Confident")

        six = bridge.db_metrics(speech["metrics"])
        check("db_metrics returns exactly the six columns", set(six) == set(bridge.DB_METRIC_KEYS))

        audio = bridge.transcribe_audio("anything.mp3")
        check("transcription passes through", audio["transcript"] == "hello world")
        check("word timings preserved", len(audio["words"]) == 1)
    finally:
        restore()


def test_deterministic_path():
    section("Deterministic path (no API key configured)")
    restore = use_no_agents()
    try:
        result = bridge.analyze_argument(SAMPLE)
        check("engine is deterministic", result["engine"] == bridge.ENGINE_DETERMINISTIC)
        check("still returns all six sub-scores", all(
            isinstance(result[key], float) for key in
            ["evidence_strength", "reasoning_quality", "clarity_score", "relevance_score",
             "logical_consistency", "persuasiveness_score"]))
        check("produces the 5 template rebuttals", len(result["counterarguments"]) == 5)
        check("rebuttals in canonical order",
              [r["rebuttal_type"] for r in result["counterarguments"]] == list(bridge.REBUTTAL_TYPES))
        check("notes explain how to enable the LLM", "GROQ_API_KEY" in result["notes"])

        fallacious = bridge.analyze_argument("Everyone knows she is an idiot, so her policy is wrong.")
        check("regex engine catches an obvious fallacy", len(fallacious["fallacies"]) >= 1)
        check("regex fallacies carry a fixed confidence",
              all(f["confidence"] == bridge._REGEX_FALLACY_CONFIDENCE for f in fallacious["fallacies"]))
        check("regex fallacies have no fabricated excerpt",
              all(f["excerpt"] == "" for f in fallacious["fallacies"]))

        standalone = bridge.detect_fallacies("Either we ban all cars or the planet is finished.")
        check("standalone detection works offline", standalone["engine"] == bridge.ENGINE_DETERMINISTIC)
        check("standalone detection finds something", len(standalone["fallacies"]) >= 1)

        counters = bridge.generate_counterarguments(SAMPLE)
        check("template counterarguments returned", len(counters["counterarguments"]) == 5)
        check("claim_targeted has no leftover prefix", "Main Proposition:" not in counters["claim_targeted"])

        turn = bridge.simulate_opponent(SAMPLE, persona="The Strategist")
        check("deterministic opponent replies", len(turn["opponent_rebuttal"]) > 20)
        check("deterministic opponent honours persona", turn["persona"] == "The Strategist")

        scored = bridge.score_performance(SAMPLE)
        check("deterministic scoring works", scored["status"] == "scored")
        check("total matches the weights", scored["overall_score"] == bridge.compute_weighted_score(scored["sub_scores"]))
        check("grade is consistent with the total", scored["grade"] == bridge.grade_for(scored["overall_score"])[0])
        check("every dimension explained", all(scored["rationale"][key] for key in bridge.SUB_SCORE_KEYS))
        check("suggestions are never empty", len(scored["improvement_suggestions"]) >= 1)

        speech = bridge.analyze_speech(transcript="Um, so basically, like, you know.", duration_seconds=6.0)
        check("deterministic speech metrics", speech["status"] == "analyzed")
        check("fillers actually counted", speech["metrics"]["filler_words_count"] >= 4)
        check("six DB keys still present", set(bridge.db_metrics(speech["metrics"])) == set(bridge.DB_METRIC_KEYS))

        estimated = bridge.analyze_speech(transcript="one two three four five six seven", duration_seconds=0)
        check("zero duration estimated, not an error", estimated["status"] == "analyzed")
        check("estimate is disclosed in the message", "estimate" in estimated["message"])

        audio = bridge.transcribe_audio("anything.mp3")
        check("no transcription without the agent layer", audio["status"] == "transcription_unavailable")
        check("and it says why", "agent layer" in audio["message"])

        speech_from_audio = bridge.analyze_speech(audio_path="nope.mp3")
        check("audio-only request degrades honestly", speech_from_audio["status"] == "not_analyzed")
    finally:
        restore()


def test_engine_field_always_present():
    section("Every response declares which engine produced it")
    for label, restore_factory in [("llm", lambda: use_agents()[1]), ("deterministic", use_no_agents)]:
        restore = restore_factory()
        try:
            calls = {
                "analyze_argument": bridge.analyze_argument(SAMPLE),
                "detect_fallacies": bridge.detect_fallacies(SAMPLE),
                "generate_counterarguments": bridge.generate_counterarguments(SAMPLE),
                "simulate_opponent": bridge.simulate_opponent(SAMPLE),
                "opening_statement": bridge.opening_statement("Transit"),
                "score_performance": bridge.score_performance(SAMPLE),
                "analyze_speech": bridge.analyze_speech(transcript=SAMPLE, duration_seconds=30.0),
                "transcribe_audio": bridge.transcribe_audio("x.mp3"),
            }
            for name, payload in calls.items():
                check(f"{label}: {name} declares an engine", payload.get("engine") in bridge.ENGINES_VALID,
                      f"got {payload.get('engine')}")
        finally:
            restore()


def test_never_raises():
    section("Never raises, whatever the input")
    hostile = [None, "", "   ", "a", 12345, ["list"], {"dict": 1}, "x" * 30000, "\x00\x01", "🙂🙂🙂"]

    for label, restore_factory in [
        ("healthy agents", lambda: use_agents()[1]),
        ("dead agents", lambda: use_agents(**{k: DeadAgent() for k in [
            "argument_analysis", "fallacy_detection", "counterargument",
            "opponent", "scoring", "speech_analysis"]})[1]),
        ("chaos agents", lambda: use_agents(**{k: ChaosAgent() for k in [
            "argument_analysis", "fallacy_detection", "counterargument",
            "opponent", "scoring", "speech_analysis"]})[1]),
        ("no agents", use_no_agents),
    ]:
        restore = restore_factory()
        failures = []
        try:
            for value in hostile:
                for name, call in [
                    ("analyze_argument", lambda v=value: bridge.analyze_argument(v)),
                    ("detect_fallacies", lambda v=value: bridge.detect_fallacies(v)),
                    ("generate_counterarguments", lambda v=value: bridge.generate_counterarguments(v)),
                    ("simulate_opponent", lambda v=value: bridge.simulate_opponent(v, persona=v, difficulty=v)),
                    ("opening_statement", lambda v=value: bridge.opening_statement(v, persona=v)),
                    ("score_performance", lambda v=value: bridge.score_performance(v)),
                    ("analyze_speech", lambda v=value: bridge.analyze_speech(transcript=v, duration_seconds=v)),
                    ("transcribe_audio", lambda v=value: bridge.transcribe_audio(v)),
                    ("compute_weighted_score", lambda v=value: bridge.compute_weighted_score(v)),
                    ("db_metrics", lambda v=value: bridge.db_metrics(v)),
                    ("to_api_scores", lambda v=value: bridge.to_api_scores(v)),
                ]:
                    try:
                        outcome = call()
                        if outcome is None:
                            failures.append(f"{name}({value!r}) returned None")
                    except Exception as exc:  # noqa: BLE001 - that is the point of the test
                        failures.append(f"{name}({value!r}) raised {type(exc).__name__}: {exc}")
            check(f"{label}: {len(hostile)} hostile inputs x 11 functions never raise",
                  not failures, "; ".join(failures[:3]))
        finally:
            restore()


def test_degradation_shapes():
    section("Degradation keeps the shape stable")
    dead = {k: DeadAgent() for k in ["argument_analysis", "fallacy_detection", "counterargument",
                                     "opponent", "scoring", "speech_analysis"]}
    _, restore = use_agents(**dead)
    try:
        result = bridge.analyze_argument(SAMPLE)
        check("dead agent -> all score keys still present", all(
            key in result for key in ["evidence_strength", "reasoning_quality", "clarity_score",
                                      "relevance_score", "logical_consistency", "persuasiveness_score"]))
        check("dead agent -> zeroed, not None", result["evidence_strength"] == 0.0)
        check("dead agent -> lists not None", result["fallacies"] == [] and isinstance(result["counterarguments"], list))

        scored = bridge.score_performance(SAMPLE)
        check("dead scoring agent falls back to local scoring", scored["engine"] == bridge.ENGINE_DETERMINISTIC)
        check("fallback still produces a usable total", scored["status"] == "scored")

        turn = bridge.simulate_opponent(SAMPLE)
        check("dead opponent falls back to the local engine", turn["engine"] == bridge.ENGINE_DETERMINISTIC)
        check("fallback turn still has a reply", len(turn["opponent_rebuttal"]) > 20)

        speech = bridge.analyze_speech(transcript="um like so words here", duration_seconds=5.0)
        check("dead speech agent measures locally", speech["engine"] == bridge.ENGINE_DETERMINISTIC)
        check("fallback speech still analyzed", speech["status"] == "analyzed")
    finally:
        restore()

    _, restore = use_agents(**{k: ChaosAgent() for k in dead})
    try:
        result = bridge.analyze_argument(SAMPLE)
        check("schema-ignoring model -> valid shape", isinstance(result["fallacies"], list))
        check("schema-ignoring model -> numeric zeros", result["clarity_score"] == 0.0)
        scored = bridge.score_performance(SAMPLE)
        check("schema-ignoring model -> local scoring", scored["engine"] == bridge.ENGINE_DETERMINISTIC)
        check("schema-ignoring model -> valid total", 0.0 <= scored["overall_score"] <= 100.0)
    finally:
        restore()


def test_helpers_and_status():
    section("Helpers, persona resolution, status reporting")
    check("The Contrarian is the default", bridge.DEFAULT_PERSONA == "The Contrarian")
    for raw, expected in [("academic", "The Academic"), ("THE STRATEGIST", "The Strategist"),
                          ("  contrarian  ", "The Contrarian"), ("The Academic", "The Academic"),
                          ("wizard", "The Contrarian"), ("", "The Contrarian"), (None, "The Contrarian")]:
        check(f"persona {raw!r} -> {expected}", bridge._resolve_persona(raw) == expected)
    for raw, expected in [("easy", "easy"), ("HARD", "hard"), ("brutal", "medium"), (None, "medium")]:
        check(f"difficulty {raw!r} -> {expected}", bridge._resolve_difficulty(raw) == expected)

    check("8 spec fallacies listed", len(bridge.SUPPORTED_FALLACIES) == 8)
    check("5 spec rebuttal types listed", len(bridge.REBUTTAL_TYPES) == 5)
    check("3 personas listed", len(bridge.PERSONAS) == 3)

    restore = use_no_agents()
    try:
        info = bridge.status()
        check("status reports the deterministic engine", info["active_engine"] == bridge.ENGINE_DETERMINISTIC)
        check("status explains why", bool(info["unavailable_reason"]))
        check("status never leaks a key value", not any(
            isinstance(value, str) and len(value) > 30 and value.startswith(("gsk_", "AIza"))
            for value in info.values()))
        check("status reports key SOURCE only", set(info["key_sources"]) == {"GROQ_API_KEY", "GEMINI_API_KEY"})
        check("status is JSON-serializable", _is_json_safe(info))
    finally:
        restore()


def _is_json_safe(value) -> bool:
    import json
    try:
        json.dumps(value)
        return True
    except (TypeError, ValueError):
        return False


if __name__ == "__main__":
    # Valid engine labels, used by test_engine_field_always_present.
    bridge.ENGINES_VALID = (bridge.ENGINE_LLM, bridge.ENGINE_DETERMINISTIC)

    print("=" * 70)
    print("agent_bridge offline test suite")
    print("No API key, no network, no database required.")
    print("=" * 70)

    test_weighted_scoring()
    test_api_score_mapping()
    test_llm_path_normalization()
    test_llm_scoring_cannot_self_grade()
    test_llm_opponent_and_speech()
    test_deterministic_path()
    test_engine_field_always_present()
    test_never_raises()
    test_degradation_shapes()
    test_helpers_and_status()

    total = _results["passed"] + _results["failed"]
    failed = _results["failed"]
    summary = f"\n{_results['passed']}/{total} checks passed"
    if failed:
        summary += f", {failed} FAILED"
    print("=" * 70)
    print(summary)
    print("=" * 70)
    sys.exit(1 if failed else 0)
