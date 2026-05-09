package com.medical.controller;

import com.medical.dto.common.ChatConversationResponse;
import com.medical.dto.common.ChatMessageResponse;
import com.medical.dto.common.SendChatMessageRequest;
import com.medical.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ChatController {

    private final ChatService chatService;

    /** Сообщения текущего пациента/врача с администратором */
    @GetMapping("/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMyConversation(Authentication auth) {
        return ResponseEntity.ok(chatService.getMyConversation(auth));
    }

    /** Отправить сообщение */
    @PostMapping("/messages")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            Authentication auth,
            @Valid @RequestBody SendChatMessageRequest request
    ) {
        return ResponseEntity.ok(chatService.sendMessage(auth, request));
    }

    /** Отметить переписку прочитанной (для админа - переписка с конкретным userId) */
    @PostMapping("/messages/read")
    public ResponseEntity<Void> markRead(
            Authentication auth,
            @RequestParam(required = false) Long partnerId
    ) {
        chatService.markConversationRead(auth, partnerId);
        return ResponseEntity.noContent().build();
    }

    /** Количество непрочитанных сообщений у текущего пользователя */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        return ResponseEntity.ok(Map.of("count", chatService.getUnreadCount(auth)));
    }

    /** Список переписок для админа */
    @GetMapping("/admin/conversations")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<ChatConversationResponse>> getAdminConversations(Authentication auth) {
        return ResponseEntity.ok(chatService.getAdminConversations(auth));
    }

    /** Сообщения переписки админа с конкретным пользователем */
    @GetMapping("/admin/conversations/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<ChatMessageResponse>> getAdminConversationWithUser(
            Authentication auth,
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(chatService.getAdminConversationWithUser(auth, userId));
    }
}
