const request = require('supertest');
const app = require('../src/index');
const { Notification } = require('../src/models');
const amqp = require('amqplib');

describe('Notification Service', () => {
  beforeAll(async () => {
    // Connect to database
    await Notification.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await Notification.sequelize.close();
  });

  describe('POST /notifications', () => {
    it('should create a notification', async () => {
      const res = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'email',
          subject: 'Test Email',
          message: 'This is a test notification',
          recipient: 'user@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status', 'pending');
      expect(res.body.userId).toBe('user-123');
    });

    it('should reject invalid notification type', async () => {
      const res = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'invalid-type',
          subject: 'Test',
          message: 'Test message',
          recipient: 'user@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should publish notification to RabbitMQ', async () => {
      const res = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'sms',
          subject: 'SMS Alert',
          message: 'Alert message',
          recipient: '+1234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      // Notification should be published to queue
    });
  });

  describe('GET /notifications', () => {
    it('should retrieve user notifications', async () => {
      // First create a notification
      await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'email',
          subject: 'Test',
          message: 'Test message',
          recipient: 'user@example.com',
        });

      const res = await request(app)
        .get('/notifications')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/notifications');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /notifications/:id', () => {
    it('should retrieve a specific notification', async () => {
      // Create notification
      const createRes = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'email',
          subject: 'Test',
          message: 'Test message',
          recipient: 'user@example.com',
        });

      const notificationId = createRes.body.id;

      const res = await request(app)
        .get(`/notifications/${notificationId}`)
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(notificationId);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app)
        .get('/notifications/non-existent-id')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /notifications/:id', () => {
    it('should update notification status', async () => {
      // Create notification
      const createRes = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'email',
          subject: 'Test',
          message: 'Test message',
          recipient: 'user@example.com',
        });

      const notificationId = createRes.body.id;

      const res = await request(app)
        .put(`/notifications/${notificationId}`)
        .set('Authorization', 'Bearer mock-token')
        .send({ status: 'read' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('read');
    });
  });

  describe('Notification Types', () => {
    it('should handle email notifications', async () => {
      const res = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'email',
          subject: 'Email Test',
          message: 'Email body',
          recipient: 'test@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('email');
    });

    it('should handle SMS notifications', async () => {
      const res = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'sms',
          subject: 'SMS',
          message: 'SMS body',
          recipient: '+1234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('sms');
    });

    it('should handle push notifications', async () => {
      const res = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer mock-token')
        .send({
          userId: 'user-123',
          type: 'push',
          subject: 'Push Alert',
          message: 'Push body',
          recipient: 'user-device-token',
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('push');
    });
  });
});
