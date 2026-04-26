package com.medical.dto.patient;

import com.medical.dto.common.DoctorResponse;

import java.util.List;

public record SymptomRecommendationResponse(
        String recommendedSpecialization,
        List<DoctorResponse> doctors
) {
}
