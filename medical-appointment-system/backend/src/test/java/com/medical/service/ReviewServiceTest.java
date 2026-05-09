package com.medical.service;

import com.medical.dto.patient.CreateReviewRequest;
import com.medical.dto.patient.ReviewResponse;
import com.medical.entity.*;
import com.medical.exception.BusinessException;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.DoctorRepository;
import com.medical.repository.ReviewRepository;
import com.medical.repository.UserNotificationRepository;
import com.medical.service.integration.EmailNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private UserNotificationRepository notificationRepository;
    @Mock
    private EmailNotificationService emailNotificationService;

    @InjectMocks
    private ReviewService reviewService;

    private User patientUser;
    private Patient patient;
    private Doctor doctor;
    private Appointment appointment;
    private Review savedReview;

    @BeforeEach
    void setUp() {
        patientUser = User.builder().id(1L).fullName("Patient Name").email("patient@test.com").build();
        patient = Patient.builder().id(1L).user(patientUser).build();
        User doctorUser = User.builder().id(2L).fullName("Doctor Name").email("doctor@test.com").build();
        doctor = Doctor.builder().id(2L).user(doctorUser).build();
        appointment = Appointment.builder()
                .id(10L)
                .patient(patient)
                .doctor(doctor)
                .status(AppointmentStatus.COMPLETED)
                .build();
        savedReview = Review.builder()
                .id(100L)
                .appointment(appointment)
                .doctor(doctor)
                .patient(patient)
                .rating(5)
                .comment("Great doctor")
                .build();
    }

    @Test
    void createReview_shouldSucceed() {
        CreateReviewRequest request = new CreateReviewRequest(10L, 5, "Great doctor");
        when(appointmentRepository.findById(10L)).thenReturn(Optional.of(appointment));
        when(reviewRepository.existsByAppointmentId(10L)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenReturn(savedReview);
        when(reviewRepository.calculateAverageRatingByDoctorId(2L)).thenReturn(4.5);
        when(reviewRepository.countByDoctorId(2L)).thenReturn(10L);
        when(doctorRepository.save(any(Doctor.class))).thenReturn(doctor);
        when(notificationRepository.save(any(UserNotification.class))).thenReturn(null);
        doNothing().when(emailNotificationService).sendEmail(any(), any(), any());

        ReviewResponse response = reviewService.createReview(1L, request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(5, response.rating());
        assertEquals("Great doctor", response.comment());
        verify(reviewRepository).save(any(Review.class));
        verify(doctorRepository).save(any(Doctor.class));
    }

    @Test
    void createReview_shouldThrow_whenAppointmentNotFound() {
        CreateReviewRequest request = new CreateReviewRequest(10L, 5, null);
        when(appointmentRepository.findById(10L)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reviewService.createReview(1L, request));
        assertEquals("APPOINTMENT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    void createReview_shouldThrow_whenUnauthorizedPatient() {
        CreateReviewRequest request = new CreateReviewRequest(10L, 5, null);
        when(appointmentRepository.findById(10L)).thenReturn(Optional.of(appointment));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reviewService.createReview(99L, request));
        assertEquals("UNAUTHORIZED", ex.getErrorCode());
    }

    @Test
    void createReview_shouldThrow_whenAppointmentNotCompleted() {
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        CreateReviewRequest request = new CreateReviewRequest(10L, 5, null);
        when(appointmentRepository.findById(10L)).thenReturn(Optional.of(appointment));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reviewService.createReview(1L, request));
        assertEquals("APPOINTMENT_NOT_COMPLETED", ex.getErrorCode());
    }

    @Test
    void createReview_shouldThrow_whenReviewAlreadyExists() {
        CreateReviewRequest request = new CreateReviewRequest(10L, 5, null);
        when(appointmentRepository.findById(10L)).thenReturn(Optional.of(appointment));
        when(reviewRepository.existsByAppointmentId(10L)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reviewService.createReview(1L, request));
        assertEquals("REVIEW_EXISTS", ex.getErrorCode());
    }

    @Test
    void getReviewsByDoctorId_shouldReturnList() {
        when(reviewRepository.findByDoctorIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(savedReview));

        List<ReviewResponse> result = reviewService.getReviewsByDoctorId(2L);

        assertEquals(1, result.size());
        assertEquals(100L, result.get(0).id());
    }

    @Test
    void getAllReviews_shouldReturnList() {
        when(reviewRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(savedReview));

        List<ReviewResponse> result = reviewService.getAllReviews();

        assertEquals(1, result.size());
    }
}
