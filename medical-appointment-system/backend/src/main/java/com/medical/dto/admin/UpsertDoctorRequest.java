package com.medical.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpsertDoctorRequest(
        @NotBlank(message = "ФИО обязательно")
        @Size(min = 3, max = 100, message = "ФИО должно быть от 3 до 100 символов")
        String fullName,
        @NotBlank(message = "Email обязателен")
        @Email(message = "Некорректный формат email")
        String email,
        @NotBlank(message = "Телефон обязателен")
        String phone,
        Long specializationId,
        String description,
        @Min(value = 0, message = "Стаж не может быть отрицательным")
        Integer experienceYears,
        String education
) {
}
