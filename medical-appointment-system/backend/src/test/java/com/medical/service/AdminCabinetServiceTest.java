package com.medical.service;

import com.medical.dto.admin.AdminDashboardResponse;
import com.medical.dto.admin.UserResponse;
import com.medical.dto.common.SpecializationResponse;
import com.medical.dto.common.SymptomResponse;
import com.medical.entity.*;
import com.medical.exception.BusinessException;
import com.medical.repository.*;
import com.medical.service.integration.AppointmentIntegrationService;
import com.medical.service.integration.EmailNotificationService;
import com.medical.service.mapping.AppointmentMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminCabinetServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private SlotRepository slotRepository;
    @Mock
    private SymptomRepository symptomRepository;
    @Mock
    private SpecializationRepository specializationRepository;
    @Mock
    private RescheduleRequestRepository rescheduleRequestRepository;
    @Mock
    private UserNotificationRepository userNotificationRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AppointmentIntegrationService appointmentIntegrationService;
    @Mock
    private AppointmentMapper appointmentMapper;
    @Mock
    private EmailNotificationService emailNotificationService;

    @InjectMocks
    private AdminCabinetService adminCabinetService;

    private User adminUser;
    private User patientUser;
    private User doctorUser;

    @BeforeEach
    void setUp() {
        adminUser = User.builder().id(1L).username("admin").fullName("Admin").role(Role.ADMIN).build();
        patientUser = User.builder().id(2L).username("patient1").fullName("Patient One").email("p1@test.com").phone("+375111111111").role(Role.PATIENT).isBlocked(false).build();
        doctorUser = User.builder().id(3L).username("doctor1").fullName("Doctor One").email("d1@test.com").role(Role.DOCTOR).isBlocked(false).build();
    }

    @Test
    void getDashboard_shouldReturnStats() {
        when(userRepository.count()).thenReturn(10L);
        when(userRepository.countByRole(Role.DOCTOR)).thenReturn(3L);
        when(userRepository.countByRole(Role.PATIENT)).thenReturn(6L);
        when(appointmentRepository.count()).thenReturn(20L);
        when(appointmentRepository.countByStatus(AppointmentStatus.SCHEDULED)).thenReturn(8L);
        when(appointmentRepository.countByStatus(AppointmentStatus.COMPLETED)).thenReturn(10L);

        AdminDashboardResponse response = adminCabinetService.getDashboard();

        assertEquals(10L, response.totalUsers());
        assertEquals(3L, response.totalDoctors());
        assertEquals(6L, response.totalPatients());
        assertEquals(20L, response.totalAppointments());
        assertEquals(8L, response.scheduledAppointments());
        assertEquals(10L, response.completedAppointments());
    }

    @Test
    void getUsers_shouldReturnAll_whenNoFilter() {
        when(userRepository.findAll()).thenReturn(List.of(adminUser, patientUser, doctorUser));

        List<UserResponse> result = adminCabinetService.getUsers(null, null);

        assertEquals(3, result.size());
        assertTrue(result.stream().anyMatch(u -> u.id().equals(2L)));
    }

    @Test
    void getUsers_shouldFilterByRole() {
        when(userRepository.findAll()).thenReturn(List.of(adminUser, patientUser, doctorUser));

        List<UserResponse> result = adminCabinetService.getUsers(null, Role.PATIENT);

        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).id());
    }

    @Test
    void getUsers_shouldFilterBySearch() {
        when(userRepository.findAll()).thenReturn(List.of(adminUser, patientUser, doctorUser));

        List<UserResponse> result = adminCabinetService.getUsers("Patient", null);

        assertEquals(1, result.size());
        assertEquals("Patient One", result.get(0).fullName());
    }

    @Test
    void getSpecializations_shouldReturnOrderedList() {
        Specialization spec1 = Specialization.builder().id(1L).name("Therapy").description("General therapy").build();
        Specialization spec2 = Specialization.builder().id(2L).name("Surgery").description("Surgery dept").build();
        when(specializationRepository.findAllByOrderByNameAsc()).thenReturn(List.of(spec1, spec2));

        List<SpecializationResponse> result = adminCabinetService.getSpecializations();

        assertEquals(2, result.size());
        assertEquals("Therapy", result.get(0).name());
        assertEquals("Surgery", result.get(1).name());
    }

    @Test
    void getSymptoms_shouldReturnAll_whenQueryBlank() {
        Symptom s1 = Symptom.builder().id(1L).name("Headache").description("Pain in head").isUrgent(false).build();
        when(symptomRepository.findAllByOrderByNameAsc()).thenReturn(List.of(s1));

        List<SymptomResponse> result = adminCabinetService.getSymptoms("   ");

        assertEquals(1, result.size());
        assertEquals("Headache", result.get(0).name());
    }

    @Test
    void getSymptoms_shouldFilterByQuery() {
        Symptom s1 = Symptom.builder().id(1L).name("Headache").description("Pain").isUrgent(false).build();
        when(symptomRepository.findByNameContainingIgnoreCaseOrderByNameAsc("head")).thenReturn(List.of(s1));

        List<SymptomResponse> result = adminCabinetService.getSymptoms("head");

        assertEquals(1, result.size());
    }

    @Test
    void setUserBlocked_shouldBlockUser() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(patientUser));
        when(userRepository.save(any(User.class))).thenReturn(patientUser);

        UserResponse result = adminCabinetService.setUserBlocked(2L, true);

        assertTrue(result.isBlocked());
    }

    @Test
    void setUserBlocked_shouldThrow_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> adminCabinetService.setUserBlocked(99L, true));
        assertEquals("USER_NOT_FOUND", ex.getErrorCode());
    }
}
