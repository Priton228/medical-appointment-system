package com.medical.dto.common;

import java.util.List;

public record SpecializationDetailResponse(
        Long id,
        String name,
        String description,
        List<SymptomWeightResponse> symptoms
) {}
