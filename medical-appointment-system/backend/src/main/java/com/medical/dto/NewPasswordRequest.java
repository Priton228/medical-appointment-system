package com.medical.dto;

public record NewPasswordRequest(String email, String code, String newPassword, String confirmPassword) {
}
