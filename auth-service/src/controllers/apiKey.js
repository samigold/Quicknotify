const User = require("../models/user");
const bcrypt = require("bcryptjs");

exports.fetchApiKey = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    
    if (!user || !user.apiKeyActive) {
      return res.status(404).json({ error: "No active API key" });
    }

    res.json({
      hasApiKey: user.apiKeyActive,
      createdAt: user.apiKeyCreatedAt,
      lastUsedAt: user.apiKeyLastUsedAt,
      keyPrefix: user.apiKey.substring(0, 8) + "..." // Show only prefix
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch API key info" });
  }
}

exports.revokeApiKey = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.update({
      apiKey: null,
      apiKeyActive: false,
      apiKeyLastUsedAt: null
    });

    res.json({ message: "API key revoked successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to revoke API key" });
  }
};

exports.validateApiKey = async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];

    console.log("Verification api header from validate url " + apiKey);
    
    if (!apiKey) {
      return res.status(401).json({ message: "API key is required" });
    }

    // Find user with active API key
    const user = await User.findOne({ where: {
      apiKeyActive: true
      } });

    if (!user) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    // Compare provided API key with stored hash
    const isValidKey = await bcrypt.compare(apiKey, user.apiKey);

    if (!isValidKey) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    // Update last used timestamp
    await user.update({ apiKeyLastUsedAt: new Date() });

    // Return user info if API key is valid
    res.json({
      userId: user.id,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ message: "API key validation failed", error: err });
    console.log("Error from auth service " + err);
  }
};
