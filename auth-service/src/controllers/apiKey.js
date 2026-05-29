import { User } from "../models";

exports.fetchApiKey = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
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
    const user = await User.findByPk(req.user.id);

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
