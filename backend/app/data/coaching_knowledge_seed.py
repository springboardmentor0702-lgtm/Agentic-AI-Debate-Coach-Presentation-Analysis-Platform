"""
Seed content for the coaching knowledge base (Segment 9's RAG source).

A small, curated set of concrete debate and presentation techniques -
not an exhaustive library, just enough that retrieval has genuinely
relevant material to pull from for each of the 5 performance
components. Run `scripts/seed_knowledge_base.py` once to embed and
insert these into Supabase.

Add more entries here anytime - the seed script skips titles that
already exist, so it's safe to re-run after adding new ones.
"""

KNOWLEDGE_ENTRIES = [
    # --- argumentation ---
    {
        "category": "argumentation",
        "title": "Lead with your strongest claim",
        "content": "Open with your single most compelling point, not your safest one. Audiences and judges weight first impressions heavily - a strong opening claim sets the frame the rest of your argument gets judged against.",
    },
    {
        "category": "argumentation",
        "title": "Use claim, evidence, warrant structure",
        "content": "Every argument needs three parts: the claim (what you're asserting), the evidence (what supports it), and the warrant (why that evidence actually proves the claim). Most weak arguments are missing the warrant - they present evidence without explaining why it logically connects to the conclusion.",
    },
    {
        "category": "argumentation",
        "title": "Avoid stacking unsupported claims",
        "content": "Listing five claims with no support each is weaker than developing one claim fully with evidence and reasoning. Depth beats breadth - a judge or opponent will attack your weakest unsupported claim, not credit you for volume.",
    },
    {
        "category": "argumentation",
        "title": "Anticipate the obvious counterargument",
        "content": "If there's a counterargument any reasonable person would immediately think of, address it before the opponent raises it. Pre-empting the obvious objection makes you look more credible and steals the opponent's strongest move.",
    },
    # --- evidence ---
    {
        "category": "evidence",
        "title": "Prefer specific data over vague appeals",
        "content": "'Studies show' is weak. 'A 2024 Stanford study of 500 remote workers found a 13% productivity increase' is strong. Specificity signals you've actually done the research and gives the evidence something concrete to be evaluated on.",
    },
    {
        "category": "evidence",
        "title": "State why the source is relevant, not just that it exists",
        "content": "Citing a source isn't enough - explain why that source's methodology or authority actually supports your specific claim. A source about a related but different population or context is a common weak spot opponents will exploit.",
    },
    {
        "category": "evidence",
        "title": "Use recent, verifiable statistics",
        "content": "Old or unverifiable statistics get discounted by skeptical judges. When possible, cite a source specific enough that someone could actually go look it up - a name, a year, an institution.",
    },
    # --- fallacies / logic ---
    {
        "category": "fallacies",
        "title": "Watch for hasty generalization",
        "content": "Drawing a broad conclusion from a small or unrepresentative sample is one of the most common weaknesses in debate arguments. Before generalizing, ask: is my sample actually representative of the broader claim I'm making?",
    },
    {
        "category": "fallacies",
        "title": "Attack the argument, not the arguer",
        "content": "Ad hominem attacks feel satisfying but cost you credibility with any neutral judge. Redirect energy spent questioning the opponent's motives or character into questioning their argument's actual logic or evidence.",
    },
    {
        "category": "fallacies",
        "title": "Present the full range of options",
        "content": "False dilemmas ('it's either X or Y') are persuasive-sounding but fragile - a sharp opponent only needs to name one overlooked option to collapse the whole framing. Actively consider whether more than two outcomes are realistically possible.",
    },
    {
        "category": "fallacies",
        "title": "Justify each step in a slippery slope claim",
        "content": "If you're arguing that A leads to B leads to C, each step needs its own justification - the chain is only as strong as its weakest link. Unjustified slippery slope chains are an easy target for a fallacy-aware opponent.",
    },
    # --- rebuttal ---
    {
        "category": "rebuttal",
        "title": "Rebut the strongest version of the opposing argument",
        "content": "Steelman, don't strawman. Responding to a weaker version of your opponent's point is transparent to any attentive judge and actually weakens your credibility. Engage with the strongest form of their claim.",
    },
    {
        "category": "rebuttal",
        "title": "Concede minor points to win the major one",
        "content": "Fighting every single point makes you look defensive and spreads your rebuttal too thin. Strategically conceding a minor point ('that's fair, but it doesn't change...') builds credibility and lets you focus firepower on what actually matters.",
    },
    {
        "category": "rebuttal",
        "title": "Turn the opponent's own evidence against their conclusion",
        "content": "The strongest rebuttals often don't introduce new evidence - they show the opponent's own evidence actually supports a different conclusion, or doesn't support theirs as strongly as claimed. This is more persuasive than simply contradicting them.",
    },
    # --- delivery / presentation ---
    {
        "category": "delivery",
        "title": "Slow down at your key point",
        "content": "A deliberate pace change at your most important sentence signals its importance to the audience even before they've processed the content. Most speakers rush their best point instead of landing it.",
    },
    {
        "category": "delivery",
        "title": "Replace filler words with a pause",
        "content": "A silent pause reads as confidence; 'um' or 'like' reads as hesitation. The fix isn't trying to eliminate every filler word consciously mid-sentence - it's practicing comfort with brief silence so your brain reaches for a pause instead of a filler.",
    },
    {
        "category": "delivery",
        "title": "Vary sentence length to hold attention",
        "content": "A string of same-length sentences creates a monotone rhythm even if your vocal tone varies. Mix short, punchy sentences with longer explanatory ones - the contrast itself creates engagement.",
    },
    {
        "category": "delivery",
        "title": "Commit to declarative statements",
        "content": "Hedging language - 'I think maybe', 'it could be argued', 'sort of' - undermines confidence even when the underlying point is strong. State your claim directly, then support it, rather than qualifying it before you've even made it.",
    },
]
