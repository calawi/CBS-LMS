import jwt from "jsonwebtoken";

const normalizeRole = (role) => {
  const cleaned = String(role || "").trim().toLowerCase();
  if (cleaned === "admin" || cleaned === "sys_admin" || cleaned === "systemadmin") return "sysadmin";
  if (cleaned === "employee" || cleaned === "student" || cleaned === "normal_user") return "learner";
  if (cleaned === "hr" || cleaned === "supervisor" || cleaned === "teacher") return "instructor";
  return cleaned;
};

const expandRole = (role) => {
  if (role === "sysadmin" || role === "admin") return ["sysadmin", "admin"];
  if (role === "learner" || role === "employee") return ["learner", "employee"];
  return [role];
};

export const requireAuth = (roles = null) => (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-me")) {
      return res.status(500).json({ error: "JWT secret is not configured for production" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Invalid Authorization header" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "change-me");

    // payload: { sub: userId, roles: [...] }
    const userId = payload.sub;
    const userRoles = Array.isArray(payload.roles) ? payload.roles.map(normalizeRole) : [];
    const expandedUserRoles = userRoles.flatMap(expandRole);

    if (roles) {
      const expandedRequiredRoles = roles.flatMap(expandRole);
      const allowed = expandedUserRoles.some((r) => expandedRequiredRoles.includes(r));
      const isAdmin = expandedUserRoles.includes("admin") || expandedUserRoles.includes("sysadmin");
      if (!allowed && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    req.user = { userId, roles: userRoles };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
};

