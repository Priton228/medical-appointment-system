package com.medical.dto.admin;

import com.medical.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateUserRequest(
        @NotBlank(message = "Full name is required")
        String fullName,
        @Pattern(regexp = "^[a-zA-Z0-9._-]{3,50}$", message = "Username must contain 3-50 latin characters, digits, dot, underscore or dash")
        String username,
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email")
        String email,
        @NotBlank(message = "Phone is required")
        String phone,
        Role role
) {
}
