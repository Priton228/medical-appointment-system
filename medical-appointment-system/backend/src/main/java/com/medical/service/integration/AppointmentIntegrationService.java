package com.medical.service.integration;

import com.medical.entity.Appointment;
import com.medical.entity.User;
import com.medical.entity.UserNotification;
import com.medical.entity.NotificationType;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentIntegrationService {

    private final UserNotificationRepository userNotificationRepository;
    private final AppointmentRepository appointmentRepository;
    private final EmailNotificationService emailNotificationService;
    private final GoogleCalendarService googleCalendarService;

    @Transactional
    public void handleAppointmentBooked(Appointment appointment) {
        log.info("[INTEGRATION] handleAppointmentBooked START for appointment id={}, patientEmail={}, doctorEmail={}",
                appointment.getId(),
                appointment.getPatient().getUser().getEmail(),
                appointment.getDoctor().getUser().getEmail());
        
        User patientUser = appointment.getPatient().getUser();
        User doctorUser = appointment.getDoctor().getUser();
        String appointmentText = appointmentDateTimeText(appointment);
        String patientName = appointment.getPatient().getUser().getFullName();

        createInAppNotification(
                patientUser,
                NotificationType.APPOINTMENT_CONFIRMED,
                "Запись подтверждена",
                "Ваш приём назначен на " + appointmentText + "."
        );

        createInAppNotification(
                doctorUser,
                NotificationType.APPOINTMENT_CONFIRMED,
                "Новая запись",
                "У вас новая запись от пациента " + patientName + " на " + appointmentText + "."
        );

        log.info("Booking appointment {} - sending notifications", appointment.getId());
        emailNotificationService.sendEmail(
                patientUser.getEmail(),
                "Запись подтверждена",
                "Вы записаны на приём на " + appointmentText + "."
        );
        emailNotificationService.sendEmail(
                doctorUser.getEmail(),
                "Новая запись",
                "У вас новая запись от пациента " + patientName + " на " + appointmentText + "."
        );

        String eventId = googleCalendarService.createEvent(appointment);
        if (eventId != null && !eventId.isBlank()) {
            appointment.setCalendarEventId(eventId);
            appointmentRepository.save(appointment);
        }
        log.info("[INTEGRATION] handleAppointmentBooked COMPLETED for appointment id={}", appointment.getId());
    }

    @Transactional
    public void handleAppointmentRescheduled(Appointment appointment) {
        User patientUser = appointment.getPatient().getUser();
        User doctorUser = appointment.getDoctor().getUser();
        String appointmentText = appointmentDateTimeText(appointment);
        String patientName = appointment.getPatient().getUser().getFullName();

        createInAppNotification(
                patientUser,
                NotificationType.APPOINTMENT_RESCHEDULED,
                "Приём перенесён",
                "Ваш приём перенесён на " + appointmentText + "."
        );

        createInAppNotification(
                doctorUser,
                NotificationType.APPOINTMENT_RESCHEDULED,
                "Запись перенесена",
                "Запись пациента " + patientName + " перенесена на " + appointmentText + "."
        );

        emailNotificationService.sendEmail(
                patientUser.getEmail(),
                "Приём перенесён",
                "Ваш приём перенесён на " + appointmentText + "."
        );

        emailNotificationService.sendEmail(
                doctorUser.getEmail(),
                "Запись перенесена",
                "Запись пациента " + patientName + " перенесена на " + appointmentText + "."
        );

        if (appointment.getCalendarEventId() == null || appointment.getCalendarEventId().isBlank()) {
            String eventId = googleCalendarService.createEvent(appointment);
            if (eventId != null && !eventId.isBlank()) {
                appointment.setCalendarEventId(eventId);
                appointmentRepository.save(appointment);
            }
        } else {
            googleCalendarService.updateEvent(appointment.getCalendarEventId(), appointment);
        }
    }

    @Transactional
    public void handleAppointmentCancelled(Appointment appointment, String cancelledBy) {
        User patientUser = appointment.getPatient().getUser();
        User doctorUser = appointment.getDoctor().getUser();
        String appointmentText = appointmentDateTimeText(appointment);
        String cancelledByRu = switch (cancelledBy.toLowerCase()) {
            case "doctor" -> "врачом";
            case "patient" -> "пациентом";
            case "admin" -> "администратором";
            default -> cancelledBy;
        };
        String patientName = appointment.getPatient().getUser().getFullName();

        createInAppNotification(
                patientUser,
                NotificationType.APPOINTMENT_CANCELLED,
                "Приём отменён",
                "Приём " + appointmentText + " был отменён " + cancelledByRu + "."
        );

        createInAppNotification(
                doctorUser,
                NotificationType.APPOINTMENT_CANCELLED,
                "Запись отменена",
                "Запись пациента " + patientName + " на " + appointmentText + " была отменена " + cancelledByRu + "."
        );

        emailNotificationService.sendEmail(
                patientUser.getEmail(),
                "Приём отменён",
                "Приём " + appointmentText + " был отменён " + cancelledByRu + "."
        );

        emailNotificationService.sendEmail(
                doctorUser.getEmail(),
                "Запись отменена",
                "Запись пациента " + patientName + " на " + appointmentText + " была отменена " + cancelledByRu + "."
        );

        if (appointment.getCalendarEventId() != null && !appointment.getCalendarEventId().isBlank()) {
            googleCalendarService.deleteEvent(appointment.getCalendarEventId());
            appointment.setCalendarEventId(null);
            appointmentRepository.save(appointment);
        }
    }

    @Transactional
    public void handleAppointmentCompleted(Appointment appointment) {
        User patientUser = appointment.getPatient().getUser();
        String appointmentText = appointmentDateTimeText(appointment);

        createInAppNotification(
                patientUser,
                NotificationType.APPOINTMENT_COMPLETED,
                "Приём завершён",
                "Приём " + appointmentText + " завершён."
        );

        emailNotificationService.sendEmail(
                patientUser.getEmail(),
                "Приём завершён",
                "Приём " + appointmentText + " успешно завершён."
        );
    }

    @Transactional
    public void sendReminder(Appointment appointment) {
        if (appointment.getReminderSentAt() != null) {
            return;
        }

        User patientUser = appointment.getPatient().getUser();
        User doctorUser = appointment.getDoctor().getUser();
        String patientName = patientUser.getFullName();
        String appointmentText = appointmentDateTimeText(appointment);

        createInAppNotification(
                patientUser,
                NotificationType.APPOINTMENT_REMINDER,
                "Напоминание: приём через 24 часа",
                "Пожалуйста, подтвердите ваш приём на " + appointmentText + " в личном кабинете."
        );

        createInAppNotification(
                doctorUser,
                NotificationType.APPOINTMENT_REMINDER,
                "Напоминание о приёме",
                "Приём пациента " + patientName + " через 24 часа — " + appointmentText + "."
        );

        emailNotificationService.sendEmail(
                patientUser.getEmail(),
                "Подтвердите приём",
                "Напоминание: ваш приём примерно через 24 часа — " + appointmentText + ". Пожалуйста, подтвердите его в приложении."
        );

        emailNotificationService.sendEmail(
                doctorUser.getEmail(),
                "Напоминание о приёме",
                "Напоминание: приём пациента " + patientName + " через 24 часа — " + appointmentText + "."
        );

        appointment.setReminderSentAt(LocalDateTime.now());
        appointmentRepository.save(appointment);
    }

    @Async
    public void createInAppNotification(User user, NotificationType type, String title, String message) {
        UserNotification notification = UserNotification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        userNotificationRepository.save(notification);
    }

    private String appointmentDateTimeText(Appointment appointment) {
        return appointment.getSlot().getDate() + " " + appointment.getSlot().getStartTime() +
                " (врач: " + appointment.getDoctor().getUser().getFullName() + ")";
    }
}
