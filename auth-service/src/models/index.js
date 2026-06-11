// auth-service/src/models/index.js

const sequelize = require('../config/db');
const User = require('./user');
const WebhookEndpoint = require('./webhookEndpoint');
const WebhookLog = require('./webhookLog');

// Define associations
User.hasMany(WebhookEndpoint, { foreignKey: 'UserId', onDelete: 'CASCADE' });
WebhookEndpoint.belongsTo(User, { foreignKey: 'UserId' });

WebhookEndpoint.hasMany(WebhookLog, { foreignKey: 'WebhookEndpointId', onDelete: 'CASCADE' });
WebhookLog.belongsTo(WebhookEndpoint, { foreignKey: 'WebhookEndpointId' });

module.exports = {
  sequelize,
  User,
  WebhookEndpoint,
  WebhookLog,
};