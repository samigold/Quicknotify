package com.quicknotify.delivery_service.service;

import com.quicknotify.delivery_service.model.DeliveryLog;
import com.quicknotify.delivery_service.model.NotificationMessage;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;



import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;

@Service
public class DeliveryService {

    private final MongoTemplate mongoTemplate;
    private final String resendApiKey;
    private final String resendFromEmail;

    public DeliveryService(
                        MongoTemplate mongoTemplate,
                        @Value("${resend.api.key}") String resendApiKey,
                        @Value("${resend.from.email}") String resendFromEmail) {
        this.mongoTemplate = mongoTemplate;
        this.resendApiKey = resendApiKey;
        this.resendFromEmail = resendFromEmail;
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
            switch (msg.getType()) {
                case "email" -> sendEmail(msg);
                case "sms" -> simulateSend(msg);
                case "push" -> simulateSend(msg);
                default -> throw new IllegalArgumentException("Unsupported notification type: " + msg.getType());
            }
            log.setStatus("delivered");
            System.out.println("✓ Delivered " + msg.getType() + " to " + msg.getRecipient());
            // simulateSend(msg);
            // log.setStatus("delivered");
            // System.out.println("✓ Delivered " + msg.getType() + " to " + msg.getRecipient());
        } catch (Exception e) {
            log.setStatus("failed");
            log.setError(e.getMessage());
            System.err.println("✗ Failed: " + e.getMessage());
        }

        mongoTemplate.save(log);
    }

    private void sendEmail(NotificationMessage msg) throws Exception {
        String payload = String.format("""
                {
                    "from": "%s",
                    "to": "%s",
                    "subject": "%s",
                    "html": "<p>%s</p>"
                }
                 """,
                    resendFromEmail,
                    msg.getRecipient(),
                    msg.getSubject(),
                    msg.getMessage()
                );

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/email"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + resendApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200 && response.statusCode() != 201) {
            throw new RuntimeException("Resend API error: " + response.statusCode() + " - " + response.body());
        }

        System.out.println("Email sent to " + msg.getRecipient() + " with subject: " + msg.getSubject());
    }

    private void simulateSend(NotificationMessage msg) {
        System.out.println("Sending " + msg.getType() + " to " + msg.getRecipient());
        System.out.println("Subject: " + msg.getSubject());
        System.out.println("Message: " + msg.getMessage());
    }
}