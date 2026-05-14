package com.quicknotify.delivery_service.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "delivery_logs")
public class DeliveryLog {

    @Id
    private String id;
    private String notificationId;
    private String type;
    private String recipient;
    private String subject;
    private String message;
    private String status;
    private String error;
    private LocalDateTime processedAt;
}