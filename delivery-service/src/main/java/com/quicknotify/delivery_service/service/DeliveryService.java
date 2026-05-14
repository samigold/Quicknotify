package com.quicknotify.delivery_service.service;

import com.quicknotify.delivery_service.model.DeliveryLog;
import com.quicknotify.delivery_service.model.NotificationMessage;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class DeliveryService {

    private final MongoTemplate mongoTemplate;

    public DeliveryService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void processNotification(NotificationMessage msg) {
        DeliveryLog log = new DeliveryLog();
        log.setNotificationId(msg.getNotificationId());
        log.setType(msg.getType());
        log.setRecipient(msg.getRecipient());
        log.setSubject(msg.getSubject());
        log.setMessage(msg.getMessage());
        log.setProcessedAt(LocalDateTime.now());

        try {
            simulateSend(msg);
            log.setStatus("delivered");
            System.out.println("✓ Delivered " + msg.getType() + " to " + msg.getRecipient());
        } catch (Exception e) {
            log.setStatus("failed");
            log.setError(e.getMessage());
            System.err.println("✗ Failed: " + e.getMessage());
        }

        mongoTemplate.save(log);
    }

    private void simulateSend(NotificationMessage msg) {
        System.out.println("Sending " + msg.getType() + " to " + msg.getRecipient());
        System.out.println("Subject: " + msg.getSubject());
        System.out.println("Message: " + msg.getMessage());
    }
}