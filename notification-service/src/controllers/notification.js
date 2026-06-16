const Notification = require("../models/notification");
const { publishMessage, publishNotificationFailed } = require("../config/rabbitmq");
const logger = require("../utils/logger");

exports.createNotification = async (req, res) => {
  try {
    const { type, recipient, subject, message } = req.body;
    const userId = req.user.userId;

    logger.info(`Creating notification for user ${userId} with type ${type}`);

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

    try{
    // Publish event to RabbitMQ
    publishMessage("notification.created", {
      notificationId: notification._id,
      type,
      recipient,
      subject,
      message,
    });

    res.status(201).json({ message: "Notification queued", notification });

    } catch (publishError) {
      console.error("Error publishing notification.created:", publishError);
      logger.error(`Failed to publish notification.created for notification ${notification._id}: ${publishError.message}`);
      await publishNotificationFailed(notification._id, userId, type, publishError.message);
    }
  } catch (err) {
    logger.error(`Failed to create notification: ${err.message}`);
    res.status(500).json({ message: "Failed to create notification", error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
      logger.error(`Failed to fetch notifications for user ${req.headers["x-user-id"]}: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
  }
};