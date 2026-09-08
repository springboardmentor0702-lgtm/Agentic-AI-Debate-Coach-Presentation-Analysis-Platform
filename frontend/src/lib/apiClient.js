// Shared helpers for talking to the LOGOS.AI backend from the auth pages.
//
// Two real bugs lived here before this file existed:
//
// 1. "[object Object]" errors: FastAPI returns validation failures (HTTP 422)
//    as `{ detail: [ { msg: "...", loc: [...] }, ... ] }` — an ARRAY of
//    objects, not a string. The old code did `throw new Error(data.detail)`,
//    and JavaScript silently stringifies an array of objects into something
//    like "[object Object],[object Object]". `extractErrorMessage` below
//    turns that into an actual readable sentence.
//
// 2. "Failed to fetch": this is the browser's own error when it cannot reach
//    the server at all (backend not running, wrong port, CORS rejecting the
//    request, etc.) — it happens before any JSON is even returned. The old
//    code showed that raw browser message as-is. `postJson` below catches
//    that case and returns a clear, actionable message instead.

export const API_BASE = "http://localhost:8000/api/v1";

// Turn whatever FastAPI put in `detail` into a single readable string.
export function extractErrorMessage(data, fallback) {
  const detail = data && data.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null;
          return field ? `${field}: ${item.msg}` : item.msg;
        }
        return null;
      })
      .filter(Boolean)
      .join(" | ") || fallback;
  }
  if (typeof detail === "object") {
    return detail.msg || fallback;
  }
  return fallback;
}

// POST JSON to the backend and always resolve to { ok, status, data } —
// never throws for HTTP error responses, and gives a clear message for
// genuine network failures (backend down, CORS, offline, etc.) instead of
// letting the browser's raw "Failed to fetch" bubble up unexplained.
export async function postJson(path, body, extraOptions = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...extraOptions,
    });
  } catch (networkError) {
    throw new Error(
      "Could not reach the server. Make sure the backend is running at http://localhost:8000 (uvicorn main:app --reload --port 8000)."
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON or empty response body — fall through with data = null.
  }

  return { ok: res.ok, status: res.status, data };
}
