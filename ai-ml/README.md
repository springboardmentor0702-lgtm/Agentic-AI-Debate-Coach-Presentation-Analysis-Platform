# Argument Analysis & Fallacy Detection Modules

This folder implements **two modules** from the AI Debate Coach & Presentation
Analysis Platform spec:

- **Module 4 — Argument Analysis Engine**: scores an argument's claim,
  evidence, clarity, relevance, and logical consistency.
- **Module 5 — Logical Fallacy Detection Engine**: scans an argument for 8
  known logical fallacies and suggests corrections.

Both modules are implemented as independent **agents** that follow the same
shared pattern (`BaseAgent`), so other teammates building the remaining
modules (AI opponent, coaching engine, scoring engine, etc.) can copy this
same shape.

---

## 1. How it works

```
Your text  ─────►  ArgumentAnalysisAgent  ─────►  JSON: scores + claim + evidence
           └────►  FallacyDetectionAgent  ─────►  JSON: fallacies found + fixes
```

Each agent sends your text to an LLM (a large language model) along with a
fixed instruction prompt telling it exactly what to look for and what JSON
shape to reply in. The LLM does the actual reasoning; the agent code just
packages the request and parses the response.

### LLM providers and deterministic local mode

`app/llm_client.py` is the single shared function both agents call to reach
an LLM. It is provider-aware and safe to run without credentials:

- `AI_ML_MODE=auto` (the default) uses providers when keys are available and falls back to deterministic local heuristics when they are unavailable.
- `AI_ML_MODE=local` never makes network calls and is recommended for demos, tests, and offline development.
- `AI_ML_MODE=provider` requires the configured Groq/Gemini credentials and returns provider errors instead of silently falling back.

The local implementation is dependency-free and explainable. It is a prototype fallback, not a substitute for a trained classifier or an evaluated LLM.

`app/llm_client.py` is the single shared function both agents call to reach
an LLM. When provider mode is used, it is provider-aware:

1. It tries **Groq** first (fast, generous free tier).
2. If Groq fails after its own retries (quota exhausted, rate-limited, no
   key set, model unavailable) it **automatically falls back to Gemini**
   using the exact same prompt — no code changes needed anywhere else.
3. If both fail, it raises the original Groq error so you can see what
   actually went wrong.

This means the app keeps working even if one provider's free tier runs out
mid-session.

---

## 2. What you need

- **Python 3.11 or 3.12** (avoid 3.14 for now — some dependency wheels lag
  behind the newest Python releases)
- No API key is required for local mode.
- An optional **Groq API key** (free) — https://console.groq.com/keys
- An optional **Gemini API key** (free) — https://aistudio.google.com/apikey
  (used only as backup when provider mode is enabled)

---

## 3. Setup

```bash
cd agents-restructured

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in this folder (same level as `requirements.txt`) only if you want external providers:

```env
AI_ML_MODE=auto
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=openai/gpt-oss-120b

GEMINI_API_KEY=your_gemini_key_here
LLM_MODEL=gemini-2.0-flash
```

For a fully offline run, use:

```env
AI_ML_MODE=local
```

> Model names change as providers deprecate old ones. If you get a `404` or
> "model not found" error, check the provider's current model list and
> update `GROQ_MODEL` / `LLM_MODEL` accordingly.

---

## 4. Running it

### Analyze a single argument from the command line

```bash
python -m app.run_flow "Your argument goes here as one string."
```

or run it interactively (it will prompt you to type one):

```bash
python -m app.run_flow
```

**Example:**

```bash
python -m app.run_flow "Either we ban cars completely or the planet is doomed."
```

Output is formatted with section headers, aligned scores, and color-coded
strength — plus the raw JSON at the bottom for debugging or copy-pasting
into other tools.

### Run the test suites

The fast offline regression suite requires no API keys:

```bash
AI_ML_MODE=local python -m pytest -q tests/test_offline.py
```

The provider-backed demo and manual accuracy script remain available when keys are configured:

```bash
python tests/test_agents_demo.py   # provider or automatic local fallback demo
python tests/test_fallacies.py     # live provider/manual-review script; paced to avoid rate limits
```

`test_fallacies.py` runs one example per fallacy type, a clean (no-fallacy)
example, and edge cases (empty/too-short/whitespace input) to confirm both
agents behave correctly across the full range of expected inputs.

---

## 5. Input & output

**Input:** any argument as plain text (a sentence or a few sentences).

**Output — Argument Analysis:**

```json
{
  "claim": "the main point being argued",
  "evidence": ["reasons or facts the speaker gave"],
  "strength_label": "weak | moderate | strong",
  "strength_score": 0,
  "clarity_score": 0,
  "relevance_score": 0,
  "logical_consistency_score": 0,
  "notes": "1-2 sentence explanation of the scoring"
}
```

| Field | Meaning |
|---|---|
| `claim` | The argument's main point, extracted and restated clearly |
| `evidence` | The reasons/facts the speaker actually offered (not judged yet, just listed) |
| `strength_score` | Overall verdict: how convincing the argument is as a whole |
| `clarity_score` | How understandable the sentence is, independent of whether it's logically sound |
| `relevance_score` | Whether the evidence actually relates to the claim, vs. being a tangent |
| `logical_consistency_score` | Whether the internal logic holds together — no contradictions or unjustified leaps |
| `notes` | The LLM's short justification for the scores above |

**Output — Fallacy Detection:**

```json
{
  "fallacies_found": [
    {
      "type": "Ad Hominem",
      "excerpt": "the exact phrase that triggered the flag",
      "explanation": "why this counts as that fallacy",
      "correction_suggestion": "how to fix the argument",
      "confidence": 0
    }
  ],
  "status": "fallacies_detected | none_found",
  "message": "human-readable summary"
}
```

Supported fallacy types: **Ad Hominem, Straw Man, False Dilemma, Slippery
Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red
Herring.**

---

## 6. Project structure

```
agents-restructured/
├── app/
│   ├── config.py                    # loads API keys/model names from .env
│   ├── llm_client.py                # Groq-primary/Gemini-fallback LLM caller
│   ├── run_flow.py                  # CLI entry point — run this to analyze text
│   └── agents/
│       ├── base_agent.py            # shared template every agent follows
│       ├── argument_analysis_agent.py
│       └── fallacy_detection_agent.py
├── tests/
│   ├── test_agents_demo.py          # quick demo of both agents
│   └── test_fallacies.py            # 12-case accuracy test
├── requirements.txt
└── .env                              # you create this — never commit it
```

---

## 7. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'app'` | Ran the file directly instead of as a module | Use `python -m app.run_flow ...`, not `python app/run_flow.py` |
| `429` rate limit | Free-tier quota hit on the current provider | The app retries automatically, then falls back to the other provider |
| `404 NOT_FOUND` on a model name | Provider deprecated that model | Update `GROQ_MODEL` / `LLM_MODEL` in `.env` to a current model name |
| Failed building wheel for `pydantic-core` | pip tried to compile from source (no Rust/MSVC linker) | `pip install --only-binary=:all: pydantic pydantic-core`, or use Python 3.11/3.12 |
| Both providers fail | Both API keys invalid, unset, or genuinely both out of quota | Check `.env`, verify keys work with a minimal test script for each provider |
