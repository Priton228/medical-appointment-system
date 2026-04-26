package com.medical.dto.patient;

import java.time.LocalDate;

public record PatientProfileResponse(
        Long userId,
        Long patientId,
        String fullName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String emergencyContact
) {
}
