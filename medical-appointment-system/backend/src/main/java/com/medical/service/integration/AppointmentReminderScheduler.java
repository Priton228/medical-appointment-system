package com.medical.service.integration;

import com.medical.entity.Appointment;
import com.medical.entity.AppointmentStatus;
import com.medical.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AppointmentReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentIntegrationService appointmentIntegrationService;

    @Scheduled(cron = "${app.integrations.reminders.cron:0 */15 * * * *}")
    @Transactional(readOnly = true)
    public void sendAppointmentReminders() {
        log.info("Starting reminder scheduler...");
        List<Appointment> activeAppointments = appointmentRepository.findByStatusInWithSlot(
                List.of(AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED)
        );
        log.info("Found {} active appointments to check for reminders", activeAppointments.size());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.plusHours(23);
        LocalDateTime to = now.plusHours(25);

        for (Appointment appointment : activeAppointments) {
            try {
                if (appointment.getReminderSentAt() != null) {
                    continue;
                }
                LocalDateTime slotStart = LocalDateTime.of(appointment.getSlot().getDate(), appointment.getSlot().getStartTime());
                if (!slotStart.isBefore(from) && !slotStart.isAfter(to)) {
                    appointmentIntegrationService.sendReminder(appointment);
                }
            } catch (Exception ex) {
                log.error("Failed to send reminder for appointment {}", appointment.getId(), ex);
            }
        }
    }
}
