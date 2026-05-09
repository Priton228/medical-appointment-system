package com.medical.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAdminProfileRequest(
        @NotBlank(message = "ФИО не может быть пустым")
        @Size(max = 200)
        String fullName,

        @NotBlank(message = "Email не может быть пустым")
        @Email(message = "Некорректный email")
        String email,

        @Size(max = 20)
        String phone,

        @Size(max = 50)
        String username
) {}
