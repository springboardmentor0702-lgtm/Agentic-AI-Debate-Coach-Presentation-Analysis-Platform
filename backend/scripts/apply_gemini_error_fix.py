"""
scripts/apply_gemini_error_fix.py

Applies one precise, targeted edit to app/core/llm_client.py: replaces
resp.raise_for_status() in _call_gemini with a version that surfaces
Google's actual error message instead of a generic "404 Client Error"
with no explanation.

This is a find-and-replace against your REAL file, not a
reconstruction - it only touches the exact block shown below and
leaves everything else in the file (including _call_groq, which I've
only ever seen part of) completely untouched.

Run from the backend directory:
    python scripts/apply_gemini_error_fix.py
"""
import pathlib
import sys

TARGET = pathlib.Path("app/core/llm_client.py")

OLD = '''    resp = requests.post(
        url,
        params={"key": settings.GEMINI_API_KEY},
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]'''

NEW = '''    resp = requests.post(
        url,
        params={"key": settings.GEMINI_API_KEY},
        json=body,
        timeout=30,
    )
    if not resp.ok:
        # raise_for_status() alone throws away Google's actual error
        # message ("API key not valid", "model not found", etc.) -
        # surfacing the real response body makes every future failure
        # self-diagnosing instead of a bare "404 Client Error."
        raise RuntimeError(f"Gemini {resp.status_code}: {resp.text[:500]}")
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]'''

if not TARGET.exists():
    print(f"ERROR: {TARGET} not found. Run this from the backend/ directory.")
    sys.exit(1)

content = TARGET.read_text(encoding="utf-8")

if NEW in content:
    print("Already applied - no changes made.")
    sys.exit(0)

if OLD not in content:
    print("Could not find the exact expected block to replace.")
    print("This means the file has changed since I last saw it - safer to")
    print("apply this by hand than to guess. Paste your current")
    print("_call_gemini function back and I'll give you an exact patch for it.")
    sys.exit(1)

TARGET.write_text(content.replace(OLD, NEW), encoding="utf-8")
print(f"Patched {TARGET} successfully.")
print("Restart uvicorn (not just --reload) and try an AI call again.")
