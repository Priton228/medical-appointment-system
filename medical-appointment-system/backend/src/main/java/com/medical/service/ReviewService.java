package com.medical.service;

import com.medical.dto.patient.CreateReviewRequest;
import com.medical.dto.patient.ReviewResponse;
import com.medical.entity.Appointment;
import com.medical.entity.AppointmentStatus;
import com.medical.entity.Doctor;
import com.medical.entity.NotificationType;
import com.medical.entity.Review;
import com.medical.entity.User;
import com.medical.entity.UserNotification;
import com.medical.exception.BusinessException;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.DoctorRepository;
import com.medical.repository.ReviewRepository;
import com.medical.repository.UserNotificationRepository;
import com.medical.service.integration.EmailNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final UserNotificationRepository notificationRepository;
    private final EmailNotificationService emailNotificationService;

    @Transactional
    public ReviewResponse createReview(Long patientId, CreateReviewRequest request) {
        Appointment appointment = appointmentRepository.findById(request.appointmentId())
                .orElseThrow(() -> new BusinessException("Appointment not found", "APPOINTMENT_NOT_FOUND"));

        if (!appointment.getPatient().getId().equals(patientId)) {
            throw new BusinessException("You can only review your own appointments", "UNAUTHORIZED");
        }

        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new BusinessException("Can only review completed appointments", "APPOINTMENT_NOT_COMPLETED");
        }

        if (reviewRepository.existsByAppointmentId(request.appointmentId())) {
            throw new BusinessException("Review already exists for this appointment", "REVIEW_EXISTS");
        }

        Doctor doctor = appointment.getDoctor();

        Review review = Review.builder()
                .appointment(appointment)
                .doctor(doctor)
                .patient(appointment.getPatient())
                .rating(request.rating())
                .comment(request.comment())
                .build();

        Review saved = reviewRepository.save(review);

        updateDoctorRating(doctor);

        createReviewNotification(doctor.getUser(), appointment.getPatient().getUser().getFullName(), request.rating());

        emailNotificationService.sendEmail(
                doctor.getUser().getEmail(),
                "Новый отзыв от пациента",
                "Пациент " + appointment.getPatient().getUser().getFullName() + " оставил(а) вам оценку " + request.rating() + " звёзд.\n\nКомментарий: " + (request.comment() != null ? request.comment() : "Нет комментария")
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByDoctorId(Long doctorId) {
        return reviewRepository.findByDoctorIdOrderByCreatedAtDesc(doctorId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getAllReviews() {
        return reviewRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReviewResponse getReviewByAppointmentId(Long appointmentId) {
        return reviewRepository.findByAppointmentId(appointmentId)
                .map(this::toResponse)
                .orElse(null);
    }

    private void updateDoctorRating(Doctor doctor) {
        Double avgRating = reviewRepository.calculateAverageRatingByDoctorId(doctor.getId());
        Long totalCount = reviewRepository.countByDoctorId(doctor.getId());

        if (avgRating != null) {
            doctor.setRating(BigDecimal.valueOf(avgRating).setScale(1, RoundingMode.HALF_UP));
        }
        doctor.setTotalRatings(totalCount.intValue());

        doctorRepository.save(doctor);
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getAppointment().getId(),
                review.getPatient().getUser().getFullName(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }

    private void createReviewNotification(User doctorUser, String patientName, Integer rating) {
        UserNotification notification = UserNotification.builder()
                .user(doctorUser)
                .type(NotificationType.REVIEW_RECEIVED)
                .title("Новый отзыв")
                .message(patientName + " оставил(а) вам оценку " + rating + " звёзд")
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }
}
