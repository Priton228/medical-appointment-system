package com.medical.dto.common;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendChatMessageRequest(
        Long recipientId,
        @NotBlank(message = "Сообщение не может быть пустым")
        @Size(max = 4000, message = "Сообщение слишком длинное")
        String content
) {}
