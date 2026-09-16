const jwt = require("jsonwebtoken");

// =========================
// 🔐 VERIFY TOKEN
// =========================
// Reads "Authorization: Bearer <token>" and attaches the decoded
// payload ({ id, role }) to req.user. Does NOT touch any existing
// route — only used on the new routes below.
const verifyToken = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { id, role }
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// =========================
// 🛡️ REQUIRE ONE OF SEVERAL ROLES
// =========================
// Roles are stored lowercase in the JWT (see server.js /login),
// so this compares case-insensitively.
const requireRole = (...allowedRoles) => {
  const normalized = allowedRoles.map((r) => r.toLowerCase());

  return (req, res, next) => {
    if (!req.user || !normalized.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource"
      });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
