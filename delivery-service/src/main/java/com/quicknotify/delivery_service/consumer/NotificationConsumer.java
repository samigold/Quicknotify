package com.quicknotify.delivery_service.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quicknotify.delivery_service.model.NotificationMessage;
import com.quicknotify.delivery_service.service.DeliveryService;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class NotificationConsumer {

    private final DeliveryService deliveryService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NotificationConsumer(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @RabbitListener(queues = "notification.sent")
    public void consume(Message message) {
       try {
        String body = new String(message.getBody());
        NotificationMessage notificationMessage = objectMapper.readValue(body, NotificationMessage.class);
        System.out.println("Received message: " + notificationMessage);
        deliveryService.processNotification(notificationMessage);
         } catch (Exception e) {
              System.err.println("Failed to process message: " + e.getMessage());
       }
    }
}