"""
Prompts for Self-Directed ReAct Research Agent.
"""

RESEARCH_DECISION_PROMPT = """You are MindArena AI's ReAct Research Agent investigating the debate topic: "{topic}".

Previous Search Queries Executed:
{query_history}

Summary of Findings So Far:
{findings_summary}

Current Iteration: {iteration} of {max_iterations}

Determine your next action:
1. If current findings provide balanced, verified coverage of affirmative, negative, empirical, and ethical facets, declare is_sufficient: true.
2. If critical knowledge gaps exist and iterations < max_iterations, formulate a specific, search-optimized Wikipedia query.

Return STRICT JSON:
{
  "thought": "<reasoning on what information is missing or sufficient>",
  "is_sufficient": <true or false>,
  "next_search_query": "<exact search terms or null if sufficient>",
  "focus_aspect": "<empirical | legal | economic | historical | scientific>"
}
"""

RESEARCH_SYNTHESIS_PROMPT = """Synthesize the verified research findings into an authoritative debate brief.
Topic: "{topic}"

Collected Findings:
{all_findings}

Sources:
{sources}

Return STRICT JSON:
{
  "topic": "{topic}",
  "executive_summary": "<concise briefing for competitive debaters>",
  "affirmative_arguments": [
    {
      "contention": "<title>",
      "warrant": "<argument explanation>",
      "source_ref": "<title of cited source>"
    }
  ],
  "negative_arguments": [
    {
      "contention": "<title>",
      "warrant": "<argument explanation>",
      "source_ref": "<title of cited source>"
    }
  ],
  "empirical_data_points": ["<verified statistic or study with source citation>"],
  "historical_precedents": ["<historical example>"],
  "key_findings": ["<high-impact takeaway>"]
}
"""
