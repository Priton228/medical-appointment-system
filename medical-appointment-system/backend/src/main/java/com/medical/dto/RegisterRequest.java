package com.medical.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "ФИО обязательно")
        @Size(min = 3, max = 100, message = "ФИО должно быть от 3 до 100 символов")
        String fullName,

        @NotBlank(message = "Email обязателен")
        @Email(message = "Некорректный формат email")
        String email,

        @Pattern(regexp = "^\\+?[0-9\\s-]{10,15}$", message = "Некорректный формат телефона")
        String phone,

        @NotBlank(message = "Пароль обязателен")
        @Size(min = 6, max = 100, message = "Пароль должен быть не менее 6 символов")
        String password,

        @NotBlank(message = "Подтверждение пароля обязательно")
        String confirmPassword
) {
}