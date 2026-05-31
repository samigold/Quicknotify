const axios = require("axios");

const verifyApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"];

        if(!apiKey) {
            return res.status(401).json({ message: "API key is required" });
        }

        // Verify API key with auth service
        const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/apikey/validate`,
            {
                headers: { "x-api-key": apiKey }
            }
        );

        // Attach user info to request object
        req.user = {
            userId: response.data.userId,
            email: response.data.email,
            role: response.data.role,
            authType: "apiKey"
        };

        next();
    } catch (err) {
        if (err.response && err.response.status === 401) {
            return res.status(401).json({ message: "Invalid API key" });
        }
        res.status(500).json({ message: "API key verification failed", error: err.message });
    }
};

module.exports = verifyApiKey;