package com.quicknotify.delivery_service.model;

import lombok.Data;

@Data
public class NotificationMessage {
    private String notificationId;
    private String type;
    private String recipient;
    private String subject;
    private String message;
}