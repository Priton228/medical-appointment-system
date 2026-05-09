package com.medical.service;

import com.medical.dto.common.ChatConversationResponse;
import com.medical.dto.common.ChatMessageResponse;
import com.medical.dto.common.SendChatMessageRequest;
import com.medical.entity.*;
import com.medical.exception.BusinessException;
import com.medical.repository.ChatMessageRepository;
import com.medical.repository.UserNotificationRepository;
import com.medical.repository.UserRepository;
import com.medical.service.integration.EmailNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserNotificationRepository userNotificationRepository;
    @Mock
    private EmailNotificationService emailNotificationService;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private ChatService chatService;

    private User patientUser;
    private User adminUser;
    private ChatMessage message;

    @BeforeEach
    void setUp() {
        patientUser = User.builder().id(1L).username("patient1").fullName("Patient One").email("p1@test.com").role(Role.PATIENT).build();
        adminUser = User.builder().id(2L).username("admin").fullName("Admin").email("admin@test.com").role(Role.ADMIN).build();
        message = ChatMessage.builder()
                .id(100L)
                .sender(patientUser)
                .recipient(adminUser)
                .content("Hello admin")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getMyConversation_shouldReturnMessages_whenPatient() {
        when(authentication.getPrincipal()).thenReturn(patientUser);
        when(userRepository.findAllByRole(Role.ADMIN)).thenReturn(List.of(adminUser));
        when(chatMessageRepository.findConversation(1L, 2L)).thenReturn(List.of(message));

        List<ChatMessageResponse> result = chatService.getMyConversation(authentication);

        assertEquals(1, result.size());
        assertEquals("Hello admin", result.get(0).content());
        assertEquals(1L, result.get(0).senderId());
    }

    @Test
    void getMyConversation_shouldThrow_whenAdmin() {
        when(authentication.getPrincipal()).thenReturn(adminUser);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> chatService.getMyConversation(authentication));
        assertEquals("ADMIN_NEEDS_USER", ex.getErrorCode());
    }

    @Test
    void getAdminConversationWithUser_shouldReturnMessages() {
        when(authentication.getPrincipal()).thenReturn(adminUser);
        when(userRepository.findById(1L)).thenReturn(Optional.of(patientUser));
        when(chatMessageRepository.findConversation(2L, 1L)).thenReturn(List.of(message));

        List<ChatMessageResponse> result = chatService.getAdminConversationWithUser(authentication, 1L);

        assertEquals(1, result.size());
        assertEquals("Hello admin", result.get(0).content());
    }

    @Test
    void getAdminConversationWithUser_shouldThrow_whenNotAdmin() {
        when(authentication.getPrincipal()).thenReturn(patientUser);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> chatService.getAdminConversationWithUser(authentication, 1L));
        assertEquals("FORBIDDEN", ex.getErrorCode());
    }

    @Test
    void getAdminConversationWithUser_shouldThrow_whenChatWithAdmin() {
        User otherAdmin = User.builder().id(3L).username("admin2").role(Role.ADMIN).build();
        when(authentication.getPrincipal()).thenReturn(adminUser);
        when(userRepository.findById(3L)).thenReturn(Optional.of(otherAdmin));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> chatService.getAdminConversationWithUser(authentication, 3L));
        assertEquals("FORBIDDEN", ex.getErrorCode());
    }

    @Test
    void sendMessage_shouldSucceed_whenPatientToAdmin() {
        when(authentication.getPrincipal()).thenReturn(patientUser);
        when(userRepository.findAllByRole(Role.ADMIN)).thenReturn(List.of(adminUser));
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(message);
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());

        SendChatMessageRequest request = new SendChatMessageRequest(null, "Hello admin");
        ChatMessageResponse response = chatService.sendMessage(authentication, request);

        assertNotNull(response);
        assertEquals("Hello admin", response.content());
        assertEquals(1L, response.senderId());
    }

    @Test
    void sendMessage_shouldSucceed_whenAdminToPatient() {
        when(authentication.getPrincipal()).thenReturn(adminUser);
        when(userRepository.findById(1L)).thenReturn(Optional.of(patientUser));
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(message);
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());

        SendChatMessageRequest request = new SendChatMessageRequest(1L, "Reply from admin");
        ChatMessageResponse response = chatService.sendMessage(authentication, request);

        assertNotNull(response);
        assertEquals("Reply from admin", response.content());
    }

    @Test
    void sendMessage_shouldThrow_whenEmptyContent() {
        when(authentication.getPrincipal()).thenReturn(patientUser);

        SendChatMessageRequest request = new SendChatMessageRequest(null, "   ");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> chatService.sendMessage(authentication, request));
        assertEquals("EMPTY_MESSAGE", ex.getErrorCode());
    }

    @Test
    void sendMessage_shouldThrow_whenAdminNoRecipient() {
        when(authentication.getPrincipal()).thenReturn(adminUser);

        SendChatMessageRequest request = new SendChatMessageRequest(null, "Hello");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> chatService.sendMessage(authentication, request));
        assertEquals("RECIPIENT_REQUIRED", ex.getErrorCode());
    }

    @Test
    void sendMessage_shouldThrow_whenAdminToAdmin() {
        User otherAdmin = User.builder().id(3L).username("admin2").role(Role.ADMIN).build();
        when(authentication.getPrincipal()).thenReturn(adminUser);
        when(userRepository.findById(3L)).thenReturn(Optional.of(otherAdmin));

        SendChatMessageRequest request = new SendChatMessageRequest(3L, "Hello");
        BusinessException ex = assertThrows(BusinessException.class,
                () -> chatService.sendMessage(authentication, request));
        assertEquals("FORBIDDEN", ex.getErrorCode());
    }

    @Test
    void getAdminConversations_shouldReturnList() {
        when(authentication.getPrincipal()).thenReturn(adminUser);
        when(chatMessageRepository.findChatPartnersForAdmin(2L)).thenReturn(List.of(patientUser));
        when(chatMessageRepository.findLastMessage(2L, 1L)).thenReturn(message);
        when(chatMessageRepository.countUnreadFromSender(2L, 1L)).thenReturn(1L);

        List<ChatConversationResponse> result = chatService.getAdminConversations(authentication);

        assertEquals(1, result.size());
        assertEquals("Patient One", result.get(0).partnerName());
        assertEquals(1L, result.get(0).unreadCount());
    }

    @Test
    void getAdminConversations_shouldThrow_whenNotAdmin() {
        when(authentication.getPrincipal()).thenReturn(patientUser);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> chatService.getAdminConversations(authentication));
        assertEquals("FORBIDDEN", ex.getErrorCode());
    }

    @Test
    void getUnreadCount_shouldReturnCount() {
        when(authentication.getPrincipal()).thenReturn(patientUser);
        when(chatMessageRepository.countByRecipientAndIsReadFalse(patientUser)).thenReturn(5L);

        long result = chatService.getUnreadCount(authentication);

        assertEquals(5L, result);
    }
}
