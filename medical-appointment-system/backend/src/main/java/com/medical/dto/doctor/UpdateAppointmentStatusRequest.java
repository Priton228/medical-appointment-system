package com.medical.dto.doctor;

import com.medical.entity.AppointmentStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateAppointmentStatusRequest(
        @NotNull(message = "Статус обязателен")
        AppointmentStatus status,
        String doctorNotes,
        String diagnosis,
        String treatmentRecommendations,
        String cancelReason
) {
}
