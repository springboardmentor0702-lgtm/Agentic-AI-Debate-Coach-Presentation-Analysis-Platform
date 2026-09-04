"""
scripts/check_gemini_models.py

Diagnoses the "404 Not Found" error on Gemini calls by asking the API
directly which models your specific API key actually has access to -
rather than guessing a new model name. Model availability genuinely
varies by project and by when the API key was created (Google has
retired/restricted several model names over the past year), so the
right fix depends on YOUR key, not a generic answer.

Run from the backend directory with your venv active:
    python scripts/check_gemini_models.py
"""
import os
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY not found in your .env file.")
    exit(1)

resp = requests.get(
    "https://generativelanguage.googleapis.com/v1beta/models",
    params={"key": api_key},
    timeout=15,
)

if not resp.ok:
    print(f"Could not list models: {resp.status_code}")
    print(resp.text)
    print("\nIf this itself fails, the problem is the API key or its permissions,")
    print("not the model name - check that the key is valid and the")
    print("Generative Language API is enabled for it in Google AI Studio.")
    exit(1)

models = resp.json().get("models", [])
print(f"Your API key has access to {len(models)} model(s):\n")

usable_for_generate = []
usable_for_embed = []

for m in models:
    name = m["name"].replace("models/", "")
    methods = m.get("supportedGenerationMethods", [])
    print(f"  {name}")
    print(f"    supports: {', '.join(methods) if methods else '(none listed)'}")
    if "generateContent" in methods:
        usable_for_generate.append(name)
    if "embedContent" in methods:
        usable_for_embed.append(name)

print("\n" + "=" * 60)
print("WHAT TO DO NEXT")
print("=" * 60)

if usable_for_generate:
    print(f"\nFor GEMINI_MODEL in your .env, use one of these (all confirmed")
    print(f"to support generateContent, which is what this project calls):")
    for name in usable_for_generate:
        print(f"  - {name}")
    print(f"\nPick whichever is fastest/cheapest for your use case - a 'flash'")
    print(f"variant if one is listed above is almost always the right choice")
    print(f"for this project's needs.")
else:
    print("\nNo model in your account supports generateContent at all.")
    print("This points to the API key itself, or the Generative Language API")
    print("not being enabled for this project in Google AI Studio / Cloud Console -")
    print("not a model-name problem.")

if usable_for_embed:
    print(f"\nFor GEMINI_EMBEDDING_MODEL, use one of these:")
    for name in usable_for_embed:
        print(f"  - {name}")
