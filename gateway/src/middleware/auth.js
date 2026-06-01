const jwt = require("jsonwebtoken");
const axios = require("axios");

const PUBLIC_ROUTES = [
  { path: "/api/auth/register", method: "POST" },
  { path: "/api/auth/login", method: "POST" },
];

exports.default = (req, res, next) => {
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

const verifyJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "JWT token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      authType: "jwt"
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid JWT token" });
  }
};

const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  console.log("Verifying API key:", apiKey);
  
  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  try {
    // Call auth-service to validate the API key
     const validateUrl = `${process.env.AUTH_SERVICE_URL}/apikey/validate`;
    console.log("Calling auth-service at:", validateUrl);  // ← Add this
    
    const response = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/apikey/validate`,
      { headers: { "x-api-key": apiKey } }
    );

    console.log("API key validation response:", response.data);

    req.user = {
      userId: response.data.userId,
      email: response.data.email,
      authType: "api-key"
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired API key" });
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