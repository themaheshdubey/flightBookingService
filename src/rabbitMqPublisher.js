const amqp = require('amqplib');
const { RABBITMQ_URI, QUEUE_NAME } = process.env; // Add RABBITMQ_URI and QUEUE_NAME in your .env

// Function to publish a message to RabbitMQ
async function publishMessage(message) {
    try {
        // Create a connection and a channel
        const connection = await amqp.connect(RABBITMQ_URI);
        const channel = await connection.createChannel();

        // Assert a queue (ensure the queue exists)
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Send the message to the queue
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
            persistent: true,  // Make sure the message survives a RabbitMQ crash
        });

        console.log('Message sent to queue:', message);

        // Close the channel and connection
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Error publishing message to RabbitMQ:', error);
    }
}

module.exports = { publishMessage };
