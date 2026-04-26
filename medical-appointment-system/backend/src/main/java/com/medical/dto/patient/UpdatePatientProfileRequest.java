package com.medical.dto.patient;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record UpdatePatientProfileRequest(
        @NotBlank(message = "ФИО обязательно")
        String fullName,
        @Email(message = "Некорректный email")
        @NotBlank(message = "Email обязателен")
        String email,
        @NotBlank(message = "Телефон обязателен")
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String emergencyContact
) {
}
