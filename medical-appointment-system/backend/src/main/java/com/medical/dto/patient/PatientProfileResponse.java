package com.medical.dto.patient;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PatientProfileResponse(
        Long userId,
        Long patientId,
        String fullName,
        String username,
        String email,
        String phone,
        String avatarUrl,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String emergencyContact,
        String chronicDiseases,
        String allergies,
        String bloodType,
        Integer heightCm,
        Integer weightKg
) {
}
