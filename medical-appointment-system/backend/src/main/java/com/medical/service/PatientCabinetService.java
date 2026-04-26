package com.medical.service;

import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.DoctorResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.common.SymptomResponse;
import com.medical.dto.patient.*;
import com.medical.entity.*;
import com.medical.exception.BusinessException;
import com.medical.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientCabinetService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final SlotRepository slotRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final SymptomRepository symptomRepository;
    private final SymptomSpecializationRepository symptomSpecializationRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PatientDashboardResponse getDashboard(Authentication authentication) {
        Patient patient = getCurrentPatient(authentication);
        long totalAppointments = appointmentRepository.countByPatient(patient);
        long activeAppointments = appointmentRepository.countByPatientAndStatusIn(
                patient, List.of(AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED)
        );
        long medicalRecords = medicalRecordRepository.findByPatientOrderByCreatedAtDesc(patient).size();
        List<AppointmentResponse> upcomingAppointments = appointmentRepository
                .findTop5ByPatientAndStatusInOrderBySlotDateAscSlotStartTimeAsc(
                        patient, List.of(AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED)
                )
                .stream()
                .map(this::toAppointmentResponse)
                .toList();
        return new PatientDashboardResponse(totalAppointments, activeAppointments, medicalRecords, upcomingAppointments);
    }

    @Transactional(readOnly = true)
    public PatientProfileResponse getProfile(Authentication authentication) {
        Patient patient = getCurrentPatient(authentication);
        User user = patient.getUser();
        return new PatientProfileResponse(
                user.getId(),
                patient.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                patient.getDateOfBirth(),
                patient.getGender(),
                patient.getAddress(),
                patient.getEmergencyContact()
        );
    }

    @Transactional
    public PatientProfileResponse updateProfile(Authentication authentication, UpdatePatientProfileRequest request) {
        Patient patient = getCurrentPatient(authentication);
        User user = patient.getUser();

        if (!user.getEmail().equalsIgnoreCase(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Email уже используется", "EMAIL_ALREADY_EXISTS");
        }

        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        patient.setDateOfBirth(request.dateOfBirth());
        patient.setGender(request.gender());
        patient.setAddress(request.address());
        patient.setEmergencyContact(request.emergencyContact());

        userRepository.save(user);
        patientRepository.save(patient);
        return getProfile(authentication);
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> getDoctors(String search, Double minRating) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
        return doctorRepository.findAll().stream()
                .filter(doctor -> {
                    if (normalizedSearch.isEmpty()) return true;
                    String name = doctor.getUser().getFullName() == null ? "" : doctor.getUser().getFullName().toLowerCase();
                    String description = doctor.getDescription() == null ? "" : doctor.getDescription().toLowerCase();
                    String education = doctor.getEducation() == null ? "" : doctor.getEducation().toLowerCase();
                    return name.contains(normalizedSearch) || description.contains(normalizedSearch) || education.contains(normalizedSearch);
                })
                .filter(doctor -> minRating == null || (doctor.getRating() != null && doctor.getRating().doubleValue() >= minRating))
                .sorted(Comparator.comparing(Doctor::getRating, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toDoctorResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SlotResponse> getDoctorSlots(Long doctorId, LocalDate date) {
        List<Slot> slots;
        if (date != null) {
            Doctor doctor = doctorRepository.findById(doctorId)
                    .orElseThrow(() -> new BusinessException("Врач не найден", "DOCTOR_NOT_FOUND"));
            slots = slotRepository.findByDoctorAndDateAndIsBookedFalseAndIsBlockedFalseOrderByStartTime(doctor, date);
        } else {
            slots = slotRepository.findByDoctorIdOrderByDateAscStartTimeAsc(doctorId).stream()
                    .filter(slot -> !Boolean.TRUE.equals(slot.getIsBooked()) && !Boolean.TRUE.equals(slot.getIsBlocked()))
                    .toList();
        }
        return slots.stream().map(this::toSlotResponse).toList();
    }

    @Transactional
    public AppointmentResponse bookAppointment(Authentication authentication, BookAppointmentRequest request) {
        Patient patient = getCurrentPatient(authentication);
        Slot slot = slotRepository.findById(request.slotId())
                .orElseThrow(() -> new BusinessException("Слот не найден", "SLOT_NOT_FOUND"));
        if (Boolean.TRUE.equals(slot.getIsBooked()) || Boolean.TRUE.equals(slot.getIsBlocked())) {
            throw new BusinessException("Слот недоступен для записи", "SLOT_NOT_AVAILABLE");
        }

        slot.setIsBooked(true);
        slot.setBookedByPatient(patient);
        slot.setBookedAt(java.time.LocalDateTime.now());
        slotRepository.save(slot);

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(slot.getDoctor())
                .slot(slot)
                .status(AppointmentStatus.SCHEDULED)
                .symptomsDescription(request.symptomsDescription())
                .build();
        Appointment saved = appointmentRepository.save(appointment);
        createNotification(
                patient.getUser(),
                NotificationType.APPOINTMENT_CONFIRMED,
                "Запись оформлена",
                "Вы записаны к врачу " + saved.getDoctor().getUser().getFullName() + " на " + saved.getSlot().getDate() + " " + saved.getSlot().getStartTime()
        );
        return toAppointmentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointments(Authentication authentication) {
        Patient patient = getCurrentPatient(authentication);
        return appointmentRepository.findByPatientOrderBySlotDateDescSlotStartTimeDesc(patient).stream()
                .map(this::toAppointmentResponse)
                .toList();
    }

    @Transactional
    public AppointmentResponse cancelAppointment(Authentication authentication, Long appointmentId) {
        Patient patient = getCurrentPatient(authentication);
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));
        if (!appointment.getPatient().getId().equals(patient.getId())) {
            throw new BusinessException("Нельзя отменить чужую запись", "FORBIDDEN_APPOINTMENT_CANCEL");
        }
        if (!List.of(AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED).contains(appointment.getStatus())) {
            throw new BusinessException("Эту запись нельзя отменить", "APPOINTMENT_NOT_CANCELLABLE");
        }
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancelledAt(java.time.LocalDateTime.now());
        appointment.setCancelledBy("PATIENT");
        appointment.setCancelReason("Отменено пациентом");

        Slot slot = appointment.getSlot();
        slot.setIsBooked(false);
        slot.setBookedByPatient(null);
        slot.setBookedAt(null);
        slotRepository.save(slot);

        Appointment saved = appointmentRepository.save(appointment);
        createNotification(
                patient.getUser(),
                NotificationType.APPOINTMENT_CANCELLED,
                "Запись отменена",
                "Вы отменили запись на " + saved.getSlot().getDate() + " " + saved.getSlot().getStartTime()
        );
        return toAppointmentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getMedicalRecords(Authentication authentication) {
        Patient patient = getCurrentPatient(authentication);
        return medicalRecordRepository.findByPatientOrderByCreatedAtDesc(patient).stream()
                .map(record -> new MedicalRecordResponse(
                        record.getId(),
                        record.getDoctor().getUser().getFullName(),
                        record.getDiagnosis(),
                        record.getTreatment(),
                        record.getNotes(),
                        record.getComplaints(),
                        record.getExaminationResults(),
                        record.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public MedicalRecordResponse updateMedicalRecord(Authentication authentication, Long recordId, UpdateMedicalRecordRequest request) {
        Patient patient = getCurrentPatient(authentication);
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new BusinessException("Медкарта не найдена", "MEDICAL_RECORD_NOT_FOUND"));
        if (!record.getPatient().getId().equals(patient.getId())) {
            throw new BusinessException("Нельзя редактировать чужую медкарту", "FORBIDDEN_MEDICAL_RECORD_UPDATE");
        }
        record.setNotes(request.notes());
        MedicalRecord saved = medicalRecordRepository.save(record);
        return new MedicalRecordResponse(
                saved.getId(),
                saved.getDoctor().getUser().getFullName(),
                saved.getDiagnosis(),
                saved.getTreatment(),
                saved.getNotes(),
                saved.getComplaints(),
                saved.getExaminationResults(),
                saved.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<SymptomResponse> getSymptoms(String query) {
        List<Symptom> symptoms = (query == null || query.isBlank())
                ? symptomRepository.findAllByOrderByNameAsc()
                : symptomRepository.findByNameContainingIgnoreCaseOrderByNameAsc(query.trim());
        return symptoms.stream().map(symptom -> new SymptomResponse(
                symptom.getId(), symptom.getName(), symptom.getDescription(), symptom.getIsUrgent()
        )).toList();
    }

    @Transactional(readOnly = true)
    public SymptomRecommendationResponse recommendDoctors(SymptomRecommendationRequest request) {
        List<SymptomSpecialization> links = symptomSpecializationRepository.findAllBySymptomIds(request.symptomIds());
        if (links.isEmpty()) {
            return new SymptomRecommendationResponse("Общая практика", getDoctors(null, null).stream().limit(5).toList());
        }

        Map<Long, java.math.BigDecimal> specializationWeights = links.stream().collect(
                Collectors.groupingBy(
                        ss -> ss.getSpecialization().getId(),
                        Collectors.reducing(java.math.BigDecimal.ZERO, SymptomSpecialization::getWeight, java.math.BigDecimal::add)
                )
        );

        Long topSpecId = specializationWeights.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        List<DoctorResponse> doctors = doctorRepository.findBySpecializationIdIn(List.of(topSpecId)).stream()
                .sorted(Comparator.comparing(Doctor::getRating, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toDoctorResponse)
                .limit(10)
                .toList();

        String specializationName = links.stream()
                .filter(ss -> ss.getSpecialization().getId().equals(topSpecId))
                .findFirst()
                .map(ss -> ss.getSpecialization().getName())
                .orElse("Общая практика");

        return new SymptomRecommendationResponse(specializationName, doctors);
    }

    @Transactional(readOnly = true)
    public List<PatientNotificationResponse> getNotifications(Authentication authentication) {
        User user = getCurrentPatient(authentication).getUser();
        return userNotificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(notification -> new PatientNotificationResponse(
                        notification.getId(),
                        notification.getType(),
                        notification.getTitle(),
                        notification.getMessage(),
                        notification.getIsRead(),
                        notification.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public PatientNotificationResponse markNotificationRead(Authentication authentication, Long notificationId, boolean read) {
        User user = getCurrentPatient(authentication).getUser();
        UserNotification notification = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException("Уведомление не найдено", "NOTIFICATION_NOT_FOUND"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Нельзя изменить чужое уведомление", "FORBIDDEN_NOTIFICATION_UPDATE");
        }
        notification.setIsRead(read);
        UserNotification saved = userNotificationRepository.save(notification);
        return new PatientNotificationResponse(
                saved.getId(),
                saved.getType(),
                saved.getTitle(),
                saved.getMessage(),
                saved.getIsRead(),
                saved.getCreatedAt()
        );
    }

    @Transactional
    public void deleteNotification(Authentication authentication, Long notificationId) {
        User user = getCurrentPatient(authentication).getUser();
        UserNotification notification = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException("Уведомление не найдено", "NOTIFICATION_NOT_FOUND"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Нельзя удалить чужое уведомление", "FORBIDDEN_NOTIFICATION_DELETE");
        }
        userNotificationRepository.delete(notification);
    }

    @Transactional
    public void changePassword(Authentication authentication, ChangePasswordRequest request) {
        User user = getCurrentPatient(authentication).getUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Текущий пароль указан неверно", "INVALID_CURRENT_PASSWORD");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private Patient getCurrentPatient(Authentication authentication) {
        return patientRepository.findByUserEmail(authentication.getName())
                .orElseThrow(() -> new BusinessException("Профиль пациента не найден", "PATIENT_NOT_FOUND"));
    }

    private DoctorResponse toDoctorResponse(Doctor doctor) {
        User user = doctor.getUser();
        return new DoctorResponse(
                doctor.getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                doctor.getSpecialization() != null ? doctor.getSpecialization().getId() : null,
                doctor.getSpecialization() != null ? doctor.getSpecialization().getName() : null,
                doctor.getDescription(),
                doctor.getExperienceYears(),
                doctor.getEducation(),
                doctor.getRating(),
                doctor.getTotalRatings()
        );
    }

    private void createNotification(User user, NotificationType type, String title, String message) {
        UserNotification notification = UserNotification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        userNotificationRepository.save(notification);
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

    private AppointmentResponse toAppointmentResponse(Appointment appointment) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getPatient().getId(),
                appointment.getPatient().getUser().getFullName(),
                appointment.getDoctor().getId(),
                appointment.getDoctor().getUser().getFullName(),
                appointment.getSlot().getDate(),
                appointment.getSlot().getStartTime(),
                appointment.getSlot().getEndTime(),
                appointment.getStatus(),
                appointment.getSymptomsDescription(),
                appointment.getDoctorNotes(),
                appointment.getDiagnosis(),
                appointment.getTreatmentRecommendations()
        );
    }
}
