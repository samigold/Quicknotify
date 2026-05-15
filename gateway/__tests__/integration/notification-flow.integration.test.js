const { GatewayClient } = require('./helpers.helper');
const request = require('supertest');

describe('Notification Integration Flow', () => {
  const client = new GatewayClient('http://localhost:3000');
  let token;
  const testUser = {
    email: `notify-test-${Date.now()}@example.com`,
    password: 'Password123!',
  };

  beforeAll(async () => {
    // Register and login to get JWT token
    await client.register(testUser.email, testUser.password);
    const loginRes = await client.login(testUser.email, testUser.password);
    token = loginRes.body.token;
  });

  describe('Notification Creation Flow', () => {
    it('should create notification through Gateway with JWT', async () => {
      const res = await client.createNotification(token, {
        type: 'email',
        recipient: 'user@example.com',
        subject: 'Integration Test',
        message: 'This is an integration test notification',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Notification queued');
      expect(res.body).toHaveProperty('notification');
      expect(res.body.notification._id).toBeTruthy();
    });

    it('should support multiple notification types', async () => {
      const types = [
        { type: 'email', recipient: 'test@email.com' },
        { type: 'sms', recipient: '+1234567890' },
        { type: 'in-app', recipient: 'user123' },
      ];

      for (const notifType of types) {
        const res = await client.createNotification(token, {
          type: notifType.type,
          recipient: notifType.recipient,
          subject: `${notifType.type} Test`,
          message: `Test ${notifType.type} notification`,
        });

        expect(res.status).toBe(201);
        expect(res.body.notification.type).toBe(notifType.type);
      }
    });

    it('should reject notification without authentication', async () => {
      const res = await request('http://localhost:3000')
        .post('/api/notifications')
        .send({
          type: 'email',
          recipient: 'user@example.com',
          subject: 'Test',
          message: 'Test',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject notification with invalid JWT', async () => {
      const res = await request('http://localhost:3000')
        .post('/api/notifications')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({
          type: 'email',
          recipient: 'user@example.com',
          subject: 'Test',
          message: 'Test',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject notification with missing fields', async () => {
      const res = await client.createNotification(token, {
        type: 'email',
        recipient: 'user@example.com',
        // missing subject and message
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Notification Retrieval Flow', () => {
    beforeAll(async () => {
      // Create a notification first
      await client.createNotification(token, {
        type: 'email',
        recipient: 'archive@example.com',
        subject: 'Archive Test',
        message: 'Notification to retrieve',
      });
    });

    it('should retrieve notifications for authenticated user', async () => {
      const res = await client.getNotifications(token);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should reject retrieval without authentication', async () => {
      const res = await request('http://localhost:3000')
        .get('/api/notifications');

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Gateway → Services Communication', () => {
    it('should handle service timeout gracefully', async () => {
      // This would test if Gateway handles slow services
      // For now, we verify the service responds within reasonable time
      const start = Date.now();
      const res = await client.createNotification(token, {
        type: 'email',
        recipient: 'timeout@example.com',
        subject: 'Timeout Test',
        message: 'Testing response time',
      });
      const duration = Date.now() - start;

      expect(res.status).toBe(201);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should preserve response format through proxy', async () => {
      const res = await client.createNotification(token, {
        type: 'email',
        recipient: 'format@example.com',
        subject: 'Format Test',
        message: 'Testing response format',
      });

      // Verify response structure matches expected format
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('notification');
      expect(res.body.notification).toHaveProperty('_id');
      expect(res.body.notification).toHaveProperty('userId');
      expect(res.body.notification).toHaveProperty('type');
    });
  });
});