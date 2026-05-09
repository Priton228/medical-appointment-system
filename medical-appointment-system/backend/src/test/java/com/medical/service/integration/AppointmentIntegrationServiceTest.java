package com.medical.service.integration;

import com.medical.entity.*;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.UserNotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentIntegrationServiceTest {

    @Mock
    private UserNotificationRepository userNotificationRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private EmailNotificationService emailNotificationService;
    @Mock
    private GoogleCalendarService googleCalendarService;

    @InjectMocks
    private AppointmentIntegrationService appointmentIntegrationService;

    private User patientUser;
    private User doctorUser;
    private Appointment appointment;

    @BeforeEach
    void setUp() {
        patientUser = User.builder().id(1L).fullName("Patient One").email("p1@test.com").build();
        doctorUser = User.builder().id(2L).fullName("Dr. Smith").email("dr@test.com").build();
        Patient patient = Patient.builder().id(1L).user(patientUser).build();
        Doctor doctor = Doctor.builder().id(2L).user(doctorUser).build();
        Slot slot = Slot.builder()
                .id(10L)
                .date(LocalDate.of(2025, 6, 1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .build();
        appointment = Appointment.builder()
                .id(100L)
                .patient(patient)
                .doctor(doctor)
                .slot(slot)
                .status(AppointmentStatus.SCHEDULED)
                .build();
    }

    @Test
    void handleAppointmentBooked_shouldCreateNotificationsAndEmails() {
        when(googleCalendarService.createEvent(appointment)).thenReturn("cal-event-123");
        when(appointmentRepository.save(any(Appointment.class))).thenReturn(appointment);
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());

        appointmentIntegrationService.handleAppointmentBooked(appointment);

        verify(userNotificationRepository, times(2)).save(any(UserNotification.class));
        verify(emailNotificationService, times(2)).sendEmail(any(), any(), any());
        verify(googleCalendarService).createEvent(appointment);
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    void handleAppointmentBooked_shouldNotSave_whenNoCalendarEvent() {
        when(googleCalendarService.createEvent(appointment)).thenReturn(null);
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());

        appointmentIntegrationService.handleAppointmentBooked(appointment);

        verify(appointmentRepository, never()).save(any(Appointment.class));
    }

    @Test
    void handleAppointmentRescheduled_shouldCreateEvent_whenNoCalendarId() {
        when(googleCalendarService.createEvent(appointment)).thenReturn("cal-123");
        when(appointmentRepository.save(any(Appointment.class))).thenReturn(appointment);
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());

        appointmentIntegrationService.handleAppointmentRescheduled(appointment);

        verify(googleCalendarService).createEvent(appointment);
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    void handleAppointmentRescheduled_shouldUpdateEvent_whenCalendarIdExists() {
        appointment.setCalendarEventId("existing-cal-123");
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());
        doNothing().when(googleCalendarService).updateEvent(any(), any());

        appointmentIntegrationService.handleAppointmentRescheduled(appointment);

        verify(googleCalendarService).updateEvent(eq("existing-cal-123"), any(Appointment.class));
        verify(appointmentRepository, never()).save(any(Appointment.class));
    }

    @Test
    void handleAppointmentCancelled_shouldDeleteCalendarEvent() {
        appointment.setCalendarEventId("cal-123");
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());
        doNothing().when(googleCalendarService).deleteEvent(any());
        when(appointmentRepository.save(any(Appointment.class))).thenReturn(appointment);

        appointmentIntegrationService.handleAppointmentCancelled(appointment, "doctor");

        verify(googleCalendarService).deleteEvent("cal-123");
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    void handleAppointmentCancelled_shouldNotDelete_whenNoCalendarEvent() {
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());

        appointmentIntegrationService.handleAppointmentCancelled(appointment, "patient");

        verify(googleCalendarService, never()).deleteEvent(any());
        verify(appointmentRepository, never()).save(any(Appointment.class));
    }

    @Test
    void handleAppointmentCompleted_shouldSendNotificationAndEmail() {
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());

        appointmentIntegrationService.handleAppointmentCompleted(appointment);

        verify(userNotificationRepository).save(any(UserNotification.class));
        verify(emailNotificationService).sendEmail(any(), any(), any());
    }

    @Test
    void sendReminder_shouldSend_whenNotYetSent() {
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());
        when(appointmentRepository.save(any(Appointment.class))).thenReturn(appointment);

        appointmentIntegrationService.sendReminder(appointment);

        verify(userNotificationRepository, times(2)).save(any(UserNotification.class));
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    void sendReminder_shouldSkip_whenAlreadySent() {
        appointment.setReminderSentAt(LocalDateTime.now());

        appointmentIntegrationService.sendReminder(appointment);

        verify(userNotificationRepository, never()).save(any());
        verify(appointmentRepository, never()).save(any());
    }
}
