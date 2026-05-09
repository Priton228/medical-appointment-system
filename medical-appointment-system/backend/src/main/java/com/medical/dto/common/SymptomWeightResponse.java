package com.medical.dto.common;

import java.math.BigDecimal;

public record SymptomWeightResponse(
        Long symptomId,
        String symptomName,
        BigDecimal weight
) {}
