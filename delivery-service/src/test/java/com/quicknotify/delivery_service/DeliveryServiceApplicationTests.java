package com.quicknotify.delivery_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.data.mongodb.core.MongoTemplate;

@SpringBootTest(properties = {
    "spring.rabbitmq.host=localhost",
    "spring.rabbitmq.port=5672",
    "spring.rabbitmq.username=admin",
    "spring.rabbitmq.password=admin123",
    "spring.data.mongodb.uri=mongodb://localhost:27017/test",
    "resend.api.key=test-key",
    "resend.from.email=test@example.com"
})
class DeliveryServiceApplicationTests {

    @MockBean
    private MongoTemplate mongoTemplate;

    @MockBean
    private ConnectionFactory connectionFactory;

    @Test
    void contextLoads() {
    }
}