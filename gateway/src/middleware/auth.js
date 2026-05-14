const jwt = require("jsonwebtoken");

const PUBLIC_ROUTES = [
  { path: "/api/auth/register", method: "POST" },
  { path: "/api/auth/login", method: "POST" },
];

module.exports = (req, res, next) => {
  const isPublic = PUBLIC_ROUTES.some(
    (r) => r.path === req.path && r.method === req.method
  );

  if (isPublic) return next();

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};