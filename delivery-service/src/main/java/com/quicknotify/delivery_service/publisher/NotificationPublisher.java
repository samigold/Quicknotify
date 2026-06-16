package com.quicknotify.delivery_service.publisher;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;

@Service
public class NotificationPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void publishDeliveryCompleted(String notificationId, String channel, String status, String recipient) {
        Map<String, Object> event = new HashMap<>();
        event.put("notificationId", notificationId);
        event.put("channel", channel);
        event.put("status", status);
        event.put("recipient", recipient);
        event.put("timestamp", System.currentTimeMillis());

        try {
            String message = objectMapper.writeValueAsString(event);
            rabbitTemplate.convertAndSend("delivery.completed", message);
            System.out.println("Published delivery.completed event " + notificationId);
        } catch (Exception e) {
            System.out.println("Failed to publish delivery.completed event: " + e.getMessage());
        }
    }

    public void publishDeliveryFailed(String notificationId, String channel, String status, String recipient) {
        Map<String, Object> event = new HashMap<>();
        event.put("notificationId", notificationId);
        event.put("channel", channel);
        event.put("status", status);
        event.put("recipient", recipient);
        event.put("timestamp", System.currentTimeMillis());

        try {
            String message = objectMapper.writeValueAsString(event);
            rabbitTemplate.convertAndSend("delivery.failed", message);
            System.out.println("Published delivery.failed event " + notificationId);
        } catch (Exception e) {
            System.out.println("Failed to publish delivery.failed event: " + e.getMessage());
        }
    }
}
