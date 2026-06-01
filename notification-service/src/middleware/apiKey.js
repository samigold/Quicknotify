const axios = require("axios");
const jwt = require("jsonwebtoken");

const verifyAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"];
        const authHeader = req.headers["authorization"];

        console.log("Apikey from notification service" + apiKey);

        if(!apiKey && !authHeader) {
            return res.status(401).json({ message: "Authorization header or API key is required" });
        }

        if (apiKey) {
            const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/apikey/validate`,
                {
                    headers: { "x-api-key": apiKey }
                }
            );

            req.user = {
                userId: response.data.userId,
                email: response.data.email,
                role: response.data.role,
                authType: "apiKey"
            };
            return next();
        }

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
                authType: "jwt"
            };
            return next();
        }

            return res.status(401).json({ message: "Invalid authentication method" });
    } catch (err) {
        if (err.response && err.response.status === 401) {
            return res.status(401).json({ message: "Invalid API key" });
        }
        res.status(500).json({ message: "API key verification failed", error: err.message });
    }
};

module.exports = verifyAuth;