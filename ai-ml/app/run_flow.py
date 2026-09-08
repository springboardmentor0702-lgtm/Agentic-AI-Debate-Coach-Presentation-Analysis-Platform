import json
import sys

from app.agents.argument_analysis_agent import argument_analysis_agent
from app.agents.fallacy_detection_agent import fallacy_detection_agent

# ANSI colors - Windows 10+ terminals support these out of the box.
BOLD = "\033[1m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
RED = "\033[91m"
DIM = "\033[2m"
RESET = "\033[0m"


def pretty_json(data: dict) -> str:
    """Pretty-print a dict as indented, readable JSON."""
    return json.dumps(data, indent=2, ensure_ascii=False)


def section(title: str, color: str = CYAN) -> None:
    line = "=" * 60
    print(f"\n{color}{BOLD}{line}\n{title}\n{line}{RESET}")


def print_analysis(result: dict) -> None:
    label = result.get("strength_label", "unknown").upper()
    score = result.get("strength_score", 0)
    label_color = GREEN if score >= 60 else YELLOW if score >= 30 else RED

    print(f"\n{BOLD}Claim:{RESET} {result.get('claim', '(none)')}")

    evidence = result.get("evidence") or []
    print(f"\n{BOLD}Evidence given:{RESET}")
    if evidence:
        for i, e in enumerate(evidence, 1):
            print(f"  {i}. {e}")
    else:
        print(f"  {DIM}(none provided){RESET}")

    print(f"\n{BOLD}Scores (0-100):{RESET}")
    print(f"  Strength            : {label_color}{score:>3} ({label}){RESET}")
    print(f"  Clarity             : {result.get('clarity_score', 0):>3}")
    print(f"  Relevance           : {result.get('relevance_score', 0):>3}")
    print(f"  Logical consistency : {result.get('logical_consistency_score', 0):>3}")

    print(f"\n{BOLD}Notes:{RESET} {result.get('notes', '')}")


def print_fallacies(result: dict) -> None:
    fallacies = result.get("fallacies_found") or []

    if not fallacies:
        print(f"\n{GREEN}No clear logical fallacy detected.{RESET}")
        if result.get("message"):
            print(f"{DIM}{result['message']}{RESET}")
        return

    print(f"\n{YELLOW}{BOLD}{len(fallacies)} fallacy/ies detected:{RESET}\n")
    for i, f in enumerate(fallacies, 1):
        print(f"{BOLD}{i}. {f.get('type')}{RESET} (confidence: {f.get('confidence')}%)")
        print(f"   Excerpt     : \"{f.get('excerpt')}\"")
        print(f"   Why         : {f.get('explanation')}")
        print(f"   Fix it with : {f.get('correction_suggestion')}")
        print()


def main() -> None:
    if len(sys.argv) > 1:
        user_argument = " ".join(sys.argv[1:])
    else:
        user_argument = input("Enter your argument: ").strip()

    if not user_argument:
        print(f"{RED}No argument entered.{RESET}")
        return

    section("YOUR ARGUMENT", CYAN)
    print(user_argument)

    section("ARGUMENT ANALYSIS", CYAN)
    analysis_result = argument_analysis_agent.run(user_argument)
    print_analysis(analysis_result)

    section("FALLACY DETECTION", CYAN)
    fallacy_result = fallacy_detection_agent.run(user_argument)
    print_fallacies(fallacy_result)

    # Raw JSON always available too, for debugging or copy-pasting into other tools.
    section("RAW JSON (for debugging)", DIM)
    print(f"{DIM}Argument analysis:{RESET}")
    print(pretty_json(analysis_result))
    print(f"\n{DIM}Fallacy detection:{RESET}")
    print(pretty_json(fallacy_result))
    print()


if __name__ == "__main__":
    main()
