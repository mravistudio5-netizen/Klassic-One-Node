const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = header.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "klassic-secret"
    );

    // Support different JWT payload formats
    const userId =
      decoded.id ||
      decoded.userId ||
      decoded.user_id ||
      decoded._id ||
      decoded.sub;

    let user = null;

    if (userId) {
      user = await User.findById(userId).select("-passwordHash");
    }

    // Fallback: find user by email if token contains email
    if (!user && decoded.email) {
      user = await User.findOne({
        email: String(decoded.email).toLowerCase(),
      }).select("-passwordHash");
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this action",
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRoles,
};