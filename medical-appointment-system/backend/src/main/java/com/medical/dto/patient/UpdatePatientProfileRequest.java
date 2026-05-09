package com.medical.dto.patient;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record UpdatePatientProfileRequest(
        @NotBlank(message = "Full name is required")
        String fullName,
        @NotBlank(message = "Username is required")
        @Pattern(regexp = "^[a-zA-Z0-9._-]{3,50}$", message = "Username must contain 3-50 latin characters, digits, dot, underscore or dash")
        String username,
        @Email(message = "Invalid email")
        @NotBlank(message = "Email is required")
        String email,
        @NotBlank(message = "Phone is required")
        String phone,
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
