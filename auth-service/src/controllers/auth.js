const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, role });

    res.status(201).json({ message: "User registered", userId: user.id });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token, userId: user.id, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

exports.generateApiKey = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Generate new API key
    const apiKey = require("crypto").randomBytes(32).toString("hex");

    console.log(`Generated API key for user ${userId}: ${apiKey}`);

    // Hash API key before storing
    const hashedKey = await bcrypt.hash(apiKey, 10);

    // Update user with new API key and timestamps
    const user = await User.findByPk(userId);

    console.log(`Updating user ${userId} with new API key...`);

    if(!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({
      apiKey: hashedKey,
      apiKeyCreatedAt: new Date(),
      apiKeyActive: true
    });

    // Return plain API key to user (only on creation)
    res.status(201).json({
      apiKey,
      message: "API key generated. Store it securely, it won't be shown again.",
      warning: "Please store this API key securely. It will not be shown again and cannot be retrieved. If lost, you will need to generate a new one."
    });
  } catch (err) {
    res.status(500).json({ message: "API key generation failed", error: err.message });
  }
};