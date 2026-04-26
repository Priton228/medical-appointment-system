package com.medical.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import com.medical.entity.Role;

public record UpdateUserRequest(
        @NotBlank(message = "ФИО обязательно")
        String fullName,
        @NotBlank(message = "Email обязателен")
        @Email(message = "Некорректный email")
        String email,
        @NotBlank(message = "Телефон обязателен")
        String phone,
        Role role
) {
}
