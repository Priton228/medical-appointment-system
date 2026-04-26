package com.medical.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record UpsertSymptomRequest(
        @NotBlank(message = "Название симптома обязательно")
        String name,
        String description,
        Boolean isUrgent
) {
}
