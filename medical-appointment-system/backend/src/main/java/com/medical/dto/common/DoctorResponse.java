package com.medical.dto.common;

import java.math.BigDecimal;

public record DoctorResponse(
        Long id,
        Long userId,
        String fullName,
        String email,
        String phone,
        Long specializationId,
        String specializationName,
        String description,
        Integer experienceYears,
        String education,
        BigDecimal rating,
        Integer totalRatings
) {
}
