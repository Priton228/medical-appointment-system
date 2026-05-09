package com.medical.service;

import com.medical.dto.common.ChatConversationResponse;
import com.medical.dto.common.ChatMessageResponse;
import com.medical.dto.common.SendChatMessageRequest;
import com.medical.entity.ChatMessage;
import com.medical.entity.NotificationType;
import com.medical.entity.Role;
import com.medical.entity.User;
import com.medical.entity.UserNotification;
import com.medical.exception.BusinessException;
import com.medical.repository.ChatMessageRepository;
import com.medical.repository.UserNotificationRepository;
import com.medical.repository.UserRepository;
import com.medical.service.integration.EmailNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final EmailNotificationService emailNotificationService;

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMyConversation(Authentication authentication) {
        User me = resolveUser(authentication);
        if (me.getRole() == Role.ADMIN) {
            throw new BusinessException("Администратор должен открывать переписку с конкретным пользователем", "ADMIN_NEEDS_USER");
        }
        User admin = resolveDefaultAdmin();
        return chatMessageRepository.findConversation(me.getId(), admin.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getAdminConversationWithUser(Authentication authentication, Long userId) {
        User admin = resolveUser(authentication);
        if (admin.getRole() != Role.ADMIN) {
            throw new BusinessException("Доступно только администраторам", "FORBIDDEN");
        }
        User other = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Пользователь не найден", "USER_NOT_FOUND"));
        if (other.getRole() == Role.ADMIN) {
            throw new BusinessException("Нельзя открыть чат с другим администратором", "FORBIDDEN");
        }
        return chatMessageRepository.findConversation(admin.getId(), other.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ChatMessageResponse sendMessage(Authentication authentication, SendChatMessageRequest request) {
        User me = resolveUser(authentication);
        if (request.content() == null || request.content().isBlank()) {
            throw new BusinessException("Сообщение не может быть пустым", "EMPTY_MESSAGE");
        }
        User recipient;
        if (me.getRole() == Role.ADMIN) {
            if (request.recipientId() == null) {
                throw new BusinessException("Не указан получатель", "RECIPIENT_REQUIRED");
            }
            recipient = userRepository.findById(request.recipientId())
                    .orElseThrow(() -> new BusinessException("Получатель не найден", "RECIPIENT_NOT_FOUND"));
            if (recipient.getRole() == Role.ADMIN) {
                throw new BusinessException("Нельзя писать другому администратору", "FORBIDDEN");
            }
        } else {
            // Любой пациент или врач отправляет сообщение администратору
            recipient = resolveDefaultAdmin();
        }

        ChatMessage message = ChatMessage.builder()
                .sender(me)
                .recipient(recipient)
                .content(request.content().trim())
                .isRead(false)
                .build();
        ChatMessage saved = chatMessageRepository.save(message);

        // Уведомление получателю
        createChatNotification(recipient, me, saved.getContent());

        // Email уведомление получателю
        emailNotificationService.sendEmail(
                recipient.getEmail(),
                "Новое сообщение от " + me.getFullName(),
                "Вам пришло новое сообщение от " + me.getFullName() + " (" + me.getRole().getDisplayName() + "):\n\n" + saved.getContent()
        );

        return toResponse(saved);
    }

    @Transactional
    public void markConversationRead(Authentication authentication, Long partnerId) {
        User me = resolveUser(authentication);
        User partner;
        if (me.getRole() == Role.ADMIN) {
            if (partnerId == null) {
                throw new BusinessException("Не указан собеседник", "PARTNER_REQUIRED");
            }
            partner = userRepository.findById(partnerId)
                    .orElseThrow(() -> new BusinessException("Пользователь не найден", "USER_NOT_FOUND"));
        } else {
            partner = resolveDefaultAdmin();
        }
        List<ChatMessage> messages = chatMessageRepository.findConversation(me.getId(), partner.getId());
        boolean changed = false;
        for (ChatMessage m : messages) {
            if (!Boolean.TRUE.equals(m.getIsRead()) && Objects.equals(m.getRecipient().getId(), me.getId())) {
                m.setIsRead(true);
                changed = true;
            }
        }
        if (changed) {
            chatMessageRepository.saveAll(messages);
        }
    }

    @Transactional(readOnly = true)
    public List<ChatConversationResponse> getAdminConversations(Authentication authentication) {
        User admin = resolveUser(authentication);
        if (admin.getRole() != Role.ADMIN) {
            throw new BusinessException("Доступно только администраторам", "FORBIDDEN");
        }
        List<User> partners = chatMessageRepository.findChatPartnersForAdmin(admin.getId());
        List<ChatConversationResponse> result = new ArrayList<>();
        for (User partner : partners) {
            ChatMessage last = chatMessageRepository.findLastMessage(admin.getId(), partner.getId());
            long unread = chatMessageRepository.countUnreadFromSender(admin.getId(), partner.getId());
            result.add(new ChatConversationResponse(
                    partner.getId(),
                    partner.getFullName(),
                    partner.getRole().name(),
                    partner.getAvatarUrl(),
                    last != null ? last.getContent() : null,
                    last != null ? last.getCreatedAt() : null,
                    unread
            ));
        }
        result.sort(Comparator.comparing(
                ChatConversationResponse::lastMessageAt,
                Comparator.nullsLast(Comparator.reverseOrder())
        ));
        return result;
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Authentication authentication) {
        User me = resolveUser(authentication);
        return chatMessageRepository.countByRecipientAndIsReadFalse(me);
    }

    private void createChatNotification(User recipient, User sender, String content) {
        String preview = content.length() > 100 ? content.substring(0, 100) + "..." : content;
        UserNotification notification = UserNotification.builder()
                .user(recipient)
                .type(NotificationType.SYSTEM_NOTIFICATION)
                .title("Новое сообщение от " + sender.getFullName())
                .message(preview)
                .isRead(false)
                .build();
        userNotificationRepository.save(notification);
    }

    private User resolveUser(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }
        if (principal instanceof UserDetails ud) {
            return userRepository.findByUsername(ud.getUsername())
                    .orElseThrow(() -> new BusinessException("Пользователь не найден", "USER_NOT_FOUND"));
        }
        throw new BusinessException("Неверная аутентификация", "INVALID_AUTH");
    }

    private User resolveDefaultAdmin() {
        List<User> admins = userRepository.findAllByRole(Role.ADMIN);
        if (admins.isEmpty()) {
            throw new BusinessException("Администратор не найден", "ADMIN_NOT_FOUND");
        }
        return admins.get(0);
    }

    private ChatMessageResponse toResponse(ChatMessage message) {
        User sender = message.getSender();
        return new ChatMessageResponse(
                message.getId(),
                sender.getId(),
                sender.getFullName(),
                sender.getRole().name(),
                message.getRecipient().getId(),
                message.getContent(),
                Boolean.TRUE.equals(message.getIsRead()),
                message.getCreatedAt()
        );
    }
}
