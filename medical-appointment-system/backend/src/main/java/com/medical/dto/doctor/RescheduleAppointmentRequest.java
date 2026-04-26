package com.medical.dto.doctor;

import jakarta.validation.constraints.NotNull;

public record RescheduleAppointmentRequest(
        @NotNull(message = "Укажите новый слот")
        Long newSlotId
) {
}
