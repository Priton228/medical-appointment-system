package com.medical.service;

import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.RescheduleRequestResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.doctor.DoctorDashboardResponse;
import com.medical.dto.doctor.RescheduleAppointmentRequest;
import com.medical.dto.doctor.UpdateAppointmentStatusRequest;
import com.medical.dto.doctor.UpsertSlotRequest;
import com.medical.entity.Appointment;
import com.medical.entity.AppointmentStatus;
import com.medical.entity.Doctor;
import com.medical.entity.Patient;
import com.medical.entity.NotificationType;
import com.medical.entity.RescheduleRequest;
import com.medical.entity.RescheduleRequestStatus;
import com.medical.entity.Role;
import com.medical.entity.Slot;
import com.medical.entity.User;
import com.medical.entity.UserNotification;
import com.medical.exception.BusinessException;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.DoctorRepository;
import com.medical.repository.RescheduleRequestRepository;
import com.medical.repository.SlotRepository;
import com.medical.repository.UserNotificationRepository;
import com.medical.repository.UserRepository;
import com.medical.service.integration.AppointmentIntegrationService;
import com.medical.service.integration.EmailNotificationService;
import com.medical.service.mapping.AppointmentMapper;
import com.medical.service.storage.AvatarStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DoctorCabinetService {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final SlotRepository slotRepository;
    private final UserRepository userRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final AvatarStorageService avatarStorageService;
    private final AppointmentIntegrationService appointmentIntegrationService;
    private final RescheduleRequestRepository rescheduleRequestRepository;
    private final AppointmentMapper appointmentMapper;
    private final EmailNotificationService emailNotificationService;

    @Transactional(readOnly = true)
    public DoctorDashboardResponse getDashboard(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        long todayAppointments = appointmentRepository.findByDoctorAndSlotDateOrderBySlotStartTimeAsc(doctor, LocalDate.now()).size();
        long totalAppointments = appointmentRepository.countByDoctor(doctor);
        long completedAppointments = appointmentRepository.countByDoctorAndStatus(doctor, AppointmentStatus.COMPLETED);
        long activeSlots = slotRepository.countByDoctorAndIsBookedFalse(doctor);
        return new DoctorDashboardResponse(
                todayAppointments,
                totalAppointments,
                completedAppointments,
                activeSlots,
                doctor.getRating() != null ? doctor.getRating().doubleValue() : null,
                doctor.getTotalRatings()
        );
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getTodayAppointments(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        return appointmentRepository.findByDoctorAndSlotDateOrderBySlotStartTimeAsc(doctor, LocalDate.now())
                .stream()
                .map(appointmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAllAppointments(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        return appointmentRepository.findByDoctorOrderBySlotDateDescSlotStartTimeDesc(doctor).stream()
                .map(appointmentMapper::toResponse)
                .toList();
    }

    @Transactional
    public AppointmentResponse updateAppointmentStatus(Authentication authentication, Long appointmentId, UpdateAppointmentStatusRequest request) {
        Doctor doctor = getCurrentDoctor(authentication);
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .orElseThrow(() -> new BusinessException("Appointment not found", "APPOINTMENT_NOT_FOUND"));
        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Cannot edit another doctor's appointment", "FORBIDDEN_APPOINTMENT_UPDATE");
        }

        AppointmentStatus newStatus = request.status();
        if (newStatus == AppointmentStatus.RESCHEDULED) {
            throw new BusinessException("Use dedicated reschedule endpoint", "USE_RESCHEDULE_ENDPOINT");
        }

        if (newStatus == AppointmentStatus.COMPLETED) {
            if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
                throw new BusinessException("Cannot complete cancelled appointment", "INVALID_STATUS_TRANSITION");
            }
            appointment.setStatus(AppointmentStatus.COMPLETED);
            appointment.setDoctorNotes(trimToNull(request.doctorNotes()));
            appointment.setDiagnosis(trimToNull(request.diagnosis()));
            appointment.setTreatmentRecommendations(trimToNull(request.treatmentRecommendations()));
            Appointment saved = appointmentRepository.save(appointment);
            appointmentIntegrationService.handleAppointmentCompleted(saved);
            return appointmentMapper.toResponse(saved);
        }

        if (newStatus == AppointmentStatus.CANCELLED) {
            if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
                throw new BusinessException("Нельзя отменить завершённый приём", "INVALID_STATUS_TRANSITION");
            }
            // Проверка: приём в будущем (врач не может отменить прошедший)
            LocalDateTime appointmentDateTime = LocalDateTime.of(
                    appointment.getSlot().getDate(), appointment.getSlot().getStartTime());
            if (appointmentDateTime.isBefore(LocalDateTime.now())) {
                throw new BusinessException("Нельзя отменить прошедший приём", "APPOINTMENT_IN_PAST");
            }
            releaseSlot(appointment.getSlot());
            appointment.setStatus(AppointmentStatus.CANCELLED);
            appointment.setCancelledAt(LocalDateTime.now());
            appointment.setCancelledBy("DOCTOR");
            appointment.setCancelReason(trimToNull(request.cancelReason()) != null ? request.cancelReason().trim() : "Cancelled by doctor");
            Appointment saved = appointmentRepository.save(appointment);
            appointmentIntegrationService.handleAppointmentCancelled(saved, "doctor");
            return appointmentMapper.toResponse(saved);
        }

        if (List.of(AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.MISSED).contains(newStatus)) {
            if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
                throw new BusinessException("Invalid status transition", "INVALID_STATUS_TRANSITION");
            }
            appointment.setStatus(newStatus);
            return appointmentMapper.toResponse(appointmentRepository.save(appointment));
        }

        throw new BusinessException("Invalid status", "INVALID_STATUS");
    }

    @Transactional
    public AppointmentResponse rescheduleAppointment(Authentication authentication, Long appointmentId, RescheduleAppointmentRequest request) {
        Doctor doctor = getCurrentDoctor(authentication);
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));
        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Нельзя перенести чужую запись", "FORBIDDEN_APPOINTMENT_UPDATE");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BusinessException("Нельзя перенести отменённый или завершённый приём", "APPOINTMENT_NOT_RESCHEDULABLE");
        }

        Slot newSlot = slotRepository.findByIdWithDoctor(request.newSlotId())
                .orElseThrow(() -> new BusinessException("Слот не найден", "SLOT_NOT_FOUND"));

        // Проверка: новый слот в будущем
        LocalDateTime newSlotDateTime = LocalDateTime.of(newSlot.getDate(), newSlot.getStartTime());
        if (newSlotDateTime.isBefore(LocalDateTime.now())) {
            throw new BusinessException("Нельзя перенести на прошедшую дату/время", "SLOT_IN_PAST");
        }

        if (Boolean.TRUE.equals(newSlot.getIsBooked()) || Boolean.TRUE.equals(newSlot.getIsBlocked())) {
            throw new BusinessException("Слот недоступен для записи", "SLOT_NOT_AVAILABLE");
        }
        if (appointmentRepository.existsBySlotId(newSlot.getId())) {
            throw new BusinessException("Слот уже занят другим пациентом", "SLOT_HAS_APPOINTMENT");
        }

        Patient patient = appointment.getPatient();
        Slot oldSlot = appointment.getSlot();
        releaseSlot(oldSlot);

        newSlot.setIsBooked(true);
        newSlot.setBookedByPatient(patient);
        newSlot.setBookedAt(LocalDateTime.now());
        slotRepository.save(newSlot);

        appointment.setSlot(newSlot);
        appointment.setDoctor(newSlot.getDoctor());
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        appointment.setReminderSentAt(null);
        Appointment saved = appointmentRepository.save(appointment);

        appointmentIntegrationService.handleAppointmentRescheduled(saved);
        return appointmentMapper.toResponse(saved);
    }

    @Transactional
    public AppointmentResponse completeAppointment(Authentication authentication, Long appointmentId, Map<String, String> request) {
        Doctor doctor = getCurrentDoctor(authentication);
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));
        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Нельзя завершить чужую запись", "FORBIDDEN_APPOINTMENT_UPDATE");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BusinessException("Нельзя завершить отменённый или уже завершённый приём", "APPOINTMENT_NOT_COMPLETABLE");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setDoctorNotes(request.get("doctorNotes"));
        appointment.setDiagnosis(request.get("diagnosis"));
        appointment.setTreatmentRecommendations(request.get("treatmentRecommendations"));

        Appointment saved = appointmentRepository.save(appointment);
        appointmentIntegrationService.handleAppointmentCompleted(saved);
        return appointmentMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SlotResponse> getSlots(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        return slotRepository.findByDoctorOrderByDateAscStartTimeAsc(doctor)
                .stream()
                .map(this::toSlotResponse)
                .toList();
    }

    @Transactional
    public SlotResponse createSlot(Authentication authentication, UpsertSlotRequest request) {
        Doctor doctor = getCurrentDoctor(authentication);
        validateSlotTime(request);
        if (slotRepository.existsByDoctorAndDateAndStartTime(doctor, request.date(), request.startTime())) {
            throw new BusinessException("Slot already exists", "DUPLICATE_SLOT");
        }

        Slot slot = Slot.builder()
                .doctor(doctor)
                .date(request.date())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .isBooked(false)
                .isBlocked(false)
                .build();
        return toSlotResponse(slotRepository.save(slot));
    }

    @Transactional
    public SlotResponse updateSlot(Authentication authentication, Long slotId, UpsertSlotRequest request) {
        Doctor doctor = getCurrentDoctor(authentication);
        validateSlotTime(request);
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new BusinessException("Slot not found", "SLOT_NOT_FOUND"));
        if (!slot.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Cannot edit another doctor's slot", "FORBIDDEN_SLOT_UPDATE");
        }
        if (Boolean.TRUE.equals(slot.getIsBooked())) {
            throw new BusinessException("Booked slot cannot be updated", "BOOKED_SLOT_UPDATE");
        }
        slot.setDate(request.date());
        slot.setStartTime(request.startTime());
        slot.setEndTime(request.endTime());
        return toSlotResponse(slotRepository.save(slot));
    }

    @Transactional
    public void deleteSlot(Authentication authentication, Long slotId) {
        Doctor doctor = getCurrentDoctor(authentication);
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new BusinessException("Slot not found", "SLOT_NOT_FOUND"));
        if (!slot.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Cannot delete another doctor's slot", "FORBIDDEN_SLOT_DELETE");
        }
        if (Boolean.TRUE.equals(slot.getIsBooked())) {
            throw new BusinessException("Booked slot cannot be deleted", "BOOKED_SLOT_DELETE");
        }
        slotRepository.delete(slot);
    }

    private void releaseSlot(Slot slot) {
        slot.setIsBooked(false);
        slot.setBookedByPatient(null);
        slot.setBookedAt(null);
        slotRepository.save(slot);
    }

    private Doctor getCurrentDoctor(Authentication authentication) {
        return doctorRepository.findByUserUsername(authentication.getName())
                .orElseThrow(() -> new BusinessException("Doctor profile not found", "DOCTOR_NOT_FOUND"));
    }

    public Long getDoctorId(Authentication authentication) {
        return getCurrentDoctor(authentication).getId();
    }

    // Reschedule request methods
    @Transactional
    public RescheduleRequestResponse createRescheduleRequest(Authentication authentication, Long appointmentId, Long newSlotId) {
        Doctor doctor = getCurrentDoctor(authentication);
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));
        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Нельзя запросить перенос чужой записи", "FORBIDDEN_APPOINTMENT_UPDATE");
        }
        Slot targetSlot = slotRepository.findByIdWithDoctor(newSlotId)
                .orElseThrow(() -> new BusinessException("Слот не найден", "SLOT_NOT_FOUND"));

        // Проверка: новый слот в будущем
        LocalDateTime targetDateTime = LocalDateTime.of(targetSlot.getDate(), targetSlot.getStartTime());
        if (targetDateTime.isBefore(LocalDateTime.now())) {
            throw new BusinessException("Нельзя запросить перенос на прошедшую дату/время", "SLOT_IN_PAST");
        }

        if (Boolean.TRUE.equals(targetSlot.getIsBooked()) || Boolean.TRUE.equals(targetSlot.getIsBlocked())) {
            throw new BusinessException("Выбранный слот недоступен", "SLOT_NOT_AVAILABLE");
        }
        if (appointmentRepository.existsBySlotId(targetSlot.getId())) {
            throw new BusinessException("Выбранный слот уже занят", "SLOT_HAS_APPOINTMENT");
        }

        RescheduleRequest request = RescheduleRequest.builder()
                .appointment(appointment)
                .requestedByDoctor(doctor)
                .targetSlot(targetSlot)
                .status(RescheduleRequestStatus.PENDING)
                .build();
        RescheduleRequest saved = rescheduleRequestRepository.save(request);
        notifyAdminsNewRescheduleRequest(saved, appointment, doctor);
        return toRescheduleRequestResponse(saved);
    }

    private void notifyAdminsNewRescheduleRequest(RescheduleRequest saved, Appointment appointment, Doctor doctor) {
        Slot current = appointment.getSlot();
        Slot target = saved.getTargetSlot();
        String message = String.format(
                "Врач %s запросил перенос приёма пациента %s: %s %s → %s %s",
                doctor.getUser().getFullName(),
                appointment.getPatient().getUser().getFullName(),
                current.getDate(),
                current.getStartTime(),
                target.getDate(),
                target.getStartTime()
        );
        String emailBody = String.format(
                "Новый запрос на перенос приёма:\n\nВрач: %s\nПациент: %s\n\nТекущий слот: %s %s\nНовый слот: %s %s\n\nПожалуйста, рассмотрите запрос в административной панели.",
                doctor.getUser().getFullName(),
                appointment.getPatient().getUser().getFullName(),
                current.getDate(),
                current.getStartTime(),
                target.getDate(),
                target.getStartTime()
        );
        for (User admin : userRepository.findAllByRole(Role.ADMIN)) {
            userNotificationRepository.save(UserNotification.builder()
                    .user(admin)
                    .type(NotificationType.RESCHEDULE_REQUEST_PENDING)
                    .title("Запрос на перенос приёма")
                    .message(message)
                    .isRead(false)
                    .build());
            // Email уведомление админу
            emailNotificationService.sendEmail(
                    admin.getEmail(),
                    "Запрос на перенос приёма",
                    emailBody
            );
        }
    }

    @Transactional(readOnly = true)
    public List<RescheduleRequestResponse> getRescheduleRequests(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        return rescheduleRequestRepository.findByRequestedByDoctorOrderByCreatedAtDesc(doctor)
                .stream()
                .map(this::toRescheduleRequestResponse)
                .toList();
    }

    private RescheduleRequestResponse toRescheduleRequestResponse(RescheduleRequest request) {
        Appointment appointment = request.getAppointment();
        Slot currentSlot = appointment.getSlot();
        Slot targetSlot = request.getTargetSlot();
        return new RescheduleRequestResponse(
                request.getId(),
                appointment.getId(),
                appointment.getPatient().getUser().getFullName(),
                appointment.getDoctor().getUser().getFullName(),
                currentSlot.getDate().toString(),
                currentSlot.getStartTime().toString(),
                currentSlot.getEndTime().toString(),
                targetSlot.getDate().toString(),
                targetSlot.getStartTime().toString(),
                targetSlot.getEndTime().toString(),
                request.getStatus(),
                request.getAdminComment(),
                request.getCreatedAt(),
                request.getProcessedAt()
        );
    }

    private SlotResponse toSlotResponse(Slot slot) {
        return new SlotResponse(
                slot.getId(),
                slot.getDoctor().getId(),
                slot.getDate(),
                slot.getStartTime(),
                slot.getEndTime(),
                slot.getIsBooked(),
                slot.getIsBlocked()
        );
    }

    private void validateSlotTime(UpsertSlotRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new BusinessException("End time must be after start time", "INVALID_SLOT_TIME");
        }
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    // Profile methods
    @Transactional(readOnly = true)
    public Map<String, Object> getProfile(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        return Map.of(
                "fullName", doctor.getUser().getFullName(),
                "email", doctor.getUser().getEmail(),
                "phone", doctor.getUser().getPhone() != null ? doctor.getUser().getPhone() : "",
                "avatarUrl", doctor.getUser().getAvatarUrl() != null ? doctor.getUser().getAvatarUrl() : "",
                "specialization", doctor.getSpecialization() != null ? doctor.getSpecialization().getName() : "",
                "description", doctor.getDescription() != null ? doctor.getDescription() : "",
                "experienceYears", doctor.getExperienceYears() != null ? doctor.getExperienceYears() : 0,
                "education", doctor.getEducation() != null ? doctor.getEducation() : "",
                "rating", doctor.getRating() != null ? doctor.getRating() : 0.0,
                "totalRatings", doctor.getTotalRatings() != null ? doctor.getTotalRatings() : 0
        );
    }

    @Transactional
    public Map<String, Object> updateProfile(Authentication authentication, Map<String, Object> request) {
        Doctor doctor = getCurrentDoctor(authentication);
        User user = doctor.getUser();

        if (request.containsKey("fullName")) {
            user.setFullName((String) request.get("fullName"));
        }
        if (request.containsKey("email")) {
            user.setEmail((String) request.get("email"));
        }
        if (request.containsKey("phone")) {
            user.setPhone((String) request.get("phone"));
        }
        if (request.containsKey("experienceYears")) {
            doctor.setExperienceYears((Integer) request.get("experienceYears"));
        }
        if (request.containsKey("education")) {
            doctor.setEducation((String) request.get("education"));
        }
        if (request.containsKey("description")) {
            doctor.setDescription((String) request.get("description"));
        }

        return getProfile(authentication);
    }

    @Transactional
    public Map<String, Object> uploadAvatar(Authentication authentication, String avatarUrl) {
        Doctor doctor = getCurrentDoctor(authentication);
        User user = doctor.getUser();
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);
        return getProfile(authentication);
    }

    @Transactional
    public void changePassword(Authentication authentication, String currentPassword, String newPassword) {
        // TODO: Implement password change
    }

    // Notification methods
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getNotifications(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        User user = doctor.getUser();
        return userNotificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(notification -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", notification.getId());
                    map.put("type", notification.getType().name());
                    map.put("title", notification.getTitle());
                    map.put("message", notification.getMessage());
                    map.put("isRead", notification.getIsRead());
                    map.put("createdAt", notification.getCreatedAt().toString());
                    return map;
                })
                .toList();
    }

    @Transactional
    public Map<String, Object> setNotificationRead(Authentication authentication, Long notificationId, boolean read) {
        Doctor doctor = getCurrentDoctor(authentication);
        User user = doctor.getUser();
        UserNotification notification = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException("Notification not found", "NOTIFICATION_NOT_FOUND"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Cannot update another user's notification", "FORBIDDEN_NOTIFICATION_UPDATE");
        }
        notification.setIsRead(read);
        UserNotification saved = userNotificationRepository.save(notification);
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", saved.getId());
        map.put("type", saved.getType().name());
        map.put("title", saved.getTitle());
        map.put("message", saved.getMessage());
        map.put("isRead", saved.getIsRead());
        map.put("createdAt", saved.getCreatedAt().toString());
        return map;
    }

    @Transactional
    public void deleteNotification(Authentication authentication, Long notificationId) {
        Doctor doctor = getCurrentDoctor(authentication);
        User user = doctor.getUser();
        UserNotification notification = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException("Notification not found", "NOTIFICATION_NOT_FOUND"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Cannot delete another user's notification", "FORBIDDEN_NOTIFICATION_DELETE");
        }
        userNotificationRepository.delete(notification);
    }

    // Patient management methods
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyPatients(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        List<Appointment> appointments = appointmentRepository.findByDoctorOrderBySlotDateDescSlotStartTimeDesc(doctor);
        return appointments.stream()
                .map(Appointment::getPatient)
                .distinct()
                .map(this::toPatientSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPatientById(Authentication authentication, Long patientId) {
        Doctor doctor = getCurrentDoctor(authentication);
        Patient patient = appointmentRepository.findByDoctorOrderBySlotDateDescSlotStartTimeDesc(doctor).stream()
                .map(Appointment::getPatient)
                .filter(p -> p.getId().equals(patientId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Patient not found", "PATIENT_NOT_FOUND"));
        return toPatientDetail(patient);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getPatientAppointments(Authentication authentication, Long patientId) {
        Doctor doctor = getCurrentDoctor(authentication);
        return appointmentRepository.findByDoctorOrderBySlotDateDescSlotStartTimeDesc(doctor).stream()
                .filter(a -> a.getPatient().getId().equals(patientId))
                .map(appointmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPatientMedicalRecords(Authentication authentication, Long patientId) {
        Doctor doctor = getCurrentDoctor(authentication);
        List<Appointment> appointments = appointmentRepository.findByDoctorOrderBySlotDateDescSlotStartTimeDesc(doctor).stream()
                .filter(a -> a.getPatient().getId().equals(patientId) && a.getStatus() == AppointmentStatus.COMPLETED)
                .toList();

        return appointments.stream()
                .map(apt -> {
                    Map<String, Object> record = new java.util.HashMap<>();
                    record.put("id", apt.getId());
                    record.put("date", apt.getSlot().getDate().toString());
                    record.put("diagnosis", apt.getDiagnosis());
                    record.put("treatment", apt.getTreatmentRecommendations());
                    record.put("notes", apt.getDoctorNotes());
                    record.put("createdAt", apt.getSlot().getDate().toString());
                    record.put("symptomsDescription", apt.getSymptomsDescription());
                    if (apt.getReportedSymptoms() != null && !apt.getReportedSymptoms().isEmpty()) {
                        record.put("reportedSymptoms", apt.getReportedSymptoms().stream()
                                .map(s -> Map.of("id", s.getId(), "name", s.getName()))
                                .toList());
                    } else {
                        record.put("reportedSymptoms", List.of());
                    }
                    return record;
                })
                .toList();
    }

    private Map<String, Object> toPatientSummary(Patient patient) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", patient.getId());
        map.put("fullName", patient.getUser().getFullName());
        map.put("email", patient.getUser().getEmail());
        map.put("phone", patient.getUser().getPhone());
        map.put("birthDate", patient.getDateOfBirth() != null ? patient.getDateOfBirth().toString() : null);
        map.put("avatarUrl", patient.getUser().getAvatarUrl());
        return map;
    }

    private Map<String, Object> toPatientDetail(Patient patient) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", patient.getId());
        map.put("fullName", patient.getUser().getFullName());
        map.put("email", patient.getUser().getEmail());
        map.put("phone", patient.getUser().getPhone());
        map.put("birthDate", patient.getDateOfBirth() != null ? patient.getDateOfBirth().toString() : null);
        map.put("heightCm", patient.getHeightCm());
        map.put("weightKg", patient.getWeightKg());
        map.put("bloodType", patient.getBloodType());
        map.put("allergies", patient.getAllergies());
        map.put("chronicConditions", patient.getChronicDiseases());
        map.put("avatarUrl", patient.getUser().getAvatarUrl());
        return map;
    }
}
