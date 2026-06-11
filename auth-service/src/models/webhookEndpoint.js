const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WebhookEndpoint = sequelize.define('WebhookEndpoint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isURL: true,
    },
  },
  secret: {
    type: DataTypes.TEXT, // Encrypted secret
    allowNull: false,
  },
  subscribedEvents: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [], // e.g., ['notification.sent', 'notification.failed']
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // foreign key for User will be added via association
});

module.exports = WebhookEndpoint;