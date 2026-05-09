package com.medical.service.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailNotificationServiceTest {

    @Mock
    private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock
    private JavaMailSender mailSender;

    private EmailNotificationService service;

    @BeforeEach
    void setUp() {
        service = new EmailNotificationService(mailSenderProvider);
        ReflectionTestUtils.setField(service, "mailEnabled", true);
        ReflectionTestUtils.setField(service, "fromEmail", "test@example.com");
    }

    @Test
    void sendEmail_shouldSend_whenEnabledAndSenderAvailable() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        service.sendEmail("to@test.com", "Subject", "Body");

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendEmail_shouldSkip_whenDisabled() {
        ReflectionTestUtils.setField(service, "mailEnabled", false);
        service.sendEmail("to@test.com", "Subject", "Body");
        verifyNoInteractions(mailSenderProvider);
    }

    @Test
    void sendEmail_shouldSkip_whenNullRecipient() {
        service.sendEmail(null, "Subject", "Body");
        verifyNoInteractions(mailSenderProvider);
    }

    @Test
    void sendEmail_shouldSkip_whenBlankRecipient() {
        service.sendEmail("   ", "Subject", "Body");
        verifyNoInteractions(mailSenderProvider);
    }

    @Test
    void sendEmail_shouldHandle_whenMailSenderUnavailable() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(null);
        service.sendEmail("to@test.com", "Subject", "Body");
        verify(mailSenderProvider).getIfAvailable();
        verifyNoMoreInteractions(mailSenderProvider);
    }
}
