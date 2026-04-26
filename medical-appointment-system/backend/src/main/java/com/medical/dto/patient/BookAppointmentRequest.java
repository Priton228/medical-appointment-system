package com.medical.dto.patient;

import jakarta.validation.constraints.NotNull;

public record BookAppointmentRequest(
        @NotNull(message = "slotId обязателен")
        Long slotId,
        String symptomsDescription
) {
}
