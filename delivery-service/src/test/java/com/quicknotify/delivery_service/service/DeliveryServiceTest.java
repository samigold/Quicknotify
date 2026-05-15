package com.quicknotify.delivery_service.service;

import com.quicknotify.delivery_service.model.DeliveryLog;
import com.quicknotify.delivery_service.model.NotificationMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DeliveryServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    private DeliveryService deliveryService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        deliveryService = new DeliveryService(mongoTemplate);
    }

    @Test
    void testProcessNotificationSuccess() {
        // Arrange
        NotificationMessage message = new NotificationMessage();
        message.setNotificationId("123");
        message.setType("email");
        message.setRecipient("user@example.com");
        message.setSubject("Test Subject");
        message.setMessage("Test Message");

        // Act
        deliveryService.processNotification(message);

        // Assert
        ArgumentCaptor<DeliveryLog> captor = ArgumentCaptor.forClass(DeliveryLog.class);
        verify(mongoTemplate, times(1)).save(captor.capture());

        DeliveryLog savedLog = captor.getValue();
        assertEquals("123", savedLog.getNotificationId());
        assertEquals("email", savedLog.getType());
        assertEquals("user@example.com", savedLog.getRecipient());
        assertEquals("Test Subject", savedLog.getSubject());
        assertEquals("Test Message", savedLog.getMessage());
        assertEquals("delivered", savedLog.getStatus());
        assertNull(savedLog.getError());
        assertNotNull(savedLog.getProcessedAt());
    }

    @Test
    void testProcessNotificationWithSMS() {
        // Arrange
        NotificationMessage message = new NotificationMessage();
        message.setNotificationId("456");
        message.setType("sms");
        message.setRecipient("+1234567890");
        message.setSubject("SMS Subject");
        message.setMessage("SMS Message");

        // Act
        deliveryService.processNotification(message);

        // Assert
        ArgumentCaptor<DeliveryLog> captor = ArgumentCaptor.forClass(DeliveryLog.class);
        verify(mongoTemplate, times(1)).save(captor.capture());

        DeliveryLog savedLog = captor.getValue();
        assertEquals("sms", savedLog.getType());
        assertEquals("+1234567890", savedLog.getRecipient());
        assertEquals("delivered", savedLog.getStatus());
    }

    @Test
    void testProcessNotificationWithPush() {
        // Arrange
        NotificationMessage message = new NotificationMessage();
        message.setNotificationId("789");
        message.setType("push");
        message.setRecipient("device-token-123");
        message.setSubject("Push Title");
        message.setMessage("Push Body");

        // Act
        deliveryService.processNotification(message);

        // Assert
        ArgumentCaptor<DeliveryLog> captor = ArgumentCaptor.forClass(DeliveryLog.class);
        verify(mongoTemplate, times(1)).save(captor.capture());

        DeliveryLog savedLog = captor.getValue();
        assertEquals("push", savedLog.getType());
        assertEquals("device-token-123", savedLog.getRecipient());
        assertEquals("delivered", savedLog.getStatus());
    }

    @Test
    void testProcessNotificationSavesToMongoDB() {
        // Arrange
        NotificationMessage message = new NotificationMessage();
        message.setNotificationId("db-test-123");
        message.setType("email");
        message.setRecipient("test@example.com");
        message.setSubject("DB Test");
        message.setMessage("Testing MongoDB persistence");

        // Act
        deliveryService.processNotification(message);

        // Assert
        verify(mongoTemplate, times(1)).save(any(DeliveryLog.class));
    }

    @Test
    void testProcessNotificationWithAllFields() {
        // Arrange
        NotificationMessage message = new NotificationMessage();
        message.setNotificationId("full-test-123");
        message.setType("email");
        message.setRecipient("complete@example.com");
        message.setSubject("Complete Test Subject");
        message.setMessage("This is a complete test message with all fields");

        // Act
        deliveryService.processNotification(message);

        // Assert
        ArgumentCaptor<DeliveryLog> captor = ArgumentCaptor.forClass(DeliveryLog.class);
        verify(mongoTemplate, times(1)).save(captor.capture());

        DeliveryLog savedLog = captor.getValue();
        assertAll(
                () -> assertEquals("full-test-123", savedLog.getNotificationId()),
                () -> assertEquals("email", savedLog.getType()),
                () -> assertEquals("complete@example.com", savedLog.getRecipient()),
                () -> assertEquals("Complete Test Subject", savedLog.getSubject()),
                () -> assertEquals("This is a complete test message with all fields", savedLog.getMessage()),
                () -> assertEquals("delivered", savedLog.getStatus()),
                () -> assertNull(savedLog.getError()),
                () -> assertNotNull(savedLog.getProcessedAt())
        );
    }

    @Test
    void testProcessNotificationRecordsTimestamp() {
        // Arrange
        NotificationMessage message = new NotificationMessage();
        message.setNotificationId("timestamp-test");
        message.setType("email");
        message.setRecipient("time@example.com");
        message.setSubject("Time Test");
        message.setMessage("Test timestamp");

        LocalDateTime beforeProcessing = LocalDateTime.now();

        // Act
        deliveryService.processNotification(message);

        LocalDateTime afterProcessing = LocalDateTime.now();

        // Assert
        ArgumentCaptor<DeliveryLog> captor = ArgumentCaptor.forClass(DeliveryLog.class);
        verify(mongoTemplate, times(1)).save(captor.capture());

        DeliveryLog savedLog = captor.getValue();
        assertNotNull(savedLog.getProcessedAt());
        assertTrue(savedLog.getProcessedAt().isAfter(beforeProcessing) || 
                   savedLog.getProcessedAt().isEqual(beforeProcessing));
        assertTrue(savedLog.getProcessedAt().isBefore(afterProcessing) || 
                   savedLog.getProcessedAt().isEqual(afterProcessing));
    }

    @Test
    void testProcessMultipleNotifications() {
        // Arrange
        NotificationMessage message1 = new NotificationMessage();
        message1.setNotificationId("multi-1");
        message1.setType("email");
        message1.setRecipient("user1@example.com");
        message1.setSubject("Subject 1");
        message1.setMessage("Message 1");

        NotificationMessage message2 = new NotificationMessage();
        message2.setNotificationId("multi-2");
        message2.setType("sms");
        message2.setRecipient("+1111111111");
        message2.setSubject("Subject 2");
        message2.setMessage("Message 2");

        // Act
        deliveryService.processNotification(message1);
        deliveryService.processNotification(message2);

        // Assert
        verify(mongoTemplate, times(2)).save(any(DeliveryLog.class));
    }
}
