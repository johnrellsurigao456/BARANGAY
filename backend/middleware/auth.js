function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(401).json({ error: "You must be logged in to access this." });
    }
    return res.redirect("/login");
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      if (req.originalUrl.startsWith("/api/")) {
        return res.status(401).json({ error: "You must be logged in to access this." });
      }
      return res.redirect("/login");
    }
    if (!roles.includes(req.session.user.role)) {
      if (req.originalUrl.startsWith("/api/")) {
        return res.status(403).json({ error: "You do not have permission to access this page." });
      }
      return res.status(403).render("error", {
        code: 403,
        message: "You do not have permission to access this page."
      });
    }
    next();
  };
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) {
    const dest = req.session.user.role === "admin" ? "/admin/dashboard"
      : req.session.user.role === "staff" ? "/staff/dashboard"
      : "/resident/dashboard";
    return res.redirect(dest);
  }
  next();
}

module.exports = { requireAuth, requireRole, redirectIfAuthenticated };
