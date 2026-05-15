package com.quicknotify.delivery_service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quicknotify.delivery_service.model.DeliveryLog;
import com.quicknotify.delivery_service.model.NotificationMessage;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.awaitility.Awaitility.await;

@SpringBootTest
class DeliveryServiceApplicationTests {

	@Autowired
	private RabbitTemplate rabbitTemplate;

	@Autowired
	private MongoTemplate mongoTemplate;

	private final ObjectMapper objectMapper = new ObjectMapper();

	@Test
	void contextLoads() {
		assertNotNull(rabbitTemplate);
		assertNotNull(mongoTemplate);
	}

	@Test
	void testApplicationStarts() {
		assertNotNull(rabbitTemplate);
		assertNotNull(mongoTemplate);
	}

	@Test
	void testDeliveryLogCanBeSaved() {
		// Arrange
		DeliveryLog log = new DeliveryLog();
		log.setNotificationId("test-123");
		log.setType("email");
		log.setRecipient("test@example.com");
		log.setSubject("Test Subject");
		log.setMessage("Test Message");
		log.setStatus("delivered");

		// Act
		DeliveryLog savedLog = mongoTemplate.save(log);

		// Assert
		assertNotNull(savedLog);
		assertEquals("test-123", savedLog.getNotificationId());
		assertEquals("email", savedLog.getType());
		assertEquals("delivered", savedLog.getStatus());
	}

	@Test
	void testRabbitTemplateIsAvailable() {
		assertNotNull(rabbitTemplate);
	}

	@Test
	void testMongoTemplateIsAvailable() {
		assertNotNull(mongoTemplate);
	}
}
