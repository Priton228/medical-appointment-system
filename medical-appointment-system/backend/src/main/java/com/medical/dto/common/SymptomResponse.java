package com.medical.dto.common;

public record SymptomResponse(
        Long id,
        String name,
        String description,
        Boolean isUrgent
) {
}
