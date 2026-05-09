package com.medical.service;

import com.medical.dto.common.SlotResponse;
import com.medical.dto.doctor.DoctorDashboardResponse;
import com.medical.dto.doctor.UpsertSlotRequest;
import com.medical.entity.*;
import com.medical.exception.BusinessException;
import com.medical.repository.*;
import com.medical.service.integration.AppointmentIntegrationService;
import com.medical.service.integration.EmailNotificationService;
import com.medical.service.mapping.AppointmentMapper;
import com.medical.service.storage.AvatarStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DoctorCabinetServiceTest {

    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private SlotRepository slotRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserNotificationRepository userNotificationRepository;
    @Mock
    private AvatarStorageService avatarStorageService;
    @Mock
    private AppointmentIntegrationService appointmentIntegrationService;
    @Mock
    private RescheduleRequestRepository rescheduleRequestRepository;
    @Mock
    private AppointmentMapper appointmentMapper;
    @Mock
    private EmailNotificationService emailNotificationService;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private DoctorCabinetService doctorCabinetService;

    private User doctorUser;
    private Doctor doctor;

    @BeforeEach
    void setUp() {
        doctorUser = User.builder().id(1L).username("doc1").fullName("Dr. Smith").build();
        Specialization spec = Specialization.builder().id(1L).name("Therapy").build();
        doctor = Doctor.builder()
                .id(1L)
                .user(doctorUser)
                .specialization(spec)
                .rating(java.math.BigDecimal.valueOf(4.5))
                .totalRatings(10)
                .build();
    }

    @Test
    void getDashboard_shouldReturnStats() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        when(appointmentRepository.findByDoctorAndSlotDateOrderBySlotStartTimeAsc(eq(doctor), any(LocalDate.class)))
                .thenReturn(List.of(Appointment.builder().id(1L).build()));
        when(appointmentRepository.countByDoctor(doctor)).thenReturn(5L);
        when(appointmentRepository.countByDoctorAndStatus(doctor, AppointmentStatus.COMPLETED)).thenReturn(3L);
        when(slotRepository.countByDoctorAndIsBookedFalse(doctor)).thenReturn(2L);

        DoctorDashboardResponse response = doctorCabinetService.getDashboard(authentication);

        assertEquals(1L, response.appointmentsToday());
        assertEquals(5L, response.totalAppointments());
        assertEquals(3L, response.completedAppointments());
        assertEquals(2L, response.activeSlots());
        assertEquals(4.5, response.rating());
        assertEquals(10, response.totalRatings());
    }

    @Test
    void createSlot_shouldSucceed() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        when(slotRepository.existsByDoctorAndDateAndStartTime(eq(doctor), any(LocalDate.class), any(LocalTime.class)))
                .thenReturn(false);
        Slot savedSlot = Slot.builder()
                .id(100L)
                .doctor(doctor)
                .date(LocalDate.of(2025, 6, 1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .isBooked(false)
                .isBlocked(false)
                .build();
        when(slotRepository.save(any(Slot.class))).thenReturn(savedSlot);

        UpsertSlotRequest request = new UpsertSlotRequest(
                LocalDate.of(2025, 6, 1),
                LocalTime.of(10, 0),
                LocalTime.of(10, 30),
                false
        );

        SlotResponse response = doctorCabinetService.createSlot(authentication, request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(1L, response.doctorId());
        assertEquals(LocalDate.of(2025, 6, 1), response.date());
        assertEquals(LocalTime.of(10, 0), response.startTime());
        assertEquals(LocalTime.of(10, 30), response.endTime());
        assertFalse(response.isBooked());
    }

    @Test
    void createSlot_shouldThrow_whenDuplicate() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        when(slotRepository.existsByDoctorAndDateAndStartTime(eq(doctor), any(LocalDate.class), any(LocalTime.class)))
                .thenReturn(true);

        UpsertSlotRequest request = new UpsertSlotRequest(
                LocalDate.of(2025, 6, 1),
                LocalTime.of(10, 0),
                LocalTime.of(10, 30),
                false
        );

        BusinessException ex = assertThrows(BusinessException.class,
                () -> doctorCabinetService.createSlot(authentication, request));
        assertEquals("DUPLICATE_SLOT", ex.getErrorCode());
    }

    @Test
    void createSlot_shouldThrow_whenEndTimeNotAfterStart() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));

        UpsertSlotRequest request = new UpsertSlotRequest(
                LocalDate.of(2025, 6, 1),
                LocalTime.of(10, 30),
                LocalTime.of(10, 0),
                false
        );

        BusinessException ex = assertThrows(BusinessException.class,
                () -> doctorCabinetService.createSlot(authentication, request));
        assertEquals("INVALID_SLOT_TIME", ex.getErrorCode());
    }

    @Test
    void updateSlot_shouldSucceed() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        Slot slot = Slot.builder()
                .id(100L)
                .doctor(doctor)
                .date(LocalDate.of(2025, 6, 1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .isBooked(false)
                .isBlocked(false)
                .build();
        when(slotRepository.findById(100L)).thenReturn(Optional.of(slot));
        when(slotRepository.save(any(Slot.class))).thenReturn(slot);

        UpsertSlotRequest request = new UpsertSlotRequest(
                LocalDate.of(2025, 6, 2),
                LocalTime.of(11, 0),
                LocalTime.of(11, 30),
                false
        );

        SlotResponse response = doctorCabinetService.updateSlot(authentication, 100L, request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(LocalDate.of(2025, 6, 2), response.date());
    }

    @Test
    void updateSlot_shouldThrow_whenSlotNotFound() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        when(slotRepository.findById(100L)).thenReturn(Optional.empty());

        UpsertSlotRequest request = new UpsertSlotRequest(
                LocalDate.of(2025, 6, 1),
                LocalTime.of(10, 0),
                LocalTime.of(10, 30),
                false
        );

        BusinessException ex = assertThrows(BusinessException.class,
                () -> doctorCabinetService.updateSlot(authentication, 100L, request));
        assertEquals("SLOT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void updateSlot_shouldThrow_whenForbidden() {
        User otherUser = User.builder().id(99L).username("other").build();
        Doctor otherDoctor = Doctor.builder().id(99L).user(otherUser).build();
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        Slot slot = Slot.builder().id(100L).doctor(otherDoctor).build();
        when(slotRepository.findById(100L)).thenReturn(Optional.of(slot));

        UpsertSlotRequest request = new UpsertSlotRequest(
                LocalDate.of(2025, 6, 1),
                LocalTime.of(10, 0),
                LocalTime.of(10, 30),
                false
        );

        BusinessException ex = assertThrows(BusinessException.class,
                () -> doctorCabinetService.updateSlot(authentication, 100L, request));
        assertEquals("FORBIDDEN_SLOT_UPDATE", ex.getErrorCode());
    }

    @Test
    void updateSlot_shouldThrow_whenBooked() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        Slot slot = Slot.builder()
                .id(100L)
                .doctor(doctor)
                .isBooked(true)
                .build();
        when(slotRepository.findById(100L)).thenReturn(Optional.of(slot));

        UpsertSlotRequest request = new UpsertSlotRequest(
                LocalDate.of(2025, 6, 1),
                LocalTime.of(10, 0),
                LocalTime.of(10, 30),
                false
        );

        BusinessException ex = assertThrows(BusinessException.class,
                () -> doctorCabinetService.updateSlot(authentication, 100L, request));
        assertEquals("BOOKED_SLOT_UPDATE", ex.getErrorCode());
    }

    @Test
    void deleteSlot_shouldSucceed() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        Slot slot = Slot.builder().id(100L).doctor(doctor).isBooked(false).build();
        when(slotRepository.findById(100L)).thenReturn(Optional.of(slot));
        doNothing().when(slotRepository).delete(slot);

        assertDoesNotThrow(() -> doctorCabinetService.deleteSlot(authentication, 100L));
        verify(slotRepository).delete(slot);
    }

    @Test
    void deleteSlot_shouldThrow_whenSlotNotFound() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        when(slotRepository.findById(100L)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> doctorCabinetService.deleteSlot(authentication, 100L));
        assertEquals("SLOT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void deleteSlot_shouldThrow_whenBooked() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        Slot slot = Slot.builder().id(100L).doctor(doctor).isBooked(true).build();
        when(slotRepository.findById(100L)).thenReturn(Optional.of(slot));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> doctorCabinetService.deleteSlot(authentication, 100L));
        assertEquals("BOOKED_SLOT_DELETE", ex.getErrorCode());
    }

    @Test
    void getSlots_shouldReturnList() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        Slot slot = Slot.builder()
                .id(100L)
                .doctor(doctor)
                .date(LocalDate.of(2025, 6, 1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .isBooked(false)
                .isBlocked(false)
                .build();
        when(slotRepository.findByDoctorOrderByDateAscStartTimeAsc(doctor)).thenReturn(List.of(slot));

        List<SlotResponse> result = doctorCabinetService.getSlots(authentication);

        assertEquals(1, result.size());
        assertEquals(100L, result.get(0).id());
    }

    @Test
    void getProfile_shouldReturnMap() {
        Specialization spec = Specialization.builder().id(1L).name("Therapy").build();
        User user = User.builder().id(1L).username("doc1").fullName("Dr. Smith").email("dr@test.com").phone("+375111").build();
        Doctor doc = Doctor.builder()
                .id(1L).user(user).specialization(spec)
                .description("Desc").experienceYears(5).education("Edu")
                .rating(java.math.BigDecimal.valueOf(4.5)).totalRatings(10).build();
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doc));

        var result = doctorCabinetService.getProfile(authentication);

        assertEquals("Dr. Smith", result.get("fullName"));
        assertEquals("Therapy", result.get("specialization"));
        assertEquals(4.5, result.get("rating"));
        assertEquals(10, result.get("totalRatings"));
    }

    @Test
    void getMyPatients_shouldReturnDistinctPatients() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        User pu = User.builder().id(5L).fullName("Patient A").email("pa@test.com").phone("111").build();
        Patient pat = Patient.builder().id(5L).user(pu).dateOfBirth(java.time.LocalDate.of(1990, 1, 1)).build();
        Appointment apt = Appointment.builder().id(1L).patient(pat).doctor(doctor).build();
        when(appointmentRepository.findByDoctorOrderBySlotDateDescSlotStartTimeDesc(doctor)).thenReturn(List.of(apt));

        var result = doctorCabinetService.getMyPatients(authentication);

        assertEquals(1, result.size());
        assertEquals("Patient A", result.get(0).get("fullName"));
    }

    @Test
    void getNotifications_shouldReturnList() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        UserNotification notif = UserNotification.builder()
                .id(1L)
                .user(doctorUser)
                .type(com.medical.entity.NotificationType.APPOINTMENT_CONFIRMED)
                .title("Test")
                .message("Msg")
                .isRead(false)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        when(userNotificationRepository.findByUserOrderByCreatedAtDesc(doctorUser)).thenReturn(List.of(notif));

        var result = doctorCabinetService.getNotifications(authentication);

        assertEquals(1, result.size());
        assertEquals("Test", result.get(0).get("title"));
    }

    @Test
    void setNotificationRead_shouldUpdateStatus() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        UserNotification notif = UserNotification.builder()
                .id(1L)
                .user(doctorUser)
                .type(com.medical.entity.NotificationType.APPOINTMENT_CONFIRMED)
                .title("Test")
                .message("Msg")
                .isRead(false)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        when(userNotificationRepository.findById(1L)).thenReturn(Optional.of(notif));
        when(userNotificationRepository.save(any(UserNotification.class))).thenReturn(notif);

        var result = doctorCabinetService.setNotificationRead(authentication, 1L, true);

        assertEquals(true, result.get("isRead"));
    }

    @Test
    void deleteNotification_shouldSucceed() {
        when(authentication.getName()).thenReturn("doc1");
        when(doctorRepository.findByUserUsername("doc1")).thenReturn(Optional.of(doctor));
        UserNotification notif = UserNotification.builder().id(1L).user(doctorUser).build();
        when(userNotificationRepository.findById(1L)).thenReturn(Optional.of(notif));
        doNothing().when(userNotificationRepository).delete(notif);

        assertDoesNotThrow(() -> doctorCabinetService.deleteNotification(authentication, 1L));
        verify(userNotificationRepository).delete(notif);
    }
}
