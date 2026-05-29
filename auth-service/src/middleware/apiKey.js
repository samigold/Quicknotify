const User = require("../models/user");
const bcryptjs = require("bcryptjs");

const verifyApiKey = async (req, res, next) => {
    try {
        // Check for API key in headers
        const apiKey = req.headers["x-api-key"];

        if (!apiKey) {
            return res.status(401).json({ message: "API key is required" });
        }

        // Find User with matching API key
        const user = await User.findOne({ where: { apiKeyActive: true } });

        if (!user) {
            return res.status(401).json({ message: "Invalid API key" });
        }

        // Compare provided API key with stored hash
        const isValidKey = await bcryptjs.compare(apiKey, user.apiKey);

        if(!isValidKey) {
            return res.status(401).json({ message: "Invalid API key" });
        }

        // Update last used timestamp
        await user.update({ apiKeyLastUsedAt: new Date() });

        // Attach user info to request object
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            authType: "apiKey"
        };

        next();
    } catch (err) {
        res.status(500).json({ message: "API key verification failed", error: err.message });
    }
};

module.exports = verifyApiKey;