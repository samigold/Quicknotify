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

exports.verifyAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  const apiKey = req.headers["x-api-key"];

  if (token) {
    // JWT authentication
    return verifyJWT(req, res, next);
  } else if (apiKey) {
    // API Key authentication
    return verifyApiKey(req, res, next);
  } else {
    return res.status(401).json({ error: "No authentication provided" });
  }
};