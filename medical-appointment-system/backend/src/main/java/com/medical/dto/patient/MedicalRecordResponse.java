package com.medical.dto.patient;

import java.time.LocalDateTime;

public record MedicalRecordResponse(
        Long id,
        String doctorName,
        String diagnosis,
        String treatment,
        String notes,
        String complaints,
        String examinationResults,
        LocalDateTime createdAt
) {
}
