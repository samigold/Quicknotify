const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WebhookLog = sequelize.define('WebhookLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  eventId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true, // Null if the request failed to send
  },
  requestPayload: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  responseBody: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deliveryStatus: {
    type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  // foreign key for WebhookEndpoint will be added via association
});

module.exports = WebhookLog;