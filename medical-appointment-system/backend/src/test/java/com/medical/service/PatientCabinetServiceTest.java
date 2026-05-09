package com.medical.service;

import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.patient.BookAppointmentRequest;
import com.medical.entity.*;
import com.medical.exception.BusinessException;
import com.medical.repository.*;
import com.medical.service.integration.AppointmentIntegrationService;
import com.medical.service.mapping.AppointmentMapper;
import com.medical.service.storage.AvatarStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

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
class PatientCabinetServiceTest {

    @Mock
    private PatientRepository patientRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private SlotRepository slotRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private MedicalRecordRepository medicalRecordRepository;
    @Mock
    private SymptomRepository symptomRepository;
    @Mock
    private SymptomSpecializationRepository symptomSpecializationRepository;
    @Mock
    private UserNotificationRepository userNotificationRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AvatarStorageService avatarStorageService;
    @Mock
    private AppointmentIntegrationService appointmentIntegrationService;
    @Mock
    private AppointmentMapper appointmentMapper;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private PatientCabinetService patientCabinetService;

    private Patient patient;
    private Doctor doctor;
    private Slot slot;
    private Appointment savedAppointment;

    @BeforeEach
    void setUp() {
        User user = User.builder().id(1L).username("patient1").build();
        patient = Patient.builder().id(10L).user(user).build();
        doctor = Doctor.builder().id(5L).user(User.builder().id(2L).fullName("Доктор").build()).build();
        slot = Slot.builder()
                .id(100L)
                .date(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .doctor(doctor)
                .isBooked(false)
                .isBlocked(false)
                .build();
        savedAppointment = Appointment.builder()
                .id(1000L)
                .patient(patient)
                .doctor(doctor)
                .slot(slot)
                .status(AppointmentStatus.SCHEDULED)
                .build();
    }

    @Test
    void bookAppointment_shouldReturnAppointmentResponse_whenValidRequest() {
        BookAppointmentRequest request = new BookAppointmentRequest(100L, "Боль в горле", Collections.emptyList());

        when(authentication.getName()).thenReturn("patient1");
        when(patientRepository.findByUserUsername("patient1")).thenReturn(Optional.of(patient));
        when(slotRepository.findByIdWithDoctor(100L)).thenReturn(Optional.of(slot));
        when(appointmentRepository.existsBySlotId(100L)).thenReturn(false);
        when(appointmentRepository.existsByPatientAndSlot(patient, slot)).thenReturn(false);
        when(appointmentRepository.findByPatientAndStatusInOrderBySlotDateAscSlotStartTimeAsc(
                eq(patient), anyList())).thenReturn(Collections.emptyList());
        when(slotRepository.save(any(Slot.class))).thenReturn(slot);
        when(appointmentRepository.save(any(Appointment.class))).thenReturn(savedAppointment);
        when(appointmentMapper.toResponse(savedAppointment)).thenReturn(
                new AppointmentResponse(1000L, null, null, null, null, null, null, null, null, AppointmentStatus.SCHEDULED, null, null, null, null, null));

        AppointmentResponse response = patientCabinetService.bookAppointment(authentication, request);

        assertNotNull(response);
        assertEquals(1000L, response.id());
        verify(slotRepository).save(argThat(s -> Boolean.TRUE.equals(s.getIsBooked())));
        verify(appointmentIntegrationService).handleAppointmentBooked(savedAppointment);
    }

    @Test
    void bookAppointment_shouldThrow_whenSlotInPast() {
        slot.setDate(LocalDate.now().minusDays(1));
        BookAppointmentRequest request = new BookAppointmentRequest(100L, null, null);

        when(authentication.getName()).thenReturn("patient1");
        when(patientRepository.findByUserUsername("patient1")).thenReturn(Optional.of(patient));
        when(slotRepository.findByIdWithDoctor(100L)).thenReturn(Optional.of(slot));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> patientCabinetService.bookAppointment(authentication, request));

        assertEquals("SLOT_IN_PAST", ex.getErrorCode());
    }

    @Test
    void bookAppointment_shouldThrow_whenSlotAlreadyBooked() {
        slot.setIsBooked(true);
        BookAppointmentRequest request = new BookAppointmentRequest(100L, null, null);

        when(authentication.getName()).thenReturn("patient1");
        when(patientRepository.findByUserUsername("patient1")).thenReturn(Optional.of(patient));
        when(slotRepository.findByIdWithDoctor(100L)).thenReturn(Optional.of(slot));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> patientCabinetService.bookAppointment(authentication, request));

        assertEquals("SLOT_NOT_AVAILABLE", ex.getErrorCode());
    }

    @Test
    void bookAppointment_shouldThrow_whenSlotAlreadyHasAppointment() {
        BookAppointmentRequest request = new BookAppointmentRequest(100L, null, null);

        when(authentication.getName()).thenReturn("patient1");
        when(patientRepository.findByUserUsername("patient1")).thenReturn(Optional.of(patient));
        when(slotRepository.findByIdWithDoctor(100L)).thenReturn(Optional.of(slot));
        when(appointmentRepository.existsBySlotId(100L)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> patientCabinetService.bookAppointment(authentication, request));

        assertEquals("SLOT_ALREADY_BOOKED", ex.getErrorCode());
    }

    @Test
    void bookAppointment_shouldThrow_whenPatientAlreadyBookedThisSlot() {
        BookAppointmentRequest request = new BookAppointmentRequest(100L, null, null);

        when(authentication.getName()).thenReturn("patient1");
        when(patientRepository.findByUserUsername("patient1")).thenReturn(Optional.of(patient));
        when(slotRepository.findByIdWithDoctor(100L)).thenReturn(Optional.of(slot));
        when(appointmentRepository.existsBySlotId(100L)).thenReturn(false);
        when(appointmentRepository.existsByPatientAndSlot(patient, slot)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> patientCabinetService.bookAppointment(authentication, request));

        assertEquals("ALREADY_BOOKED_THIS_SLOT", ex.getErrorCode());
    }

    @Test
    void bookAppointment_shouldThrow_whenTimeConflict() {
        BookAppointmentRequest request = new BookAppointmentRequest(100L, null, null);
        Slot existingSlot = Slot.builder()
                .date(slot.getDate())
                .startTime(slot.getStartTime())
                .build();
        Appointment existing = Appointment.builder().slot(existingSlot).build();

        when(authentication.getName()).thenReturn("patient1");
        when(patientRepository.findByUserUsername("patient1")).thenReturn(Optional.of(patient));
        when(slotRepository.findByIdWithDoctor(100L)).thenReturn(Optional.of(slot));
        when(appointmentRepository.existsBySlotId(100L)).thenReturn(false);
        when(appointmentRepository.existsByPatientAndSlot(patient, slot)).thenReturn(false);
        when(appointmentRepository.findByPatientAndStatusInOrderBySlotDateAscSlotStartTimeAsc(
                eq(patient), anyList())).thenReturn(List.of(existing));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> patientCabinetService.bookAppointment(authentication, request));

        assertEquals("APPOINTMENT_TIME_CONFLICT", ex.getErrorCode());
    }

    @Test
    void getMyAppointments_shouldReturnList() {
        when(authentication.getName()).thenReturn("patient1");
        when(patientRepository.findByUserUsername("patient1")).thenReturn(Optional.of(patient));
        Appointment apt = Appointment.builder().id(1L).patient(patient).doctor(doctor).slot(slot).status(AppointmentStatus.SCHEDULED).build();
        when(appointmentRepository.findByPatientAndStatusInOrderBySlotDateAscSlotStartTimeAsc(
                eq(patient), anyList())).thenReturn(List.of(apt));
        when(appointmentMapper.toResponse(apt)).thenReturn(
                new AppointmentResponse(1L, 100L, 1L, "Patient", 2L, "Dr. Smith",
                        LocalDate.of(2025, 6, 1), LocalTime.of(10, 0), LocalTime.of(10, 30),
                        AppointmentStatus.SCHEDULED, null, null, null, null, null));

        var result = patientCabinetService.getAppointments(authentication);

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).id());
    }

    @Test
    void getAppointments_shouldReturnEmptyList() {
        when(authentication.getName()).thenReturn("patient1");
        when(patientRepository.findByUserUsername("patient1")).thenReturn(Optional.of(patient));
        when(appointmentRepository.findByPatientOrderBySlotDateDescSlotStartTimeDesc(patient))
                .thenReturn(Collections.emptyList());

        var result = patientCabinetService.getAppointments(authentication);

        assertTrue(result.isEmpty());
    }

}
