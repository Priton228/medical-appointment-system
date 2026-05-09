package com.medical.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Full name is required")
        @Size(min = 3, max = 100, message = "Full name must be from 3 to 100 characters")
        String fullName,

        @Pattern(regexp = "^[a-zA-Z0-9._-]{3,50}$", message = "Username must contain 3-50 latin characters, digits, dot, underscore or dash")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @Pattern(regexp = "^\\+?[0-9\\s-]{10,15}$", message = "Invalid phone format")
        String phone,

        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
        String password,

        @NotBlank(message = "Password confirmation is required")
        String confirmPassword
) {
}
