// __tests__/helpers/mockRabbitMQ.js
// Mock RabbitMQ channel for testing

class MockChannel {
  constructor() {
    this.queues = {};
    this.consumers = {};
    this.messages = {};
  }

  async assertQueue(queueName, options = {}) {
    this.queues[queueName] = {
      name: queueName,
      durable: options.durable || false,
      messages: [],
    };
    return { queue: queueName };
  }

  async consume(queueName, callback) {
    if (!this.consumers[queueName]) {
      this.consumers[queueName] = [];
    }
    this.consumers[queueName].push(callback);
  }

  async publish(exchange, routingKey, content, options = {}) {
    // Simulate publishing to a queue
    const queueName = routingKey;
    if (!this.queues[queueName]) {
      this.queues[queueName] = { name: queueName, messages: [] };
    }

    const message = {
      content: content,
      fields: { deliveryTag: Math.random() },
    };

    this.queues[queueName].messages.push(message);

    // Call consumers if any
    if (this.consumers[queueName]) {
      this.consumers[queueName].forEach((callback) => {
        callback(message);
      });
    }

    return true;
  }

  sendToQueue(queueName, content, options = {}) {
    return this.publish('', queueName, content, options);
  }

  ack(message) {
    // Mock acknowledge
    return true;
  }

  nack(message, allUpTo = false, requeue = false) {
    // Mock negative acknowledge
    return true;
  }

  async close() {
    return true;
  }

  getQueue(queueName) {
    return this.queues[queueName];
  }
}

class MockConnection {
  constructor() {
    this.channel = new MockChannel();
  }

  async createChannel() {
    return this.channel;
  }

  async close() {
    return true;
  }
}

module.exports = {
  MockChannel,
  MockConnection,
};
