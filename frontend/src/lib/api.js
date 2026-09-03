/** Shared API origin for local development and deployed environments. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path}`;

export const authHeaders = () => {
  const token = typeof window === "undefined" ? null : localStorage.getItem("logos_ai_jwt");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
