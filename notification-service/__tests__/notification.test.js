const request = require('supertest');
const app = require('../src/index');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Mock RabbitMQ
jest.mock('../src/config/rabbitmq', () => ({
  connectRabbitMQ: jest.fn().mockResolvedValue(undefined),
  publishMessage: jest.fn().mockResolvedValue(undefined),
}));

// Mock axios to intercept API key validation calls
jest.mock('axios');

describe('Notification Service', () => {
    let token;

    beforeAll(async () => {
        // Connect to a test database
        await mongoose.connect(process.env.MONGO_URI);

        // Create a test user and generate a JWT token
        token = jwt.sign({ userId: 'testuser-123', email: 'test@example.com' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Mock API key validation to always succeed for testing
            jest.mocked(axios).get.mockResolvedValue({
        data: {
            userId: 'testuser-123',
            email: 'test@example.com',
            role: 'user'
        }
    });
    });

    afterAll(async () => {
        // Clean up database and close connection
       if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
       }
    });

    describe('POST /', () => {
        it('should create a new notification with API key', async () => {
            const res = await request(app)
            .post('/')
            .set('x-api-key', 'test-api-key')
            .send({
                type: 'email',
                recipient: 'user@example.com',
                subject: 'Test Notification',
                message: 'This is a test notification.'
            });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('message', 'Notification queued');
            expect(res.body).toHaveProperty('notification');
            expect(res.body.notification._id).toBeTruthy();
        });

        it('should create a new notification', async () => {
            const res = await request(app)
                .post('/')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    type: 'email',
                    recipient: 'user@example.com',
                    subject: 'Test Notification',
                    message: 'This is a test notification.'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('message', 'Notification queued');
            expect(res.body).toHaveProperty('notification');
            expect(res.body.notification._id).toBeTruthy();
        });

        it('should reject notifications without authentication', async () => {
            const res = await request(app)
            .post('/')
            .send({
                type: 'email',
                recipient: 'user@example.com',
                subject: 'Test Notification',
                message: 'This is a test notification.'
             });

             expect(res.status).toBe(401);
        });

        it ('should reject notifications with invalid API key', async () => {
            jest.mocked(axios).get.mockRejectedValueOnce({ response: { status: 401 } });

            const res = await request(app)
            .post('/')
            .set('x-api-key', 'invalid-api-key')
            .send({
                type: 'email',
                recipient: 'user@example.com',
                subject: 'Test Notification',
                message: 'This is a test notification.'
            });

            expect(res.status).toBe(401);
        });

        it ('should reject notifications with missing fields', async () => {
            const res = await request(app)
            .post('/')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'email',
                recipient: 'user@example.com',
                // Missing subject and message
            });

            expect(res.status).toBe(400);

        });

        it('should reject notifications with invalid type', async () => {
            const res = await request(app)
            .post('/')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'invalidtype',
                recipient: 'user@example.com',
                subject: 'Test Notification',
                message: 'This is a test notification.'
             });

             expect(res.status).toBe(400);
            });

        it('should accept valid notification types', async () => {
            const types = [
                { type: 'email', recipient: 'user@example.com' },
                { type: 'sms', recipient: '1234567890' },
                { type: 'in-app', recipient: 'user123' }
            ];

            for (const notification of types) {
                const res = await request(app)
                .post('/')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    type: notification.type,
                    recipient: notification.recipient,
                    subject: `Test ${notification.type} notification`,
                    message: `This is a test ${notification.type} notification.`
                 });

                 //debug
                 if (res.status !== 201) {
                    console.error(`Failed to create ${notification.type} notification:`, res.body);
                 }

                expect(res.status).toBe(201);
                expect(res.body.notification.type).toBe(notification.type);
            }
        });

        it('should save notifications to the database', async () => {
            const res = await request(app)
            .post('/')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'email',
                recipient: 'mongodbtest@example.com',
                subject: 'Database Test',
                message: 'This notification should be saved to the database.'
             });

             expect(res.status).toBe(201);
             expect(res.body.notification).toHaveProperty('_id');
             expect(res.body.notification.recipient).toBe('mongodbtest@example.com');
        });
    });

    describe('GET /', () => {
        it('should fetch notifications for the authenticated user', async () => {
            // First, create a notification for the test user
            await request(app)
                .post('/')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    type: 'email',
                    recipient: 'test@example.com',
                    subject: 'Test Notification',
                    message: 'This is a test notification.'
                });

            // Then, fetch notifications for the test user
            const res = await request(app)
                .get('/')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('GET /health', () => {
        it('should return service status', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'Notification service running');
        });
    });
});