package com.medical.dto.patient;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BookAppointmentRequest(
        @NotNull(message = "slotId обязателен")
        Long slotId,
        String symptomsDescription,
        List<Long> symptomIds
) {
}
