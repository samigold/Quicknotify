const Notification = require("../models/notification");
const { publishMessage } = require("../config/rabbitmq");

exports.createNotification = async (req, res) => {
  try {
    const { type, recipient, subject, message } = req.body;
    const userId = req.user.userId;

      // Basic validation
    if (!type || !recipient || !subject || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const validTypes = ["email", "sms", "in-app"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid notification type" });
    }

    if (!userId) {
      return res.status(401).json({ message: "User ID missing in headers" });
    }

    // Save notification to database
    const notification = await Notification.create({
      userId,
      type,
      recipient,
      subject,
      message,
    });

    // Publish event to RabbitMQ
    publishMessage("notification.created", {
      notificationId: notification._id,
      type,
      recipient,
      subject,
      message,
    });

    res.status(201).json({ message: "Notification queued", notification });
  } catch (err) {
    res.status(500).json({ message: "Failed to create notification", error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
  }
};