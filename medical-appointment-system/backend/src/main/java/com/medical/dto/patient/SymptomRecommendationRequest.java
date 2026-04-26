package com.medical.dto.patient;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SymptomRecommendationRequest(
        @NotEmpty(message = "Нужно выбрать хотя бы один симптом")
        List<Long> symptomIds
) {
}
