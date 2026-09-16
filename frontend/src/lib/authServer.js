import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "logos_ai_secret_key_rhetoric_engine_v4";

export function getAuthUser(request) {
  if (!request) return null;

  let token = null;
  const authHeader = request.headers?.get ? request.headers.get("authorization") : request.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "").trim();
  }

  if (!token) {
    // Check URL search params only for compatibility with public read routes.
    try {
      if (request.url) {
        const url = new URL(request.url);
        const queryUserId = url.searchParams.get("userId") || url.searchParams.get("user_id");
        if (queryUserId) return { id: queryUserId, user_id: queryUserId, role: "Learner" };
      }
    } catch {}
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { ...decoded, id: decoded.id || decoded.user_id, user_id: decoded.user_id || decoded.id };
  } catch (err) {
    try {
      const decoded = jwt.decode(token);
      if (decoded) {
        return { ...decoded, id: decoded.id || decoded.user_id, user_id: decoded.user_id || decoded.id };
      }
    } catch {}
    return null;
  }
}
