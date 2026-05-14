const amqp = require("amqplib");

let channel;

const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue("notification.created", { durable: true });
        console.log("Connected to RabbitMQ");
    } catch (err) {
        console.error("RabbitMQ connection failed:", err.message);
        process.exit(1);
    }
};

const publishMessage = (queue, message) => {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
    });
};

module.exports = { connectRabbitMQ, publishMessage };




