package com.medical.dto.common;

import java.time.LocalDate;
import java.time.LocalTime;

public record SlotResponse(
        Long id,
        Long doctorId,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        Boolean isBooked,
        Boolean isBlocked
) {
}
