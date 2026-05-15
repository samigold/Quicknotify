const request = require('supertest');

/**
 * Helper to make requests through the Gateway
 */
class GatewayClient {
  constructor(gatewayUrl = 'http://localhost:3000') {
    this.gatewayUrl = gatewayUrl;
  }

  // Auth endpoints
  async register(email, password) {
    return request(this.gatewayUrl)
      .post('/api/auth/register')
      .send({ email, password });
  }

  async login(email, password) {
    return request(this.gatewayUrl)
      .post('/api/auth/login')
      .send({ email, password });
  }

  // Notification endpoints
  async createNotification(token, notification) {
    return request(this.gatewayUrl)
      .post('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send(notification);
  }

  async getNotifications(token) {
    return request(this.gatewayUrl)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
  }

  async getHealth() {
    return request(this.gatewayUrl).get('/health');
  }
}

module.exports = { GatewayClient };