import time
from app.database import log_agent_call

try:
    from langchain_core.callbacks.usage import get_usage_metadata_callback
    HAS_USAGE_CALLBACK = True
except ImportError:
    HAS_USAGE_CALLBACK = False


async def timed_invoke(chain, inputs: dict, agent_name: str, model: str, session_id: str = None):
    """
    Runs chain.ainvoke(inputs), measuring REAL latency always, and
    best-effort REAL token usage via LangChain's usage-metadata callback.
    If the callback isn't available or doesn't capture anything for this
    call shape, token counts are stored as NULL — never guessed or
    fabricated.
    """
    start = time.perf_counter()
    input_tokens = output_tokens = total_tokens = None

    if HAS_USAGE_CALLBACK:
        try:
            with get_usage_metadata_callback() as cb:
                result = await chain.ainvoke(inputs)
                usage = cb.usage_metadata
                if usage:
                    totals = next(iter(usage.values()), None)
                    if totals:
                        input_tokens = totals.get("input_tokens")
                        output_tokens = totals.get("output_tokens")
                        total_tokens = totals.get("total_tokens")
        except Exception:
            result = await chain.ainvoke(inputs)
    else:
        result = await chain.ainvoke(inputs)

    latency_ms = int((time.perf_counter() - start) * 1000)
    log_agent_call(session_id, agent_name, model, latency_ms, input_tokens, output_tokens, total_tokens)

    return result
