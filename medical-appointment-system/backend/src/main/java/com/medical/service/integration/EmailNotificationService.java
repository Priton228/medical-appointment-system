package com.medical.service.integration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.integrations.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.integrations.mail.from:no-reply@medical-system.local}")
    private String fromEmail;

    @Async("emailTaskExecutor")
    public void sendEmail(String toEmail, String subject, String body) {
        log.info("[EMAIL] Starting sendEmail to={} subject={} mailEnabled={}", toEmail, subject, mailEnabled);
        
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EMAIL] Skipping - empty recipient email");
            return;
        }

        if (!mailEnabled) {
            log.info("[EMAIL] Mail integration is DISABLED. To={} Subject={}", toEmail, subject);
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.error("[EMAIL] JavaMailSender bean is UNAVAILABLE. To={} Subject={}", toEmail, subject);
            return;
        }
        log.info("[EMAIL] JavaMailSender is available, attempting to send...");

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            log.info("[EMAIL] Sending message: from={}, to={}, subject={}", fromEmail, toEmail, subject);
            mailSender.send(message);
            log.info("[EMAIL] SUCCESS - Email sent to: {} | Subject: {}", toEmail, subject);
        } catch (Exception ex) {
            log.error("[EMAIL] FAILED to send email to {}: {}", toEmail, ex.getMessage(), ex);
        }
    }
}
