package com.medical.dto.common;

import com.medical.entity.RescheduleRequestStatus;

import java.time.LocalDateTime;

public record RescheduleRequestResponse(
        Long id,
        Long appointmentId,
        String patientName,
        String doctorName,
        String currentDate,
        String currentStartTime,
        String currentEndTime,
        String requestedDate,
        String requestedStartTime,
        String requestedEndTime,
        RescheduleRequestStatus status,
        String adminComment,
        LocalDateTime createdAt,
        LocalDateTime processedAt
) {
}
