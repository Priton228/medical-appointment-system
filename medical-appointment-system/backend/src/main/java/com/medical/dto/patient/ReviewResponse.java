package com.medical.dto.patient;

import java.time.LocalDateTime;

public record ReviewResponse(
        Long id,
        Long appointmentId,
        String patientName,
        Integer rating,
        String comment,
        LocalDateTime createdAt
) {
}
