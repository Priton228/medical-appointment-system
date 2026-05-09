package com.medical.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record UpsertSpecializationRequest(
        @NotBlank
        @Size(max = 100)
        String name,
        
        @Size(max = 1000)
        String description,
        
        List<SymptomWeightRequest> symptoms
) {
    public record SymptomWeightRequest(
            Long symptomId,
            BigDecimal weight
    ) {}
}
