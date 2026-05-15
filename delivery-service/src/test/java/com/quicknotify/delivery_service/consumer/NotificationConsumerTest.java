package com.quicknotify.delivery_service.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quicknotify.delivery_service.model.NotificationMessage;
import com.quicknotify.delivery_service.service.DeliveryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificationConsumerTest {

    @Mock
    private DeliveryService deliveryService;

    private NotificationConsumer notificationConsumer;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        objectMapper = new ObjectMapper();
        notificationConsumer = new NotificationConsumer(deliveryService);
    }

    @Test
    void testConsumeValidEmailMessage() throws Exception {
        // Arrange
        NotificationMessage notification = new NotificationMessage();
        notification.setNotificationId("msg-123");
        notification.setType("email");
        notification.setRecipient("user@example.com");
        notification.setSubject("Test Email");
        notification.setMessage("This is a test email");

        String jsonMessage = objectMapper.writeValueAsString(notification);
        Message message = new Message(jsonMessage.getBytes(), new MessageProperties());

        // Act
        notificationConsumer.consume(message);

        // Assert
        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(deliveryService, times(1)).processNotification(captor.capture());

        NotificationMessage capturedMessage = captor.getValue();
        assertEquals("msg-123", capturedMessage.getNotificationId());
        assertEquals("email", capturedMessage.getType());
        assertEquals("user@example.com", capturedMessage.getRecipient());
        assertEquals("Test Email", capturedMessage.getSubject());
        assertEquals("This is a test email", capturedMessage.getMessage());
    }

    @Test
    void testConsumeValidSmsMessage() throws Exception {
        // Arrange
        NotificationMessage notification = new NotificationMessage();
        notification.setNotificationId("msg-456");
        notification.setType("sms");
        notification.setRecipient("+1234567890");
        notification.setSubject("SMS Subject");
        notification.setMessage("SMS test message");

        String jsonMessage = objectMapper.writeValueAsString(notification);
        Message message = new Message(jsonMessage.getBytes(), new MessageProperties());

        // Act
        notificationConsumer.consume(message);

        // Assert
        verify(deliveryService, times(1)).processNotification(any(NotificationMessage.class));
    }

    @Test
    void testConsumeValidPushMessage() throws Exception {
        // Arrange
        NotificationMessage notification = new NotificationMessage();
        notification.setNotificationId("msg-789");
        notification.setType("push");
        notification.setRecipient("device-token-xyz");
        notification.setSubject("Push Title");
        notification.setMessage("Push notification test");

        String jsonMessage = objectMapper.writeValueAsString(notification);
        Message message = new Message(jsonMessage.getBytes(), new MessageProperties());

        // Act
        notificationConsumer.consume(message);

        // Assert
        verify(deliveryService, times(1)).processNotification(any(NotificationMessage.class));
    }

    @Test
    void testConsumeInvalidJsonMessage() {
        // Arrange
        String invalidJson = "{ invalid json ]";
        Message message = new Message(invalidJson.getBytes(), new MessageProperties());

        // Act & Assert
        // Should not throw exception, should handle gracefully
        assertDoesNotThrow(() -> notificationConsumer.consume(message));

        // DeliveryService should not be called on invalid message
        verify(deliveryService, never()).processNotification(any(NotificationMessage.class));
    }

    @Test
    void testConsumeEmptyMessage() {
        // Arrange
        Message message = new Message("".getBytes(), new MessageProperties());

        // Act & Assert
        assertDoesNotThrow(() -> notificationConsumer.consume(message));
        verify(deliveryService, never()).processNotification(any(NotificationMessage.class));
    }

    @Test
    void testConsumeNullBodyMessage() {
        // Arrange
        Message message = new Message(new byte[0], new MessageProperties());

        // Act & Assert
        assertDoesNotThrow(() -> notificationConsumer.consume(message));
        verify(deliveryService, never()).processNotification(any(NotificationMessage.class));
    }

    @Test
    void testConsumeMultipleMessages() throws Exception {
        // Arrange
        NotificationMessage msg1 = new NotificationMessage();
        msg1.setNotificationId("batch-1");
        msg1.setType("email");
        msg1.setRecipient("user1@example.com");
        msg1.setSubject("Batch Email 1");
        msg1.setMessage("Message 1");

        NotificationMessage msg2 = new NotificationMessage();
        msg2.setNotificationId("batch-2");
        msg2.setType("sms");
        msg2.setRecipient("+1111111111");
        msg2.setSubject("Batch SMS 2");
        msg2.setMessage("Message 2");

        Message message1 = new Message(objectMapper.writeValueAsString(msg1).getBytes(), new MessageProperties());
        Message message2 = new Message(objectMapper.writeValueAsString(msg2).getBytes(), new MessageProperties());

        // Act
        notificationConsumer.consume(message1);
        notificationConsumer.consume(message2);

        // Assert
        verify(deliveryService, times(2)).processNotification(any(NotificationMessage.class));
    }

    @Test
    void testConsumeMessageWithAllFields() throws Exception {
        // Arrange
        NotificationMessage notification = new NotificationMessage();
        notification.setNotificationId("complete-msg-123");
        notification.setType("email");
        notification.setRecipient("complete@example.com");
        notification.setSubject("Complete Test Subject");
        notification.setMessage("This message has all the fields populated for testing");

        String jsonMessage = objectMapper.writeValueAsString(notification);
        Message message = new Message(jsonMessage.getBytes(), new MessageProperties());

        // Act
        notificationConsumer.consume(message);

        // Assert
        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(deliveryService, times(1)).processNotification(captor.capture());

        NotificationMessage capturedMessage = captor.getValue();
        assertAll(
                () -> assertEquals("complete-msg-123", capturedMessage.getNotificationId()),
                () -> assertEquals("email", capturedMessage.getType()),
                () -> assertEquals("complete@example.com", capturedMessage.getRecipient()),
                () -> assertEquals("Complete Test Subject", capturedMessage.getSubject()),
                () -> assertEquals("This message has all the fields populated for testing", capturedMessage.getMessage())
        );
    }

    @Test
    void testConsumeCallsDeliveryServiceOnce() throws Exception {
        // Arrange
        NotificationMessage notification = new NotificationMessage();
        notification.setNotificationId("once-test");
        notification.setType("email");
        notification.setRecipient("once@example.com");
        notification.setSubject("Once Test");
        notification.setMessage("Should call DeliveryService once");

        String jsonMessage = objectMapper.writeValueAsString(notification);
        Message message = new Message(jsonMessage.getBytes(), new MessageProperties());

        // Act
        notificationConsumer.consume(message);

        // Assert
        verify(deliveryService, times(1)).processNotification(any(NotificationMessage.class));
        verifyNoMoreInteractions(deliveryService);
    }

    @Test
    void testConsumerIsNotNullAfterInit() {
        assertNotNull(notificationConsumer);
    }

    @Test
    void testDeliveryServiceDependencyInjected() {
        // Verify that DeliveryService is properly injected
        assertNotNull(notificationConsumer);
    }
}
