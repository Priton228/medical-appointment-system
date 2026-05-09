package com.medical.dto.common;

import java.time.LocalDateTime;

public record ChatConversationResponse(
        Long partnerId,
        String partnerName,
        String partnerRole,
        String partnerAvatarUrl,
        String lastMessage,
        LocalDateTime lastMessageAt,
        long unreadCount
) {}
