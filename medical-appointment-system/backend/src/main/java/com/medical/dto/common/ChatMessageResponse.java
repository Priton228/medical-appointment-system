package com.medical.dto.common;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Long id,
        Long senderId,
        String senderName,
        String senderRole,
        Long recipientId,
        String content,
        boolean isRead,
        LocalDateTime createdAt
) {}
