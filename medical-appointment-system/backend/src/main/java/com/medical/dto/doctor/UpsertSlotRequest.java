package com.medical.dto.doctor;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record UpsertSlotRequest(
        @NotNull(message = "Дата обязательна")
        LocalDate date,
        @NotNull(message = "Время начала обязательно")
        LocalTime startTime,
        @NotNull(message = "Время окончания обязательно")
        LocalTime endTime,
        Boolean isBlocked
) {
}
