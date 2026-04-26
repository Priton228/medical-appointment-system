package com.medical.dto.patient;

import com.medical.entity.NotificationType;

import java.time.LocalDateTime;

public record PatientNotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String message,
        Boolean isRead,
        LocalDateTime createdAt
) {
}
