package com.medical.service;

import com.medical.dto.admin.AdminDashboardResponse;
import com.medical.dto.admin.StatisticsResponse;
import com.medical.dto.admin.UpdateUserRequest;
import com.medical.dto.admin.UpsertDoctorRequest;
import com.medical.dto.admin.UpsertSpecializationRequest;
import com.medical.dto.admin.UpsertSymptomRequest;
import com.medical.dto.admin.UserResponse;
import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.DoctorResponse;
import com.medical.dto.common.RescheduleRequestResponse;
import com.medical.dto.common.SpecializationDetailResponse;
import com.medical.dto.common.SpecializationResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.common.SymptomResponse;
import com.medical.dto.common.SymptomWeightResponse;
import com.medical.dto.doctor.RescheduleAppointmentRequest;
import com.medical.dto.doctor.UpdateAppointmentStatusRequest;
import com.medical.dto.doctor.UpsertSlotRequest;
import com.medical.entity.RescheduleRequest;
import com.medical.entity.RescheduleRequestStatus;
import com.medical.entity.*;
import com.medical.exception.BusinessException;
import com.medical.repository.*;
import com.medical.service.integration.AppointmentIntegrationService;
import com.medical.service.integration.EmailNotificationService;
import com.medical.service.mapping.AppointmentMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminCabinetService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final SlotRepository slotRepository;
    private final SymptomRepository symptomRepository;
    private final SpecializationRepository specializationRepository;
    private final RescheduleRequestRepository rescheduleRequestRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppointmentIntegrationService appointmentIntegrationService;
    private final AppointmentMapper appointmentMapper;
    private final EmailNotificationService emailNotificationService;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {
        long totalUsers = userRepository.count();
        long totalDoctors = userRepository.countByRole(Role.DOCTOR);
        long totalPatients = userRepository.countByRole(Role.PATIENT);
        long totalAppointments = appointmentRepository.count();
        long scheduledAppointments = appointmentRepository.countByStatus(AppointmentStatus.SCHEDULED);
        long completedAppointments = appointmentRepository.countByStatus(AppointmentStatus.COMPLETED);
        return new AdminDashboardResponse(
                totalUsers,
                totalDoctors,
                totalPatients,
                totalAppointments,
                scheduledAppointments,
                completedAppointments
        );
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> getDoctors() {
        return doctorRepository.findAll().stream().map(this::toDoctorResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllPatients() {
        return patientRepository.findAll().stream()
                .map(this::toPatientSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPatientById(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new BusinessException("Patient not found", "PATIENT_NOT_FOUND"));
        return toPatientDetail(patient);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getPatientAppointments(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new BusinessException("Patient not found", "PATIENT_NOT_FOUND"));
        return appointmentRepository.findByPatientOrderBySlotDateDescSlotStartTimeDesc(patient).stream()
                .map(appointmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPatientMedicalRecords(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new BusinessException("Patient not found", "PATIENT_NOT_FOUND"));
        return appointmentRepository.findByPatientOrderBySlotDateDescSlotStartTimeDesc(patient).stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
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

    @Transactional(readOnly = true)
    public List<UserResponse> getUsers(String search, Role role) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
        return userRepository.findAll().stream()
                .filter(user -> role == null || user.getRole() == role)
                .filter(user -> normalizedSearch.isBlank()
                        || user.getFullName().toLowerCase().contains(normalizedSearch)
                        || (user.getUsername() != null && user.getUsername().toLowerCase().contains(normalizedSearch))
                        || user.getEmail().toLowerCase().contains(normalizedSearch))
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getUsername(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getRole(),
                        user.getIsBlocked(),
                        user.getAvatarUrl()
                ))
                .toList();
    }

    private String generateUsernameFromEmail(String email, String currentUsername) {
        if (email == null || email.isBlank()) return currentUsername;
        String base = email.split("@")[0].replaceAll("[^a-zA-Z0-9._-]", "");
        if (base.length() < 3) base = base + "user";
        if (base.length() > 50) base = base.substring(0, 50);
        return base;
    }

    @Transactional
    public UserResponse updateUser(Long userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND"));
        if (!user.getEmail().equalsIgnoreCase(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Email is already in use", "EMAIL_ALREADY_EXISTS");
        }

        String newUsername = (request.username() != null && !request.username().isBlank())
                ? request.username()
                : generateUsernameFromEmail(request.email(), user.getUsername());

        if (!user.getUsername().equalsIgnoreCase(newUsername) && userRepository.existsByUsername(newUsername)) {
            newUsername = newUsername + System.currentTimeMillis() % 1000;
        }

        user.setFullName(request.fullName());
        user.setUsername(newUsername);
        user.setEmail(request.email());
        user.setPhone(request.phone());
        if (request.role() != null) {
            user.setRole(request.role());
            ensureRoleProfile(user);
        }
        User saved = userRepository.save(user);
        return new UserResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getPhone(),
                saved.getRole(),
                saved.getIsBlocked(),
                saved.getAvatarUrl()
        );
    }

    @Transactional
    public UserResponse setUserBlocked(Long userId, boolean blocked) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND"));
        user.setIsBlocked(blocked);
        User saved = userRepository.save(user);
        return new UserResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getPhone(),
                saved.getRole(),
                saved.getIsBlocked(),
                saved.getAvatarUrl()
        );
    }

    @Transactional
    public UserResponse updateUserAvatar(Long userId, String avatarUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND"));
        user.setAvatarUrl(avatarUrl);
        User saved = userRepository.save(user);
        return new UserResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getPhone(),
                saved.getRole(),
                saved.getIsBlocked(),
                saved.getAvatarUrl()
        );
    }

    @Transactional
    public DoctorResponse createDoctor(UpsertDoctorRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("User with this email already exists", "EMAIL_ALREADY_EXISTS");
        }

        String username = (request.username() != null && !request.username().isBlank())
                ? request.username()
                : generateUsernameFromEmail(request.email(), "doctor");

        if (userRepository.existsByUsername(username)) {
            username = username + System.currentTimeMillis() % 1000;
        }

        User user = User.builder()
                .username(username)
                .email(request.email())
                .passwordHash(passwordEncoder.encode("admin123"))
                .fullName(request.fullName())
                .phone(request.phone())
                .role(Role.DOCTOR)
                .isBlocked(false)
                .build();
        User savedUser = userRepository.save(user);

        Doctor doctor = Doctor.builder()
                .user(savedUser)
                .specialization(resolveSpecialization(request.specializationId()))
                .description(request.description())
                .experienceYears(request.experienceYears() == null ? 0 : request.experienceYears())
                .education(request.education())
                .build();
        return toDoctorResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public DoctorResponse updateDoctor(Long doctorId, UpsertDoctorRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BusinessException("Doctor not found", "DOCTOR_NOT_FOUND"));
        User user = doctor.getUser();

        if (!user.getEmail().equalsIgnoreCase(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new BusinessException("User with this email already exists", "EMAIL_ALREADY_EXISTS");
        }

        String newUsername = (request.username() != null && !request.username().isBlank())
                ? request.username()
                : generateUsernameFromEmail(request.email(), user.getUsername());

        if (!user.getUsername().equalsIgnoreCase(newUsername) && userRepository.existsByUsername(newUsername)) {
            newUsername = newUsername + System.currentTimeMillis() % 1000;
        }

        user.setFullName(request.fullName());
        user.setUsername(newUsername);
        user.setEmail(request.email());
        user.setPhone(request.phone());
        doctor.setSpecialization(resolveSpecialization(request.specializationId()));
        doctor.setDescription(request.description());
        doctor.setExperienceYears(request.experienceYears() == null ? 0 : request.experienceYears());
        doctor.setEducation(request.education());

        userRepository.save(user);
        return toDoctorResponse(doctorRepository.save(doctor));
    }

    @Transactional
    public void deleteDoctor(Long doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BusinessException("Doctor not found", "DOCTOR_NOT_FOUND"));
        if (appointmentRepository.countByDoctor(doctor) > 0 || slotRepository.countByDoctor(doctor) > 0) {
            throw new BusinessException("Cannot delete doctor with slots or appointments", "DOCTOR_HAS_DEPENDENCIES");
        }
        Long userId = doctor.getUser().getId();
        doctorRepository.delete(doctor);
        userRepository.deleteById(userId);
    }

    @Transactional(readOnly = true)
    public List<SymptomResponse> getSymptoms(String query) {
        List<Symptom> symptoms = (query == null || query.isBlank())
                ? symptomRepository.findAllByOrderByNameAsc()
                : symptomRepository.findByNameContainingIgnoreCaseOrderByNameAsc(query.trim());
        return symptoms.stream()
                .map(symptom -> new SymptomResponse(symptom.getId(), symptom.getName(), symptom.getDescription(), symptom.getIsUrgent()))
                .toList();
    }

    @Transactional
    public SymptomResponse createSymptom(UpsertSymptomRequest request) {
        if (symptomRepository.existsByNameIgnoreCase(request.name())) {
            throw new BusinessException("Symptom already exists", "SYMPTOM_EXISTS");
        }
        Symptom symptom = Symptom.builder()
                .name(request.name())
                .description(request.description())
                .isUrgent(request.isUrgent() != null && request.isUrgent())
                .build();
        Symptom saved = symptomRepository.save(symptom);
        return new SymptomResponse(saved.getId(), saved.getName(), saved.getDescription(), saved.getIsUrgent());
    }

    @Transactional
    public SymptomResponse updateSymptom(Long symptomId, UpsertSymptomRequest request) {
        Symptom symptom = symptomRepository.findById(symptomId)
                .orElseThrow(() -> new BusinessException("Symptom not found", "SYMPTOM_NOT_FOUND"));
        symptom.setName(request.name());
        symptom.setDescription(request.description());
        symptom.setIsUrgent(request.isUrgent() != null && request.isUrgent());
        Symptom saved = symptomRepository.save(symptom);
        return new SymptomResponse(saved.getId(), saved.getName(), saved.getDescription(), saved.getIsUrgent());
    }

    @Transactional
    public void deleteSymptom(Long symptomId) {
        if (!symptomRepository.existsById(symptomId)) {
            throw new BusinessException("Symptom not found", "SYMPTOM_NOT_FOUND");
        }
        symptomRepository.deleteById(symptomId);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAllAppointments() {
        return appointmentRepository.findAllByOrderBySlotDateDescSlotStartTimeDesc().stream()
                .map(appointmentMapper::toResponse)
                .toList();
    }

    @Transactional
    public AppointmentResponse updateAppointmentStatus(Long appointmentId, UpdateAppointmentStatusRequest request) {
        log.info("AdminCabinetService: updateAppointmentStatus called for id={}, status={}", appointmentId, request.status());
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));

        AppointmentStatus newStatus = request.status();
        if (newStatus == AppointmentStatus.RESCHEDULED) {
            throw new BusinessException("Используйте endpoint для переноса", "USE_RESCHEDULE_ENDPOINT");
        }

        // Для администратора разрешаем любые переходы, кроме RESCHEDULED (для него есть отдельный метод)
        // Но сохраняем базовую логику высвобождения слотов при отмене
        if (newStatus == AppointmentStatus.CANCELLED && appointment.getStatus() != AppointmentStatus.CANCELLED) {
            // Проверка: приём в будущем
            LocalDateTime appointmentDateTime = LocalDateTime.of(
                    appointment.getSlot().getDate(), appointment.getSlot().getStartTime());
            if (appointmentDateTime.isBefore(LocalDateTime.now())) {
                throw new BusinessException("Нельзя отменить прошедший приём", "APPOINTMENT_IN_PAST");
            }
            releaseSlot(appointment.getSlot());
            appointment.setCancelledAt(LocalDateTime.now());
            appointment.setCancelledBy("ADMIN");
            appointment.setCancelReason(trimToNull(request.cancelReason()) != null ? request.cancelReason().trim() : "Отменено администратором");
        }

        appointment.setStatus(newStatus);

        if (newStatus == AppointmentStatus.COMPLETED) {
            appointment.setDoctorNotes(trimToNull(request.doctorNotes()));
            appointment.setDiagnosis(trimToNull(request.diagnosis()));
            appointment.setTreatmentRecommendations(trimToNull(request.treatmentRecommendations()));
            Appointment saved = appointmentRepository.save(appointment);
            appointmentIntegrationService.handleAppointmentCompleted(saved);
            return appointmentMapper.toResponse(saved);
        }

        if (newStatus == AppointmentStatus.CANCELLED) {
            Appointment saved = appointmentRepository.save(appointment);
            appointmentIntegrationService.handleAppointmentCancelled(saved, "admin");
            return appointmentMapper.toResponse(saved);
        }

        return appointmentMapper.toResponse(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentResponse rescheduleAppointment(Long appointmentId, RescheduleAppointmentRequest request) {
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));
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
            throw new BusinessException("Slot is not available", "SLOT_NOT_AVAILABLE");
        }

        Patient patient = appointment.getPatient();
        releaseSlot(appointment.getSlot());

        newSlot.setIsBooked(true);
        newSlot.setBookedByPatient(patient);
        newSlot.setBookedAt(LocalDateTime.now());
        slotRepository.save(newSlot);

        appointment.setSlot(newSlot);
        appointment.setDoctor(newSlot.getDoctor());
        appointment.setStatus(AppointmentStatus.RESCHEDULED);
        appointment.setReminderSentAt(null);
        Appointment saved = appointmentRepository.save(appointment);

        appointmentIntegrationService.handleAppointmentRescheduled(saved);
        return appointmentMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SlotResponse> getDoctorSchedule(Long doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new BusinessException("Doctor not found", "DOCTOR_NOT_FOUND");
        }
        List<Slot> slots = slotRepository.findByDoctorIdOrderByDateAscStartTimeAsc(doctorId);
        return slots.stream()
                .map(slot -> new SlotResponse(
                        slot.getId(),
                        slot.getDoctor().getId(),
                        slot.getDate(),
                        slot.getStartTime(),
                        slot.getEndTime(),
                        slot.getIsBooked(),
                        slot.getIsBlocked()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SpecializationResponse> getSpecializations() {
        return specializationRepository.findAllByOrderByNameAsc().stream()
                .map(spec -> new SpecializationResponse(spec.getId(), spec.getName(), spec.getDescription()))
                .toList();
    }

    private void releaseSlot(Slot slot) {
        slot.setIsBooked(false);
        slot.setBookedByPatient(null);
        slot.setBookedAt(null);
        slotRepository.save(slot);
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private void ensureRoleProfile(User user) {
        if (user.getRole() == Role.PATIENT && patientRepository.findByUserId(user.getId()).isEmpty()) {
            Patient patient = Patient.builder().user(user).build();
            patientRepository.save(patient);
        }
        if (user.getRole() == Role.DOCTOR && doctorRepository.findByUserId(user.getId()).isEmpty()) {
            Doctor doctor = Doctor.builder()
                    .user(user)
                    .description("Doctor profile")
                    .experienceYears(0)
                    .education("Not specified")
                    .build();
            doctorRepository.save(doctor);
        }
    }

    private Specialization resolveSpecialization(Long specializationId) {
        if (specializationId == null) {
            return null;
        }
        return specializationRepository.findById(specializationId)
                .orElseThrow(() -> new BusinessException("Specialization not found", "SPECIALIZATION_NOT_FOUND"));
    }

    private DoctorResponse toDoctorResponse(Doctor doctor) {
        User user = doctor.getUser();
        return new DoctorResponse(
                doctor.getId(),
                user.getId(),
                user.getFullName(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getAvatarUrl(),
                doctor.getSpecialization() != null ? doctor.getSpecialization().getId() : null,
                doctor.getSpecialization() != null ? doctor.getSpecialization().getName() : null,
                doctor.getDescription(),
                doctor.getExperienceYears(),
                doctor.getEducation(),
                doctor.getRating(),
                doctor.getTotalRatings()
        );
    }

    @Transactional(readOnly = true)
    public SpecializationDetailResponse getSpecializationDetail(Long id) {
        Specialization spec = specializationRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Specialization not found", "SPECIALIZATION_NOT_FOUND"));

        List<SymptomWeightResponse> symptoms = spec.getSymptomSpecializations().stream()
                .map(ss -> new SymptomWeightResponse(
                        ss.getSymptom().getId(),
                        ss.getSymptom().getName(),
                        ss.getWeight()
                ))
                .toList();

        return new SpecializationDetailResponse(
                spec.getId(),
                spec.getName(),
                spec.getDescription(),
                symptoms
        );
    }

    @Transactional
    public SpecializationDetailResponse createSpecialization(UpsertSpecializationRequest request) {
        if (specializationRepository.existsByNameIgnoreCase(request.name())) {
            throw new BusinessException("Specialization with this name already exists", "SPECIALIZATION_EXISTS");
        }

        Specialization spec = Specialization.builder()
                .name(request.name())
                .description(request.description())
                .build();

        Specialization saved = specializationRepository.save(spec);

        // Add symptom associations
        if (request.symptoms() != null && !request.symptoms().isEmpty()) {
            List<SymptomSpecialization> associations = new ArrayList<>();
            for (UpsertSpecializationRequest.SymptomWeightRequest sw : request.symptoms()) {
                Symptom symptom = symptomRepository.findById(sw.symptomId())
                        .orElseThrow(() -> new BusinessException("Symptom not found", "SYMPTOM_NOT_FOUND"));

                SymptomSpecialization ss = new SymptomSpecialization();
                ss.setSpecialization(saved);
                ss.setSymptom(symptom);
                ss.setWeight(sw.weight() != null ? sw.weight() : BigDecimal.ONE);
                associations.add(ss);
            }
            saved.getSymptomSpecializations().addAll(associations);
            saved = specializationRepository.save(saved);
        }

        return getSpecializationDetail(saved.getId());
    }

    @Transactional
    public SpecializationDetailResponse updateSpecialization(Long id, UpsertSpecializationRequest request) {
        Specialization spec = specializationRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Specialization not found", "SPECIALIZATION_NOT_FOUND"));

        // Check name uniqueness if changed
        if (!spec.getName().equalsIgnoreCase(request.name()) &&
                specializationRepository.existsByNameIgnoreCase(request.name())) {
            throw new BusinessException("Specialization with this name already exists", "SPECIALIZATION_EXISTS");
        }

        spec.setName(request.name());
        spec.setDescription(request.description());

        // Update symptom associations
        spec.getSymptomSpecializations().clear();
        if (request.symptoms() != null && !request.symptoms().isEmpty()) {
            for (UpsertSpecializationRequest.SymptomWeightRequest sw : request.symptoms()) {
                Symptom symptom = symptomRepository.findById(sw.symptomId())
                        .orElseThrow(() -> new BusinessException("Symptom not found", "SYMPTOM_NOT_FOUND"));

                SymptomSpecialization ss = new SymptomSpecialization();
                ss.setSpecialization(spec);
                ss.setSymptom(symptom);
                ss.setWeight(sw.weight() != null ? sw.weight() : BigDecimal.ONE);
                spec.getSymptomSpecializations().add(ss);
            }
        }

        Specialization saved = specializationRepository.save(spec);
        return getSpecializationDetail(saved.getId());
    }

    @Transactional
    public void deleteSpecialization(Long id) {
        Specialization spec = specializationRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Specialization not found", "SPECIALIZATION_NOT_FOUND"));

        // Check if specialization is used by any doctor
        if (!doctorRepository.findBySpecializationId(id).isEmpty()) {
            throw new BusinessException("Cannot delete specialization assigned to doctors", "SPECIALIZATION_IN_USE");
        }

        specializationRepository.delete(spec);
    }

    // Reschedule request management
    @Transactional(readOnly = true)
    public List<RescheduleRequestResponse> getPendingRescheduleRequests() {
        return rescheduleRequestRepository.findByStatusOrderByCreatedAtDesc(RescheduleRequestStatus.PENDING).stream()
                .map(this::toRescheduleRequestResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RescheduleRequestResponse> getAllRescheduleRequests() {
        return rescheduleRequestRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toRescheduleRequestResponse)
                .toList();
    }

    @Transactional
    public RescheduleRequestResponse approveRescheduleRequest(Long requestId, Long adminUserId) {
        RescheduleRequest request = rescheduleRequestRepository.findByIdWithAppointment(requestId)
                .orElseThrow(() -> new BusinessException("Reschedule request not found", "REQUEST_NOT_FOUND"));
        if (request.getStatus() != RescheduleRequestStatus.PENDING) {
            throw new BusinessException("Request is not pending", "REQUEST_NOT_PENDING");
        }
        Appointment appointment = request.getAppointment();
        Slot currentSlot = appointment.getSlot();
        Slot newSlot = request.getTargetSlot();

        if (newSlot.getIsBooked()) {
            throw new BusinessException("Target slot is already booked", "SLOT_ALREADY_BOOKED");
        }
        if (appointmentRepository.existsBySlotId(newSlot.getId())) {
            throw new BusinessException("Target slot already has an appointment", "SLOT_HAS_APPOINTMENT");
        }

        currentSlot.setIsBooked(false);
        slotRepository.save(currentSlot);

        newSlot.setIsBooked(true);
        slotRepository.save(newSlot);

        appointment.setSlot(newSlot);
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        Appointment saved = appointmentRepository.save(appointment);

        request.setStatus(RescheduleRequestStatus.APPROVED);
        request.setProcessedAt(LocalDateTime.now());
        User admin = userRepository.findById(adminUserId).orElse(null);
        request.setProcessedByAdmin(admin);
        RescheduleRequest savedRequest = rescheduleRequestRepository.save(request);

        // Notify patient and doctor about approval
        User patientUser = saved.getPatient().getUser();
        User doctorUser = request.getRequestedByDoctor().getUser();
        String dateText = newSlot.getDate().toString() + " " + newSlot.getStartTime().toString().substring(0, 5);
        createNotification(patientUser, NotificationType.RESCHEDULE_REQUEST_APPROVED,
                "Перенос приёма одобрен",
                "Администратор одобрил перенос вашего приёма на " + dateText + ".");
        createNotification(doctorUser, NotificationType.RESCHEDULE_REQUEST_APPROVED,
                "Перенос приёма одобрен",
                "Администратор одобрил перенос приёма пациента на " + dateText + ".");

        // Email notifications
        emailNotificationService.sendEmail(
                patientUser.getEmail(),
                "Перенос приёма одобрен",
                "Администратор одобрил перенос вашего приёма на " + dateText + ".\n\nВрач: " + doctorUser.getFullName()
        );
        emailNotificationService.sendEmail(
                doctorUser.getEmail(),
                "Перенос приёма одобрен",
                "Администратор одобрил перенос приёма пациента " + patientUser.getFullName() + " на " + dateText + "."
        );

        appointmentIntegrationService.handleAppointmentRescheduled(saved);
        return toRescheduleRequestResponse(savedRequest);
    }

    @Transactional
    public RescheduleRequestResponse rejectRescheduleRequest(Long requestId, Long adminUserId, String comment) {
        RescheduleRequest request = rescheduleRequestRepository.findByIdWithAppointment(requestId)
                .orElseThrow(() -> new BusinessException("Reschedule request not found", "REQUEST_NOT_FOUND"));
        if (request.getStatus() != RescheduleRequestStatus.PENDING) {
            throw new BusinessException("Request is not pending", "REQUEST_NOT_PENDING");
        }
        request.setStatus(RescheduleRequestStatus.REJECTED);
        request.setAdminComment(comment);
        request.setProcessedAt(LocalDateTime.now());
        User admin = userRepository.findById(adminUserId).orElse(null);
        request.setProcessedByAdmin(admin);
        RescheduleRequest saved = rescheduleRequestRepository.save(request);

        // Notify doctor and patient about rejection
        User doctorUser = request.getRequestedByDoctor().getUser();
        User patientUser = request.getAppointment().getPatient().getUser();
        String patientName = patientUser.getFullName();
        String dateText = request.getTargetSlot().getDate().toString() + " " + request.getTargetSlot().getStartTime().toString().substring(0, 5);
        createNotification(doctorUser, NotificationType.APPOINTMENT_CANCELLED,
                "Перенос отклонён",
                "Администратор отклонил запрос на перенос приёма пациента " + patientName + " на " + dateText + ".");
        createNotification(patientUser, NotificationType.APPOINTMENT_CANCELLED,
                "Перенос отклонён",
                "Администратор отклонил запрос на перенос вашего приёма на " + dateText + ".");

        // Email notifications
        String emailBody = "Администратор отклонил запрос на перенос приёма.\n\nПациент: " + patientName + "\nПредлагаемая дата: " + dateText;
        if (comment != null && !comment.isBlank()) {
            emailBody += "\n\nКомментарий: " + comment;
        }
        emailNotificationService.sendEmail(doctorUser.getEmail(), "Перенос приёма отклонён", emailBody);
        emailNotificationService.sendEmail(patientUser.getEmail(), "Перенос приёма отклонён", emailBody);

        return toRescheduleRequestResponse(saved);
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

    // Admin slot management
    @Transactional
    public SlotResponse createSlotForDoctor(Long doctorId, UpsertSlotRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BusinessException("Doctor not found", "DOCTOR_NOT_FOUND"));
        if (slotRepository.existsByDoctorAndDateAndStartTime(doctor, request.date(), request.startTime())) {
            throw new BusinessException("Slot already exists for this date and time", "SLOT_EXISTS");
        }
        Slot slot = new Slot();
        slot.setDoctor(doctor);
        slot.setDate(request.date());
        slot.setStartTime(request.startTime());
        slot.setEndTime(request.endTime());
        slot.setIsBooked(false);
        slot.setIsBlocked(request.isBlocked() != null ? request.isBlocked() : false);
        Slot saved = slotRepository.save(slot);
        return toSlotResponse(saved);
    }

    @Transactional
    public SlotResponse updateSlot(Long slotId, UpsertSlotRequest request) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new BusinessException("Slot not found", "SLOT_NOT_FOUND"));
        if (slot.getIsBooked()) {
            throw new BusinessException("Cannot edit booked slot", "SLOT_BOOKED");
        }
        slot.setDate(request.date());
        slot.setStartTime(request.startTime());
        slot.setEndTime(request.endTime());
        if (request.isBlocked() != null) {
            slot.setIsBlocked(request.isBlocked());
        }
        Slot saved = slotRepository.save(slot);
        return toSlotResponse(saved);
    }

    @Transactional
    public void deleteSlot(Long slotId) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new BusinessException("Slot not found", "SLOT_NOT_FOUND"));
        if (slot.getIsBooked()) {
            throw new BusinessException("Cannot delete booked slot", "SLOT_BOOKED");
        }
        slotRepository.delete(slot);
    }

    private RescheduleRequestResponse toRescheduleRequestResponse(RescheduleRequest request) {
        Appointment apt = request.getAppointment();
        Slot currentSlot = apt.getSlot();
        Slot targetSlot = request.getTargetSlot();
        return new RescheduleRequestResponse(
                request.getId(),
                apt.getId(),
                apt.getPatient().getUser().getFullName(),
                apt.getDoctor().getUser().getFullName(),
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

    @Transactional(readOnly = true)
    public StatisticsResponse getStatistics() {
        // KPI Statistics
        long totalAppointments = appointmentRepository.count();
        long totalPatients = userRepository.countByRole(Role.PATIENT);
        long todayAppointments = appointmentRepository.findAll().stream()
                .filter(a -> a.getSlot().getDate().equals(LocalDate.now()))
                .count();
        long freeSlotsToday = slotRepository.findAll().stream()
                .filter(s -> s.getDate().equals(LocalDate.now()) && !s.getIsBooked() && !s.getIsBlocked())
                .count();

        // Calculate average rating
        List<Doctor> doctors = doctorRepository.findAll();
        double avgRating = doctors.stream()
                .filter(d -> d.getRating() != null && d.getRating().compareTo(BigDecimal.ZERO) > 0)
                .mapToDouble(d -> d.getRating().doubleValue())
                .average()
                .orElse(0.0);
        avgRating = BigDecimal.valueOf(avgRating).setScale(1, RoundingMode.HALF_UP).doubleValue();

        StatisticsResponse.KpiStatistics kpis = new StatisticsResponse.KpiStatistics(
                totalAppointments,
                totalPatients,
                avgRating,
                todayAppointments,
                freeSlotsToday
        );

        // Monthly appointments (last 6 months)
        List<StatisticsResponse.MonthlyAppointments> monthly = new ArrayList<>();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMM", Locale.of("ru"));
        for (int i = 5; i >= 0; i--) {
            LocalDate monthStart = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
            String monthName = monthStart.format(monthFormatter);
            monthName = monthName.substring(0, 1).toUpperCase() + monthName.substring(1, 3).toLowerCase();

            long completed = appointmentRepository.findAll().stream()
                    .filter(a -> !a.getSlot().getDate().isBefore(monthStart) && !a.getSlot().getDate().isAfter(monthEnd))
                    .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                    .count();
            long cancelled = appointmentRepository.findAll().stream()
                    .filter(a -> !a.getSlot().getDate().isBefore(monthStart) && !a.getSlot().getDate().isAfter(monthEnd))
                    .filter(a -> a.getStatus() == AppointmentStatus.CANCELLED)
                    .count();
            long scheduled = appointmentRepository.findAll().stream()
                    .filter(a -> !a.getSlot().getDate().isBefore(monthStart) && !a.getSlot().getDate().isAfter(monthEnd))
                    .filter(a -> a.getStatus() == AppointmentStatus.SCHEDULED || a.getStatus() == AppointmentStatus.CONFIRMED)
                    .count();

            monthly.add(new StatisticsResponse.MonthlyAppointments(monthName, completed, cancelled, scheduled));
        }

        // Status distribution
        long completedCount = appointmentRepository.countByStatus(AppointmentStatus.COMPLETED);
        long scheduledCount = appointmentRepository.countByStatus(AppointmentStatus.SCHEDULED) +
                               appointmentRepository.countByStatus(AppointmentStatus.CONFIRMED);
        long cancelledCount = appointmentRepository.countByStatus(AppointmentStatus.CANCELLED);
        long total = totalAppointments > 0 ? totalAppointments : 1;

        List<StatisticsResponse.StatusDistribution> statusDist = List.of(
                new StatisticsResponse.StatusDistribution("Завершены", completedCount,
                        (int) ((completedCount * 100) / total), "bg-emerald-500", "dark:bg-emerald-600"),
                new StatisticsResponse.StatusDistribution("Запланированы", scheduledCount,
                        (int) ((scheduledCount * 100) / total), "bg-blue-500", "dark:bg-blue-600"),
                new StatisticsResponse.StatusDistribution("Отменены", cancelledCount,
                        (int) ((cancelledCount * 100) / total), "bg-red-500", "dark:bg-red-600")
        );

        // Weekly trend (last 7 days)
        List<Integer> weeklyTrend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            long count = appointmentRepository.findAll().stream()
                    .filter(a -> a.getSlot().getDate().equals(date))
                    .count();
            weeklyTrend.add((int) count);
        }

        // Specializations stats
        List<StatisticsResponse.SpecializationStats> specializations = doctors.stream()
                .filter(d -> d.getSpecialization() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                        d -> d.getSpecialization().getName(),
                        java.util.stream.Collectors.counting()
                ))
                .entrySet().stream()
                .map(e -> {
                    String color = switch (e.getKey()) {
                        case "Терапевт" -> "bg-blue-500";
                        case "Кардиолог" -> "bg-emerald-500";
                        case "Невролог" -> "bg-purple-500";
                        case "Хирург" -> "bg-orange-500";
                        case "Дерматолог" -> "bg-pink-500";
                        default -> "bg-brand-primary";
                    };
                    return new StatisticsResponse.SpecializationStats(e.getKey(), e.getValue(), color);
                })
                .sorted((a, b) -> Long.compare(b.count(), a.count()))
                .limit(5)
                .toList();

        // Top doctors
        List<StatisticsResponse.TopDoctor> topDoctors = doctors.stream()
                .filter(d -> d.getRating() != null && d.getRating().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> {
                    int cmp = Double.compare(b.getRating().doubleValue(), a.getRating().doubleValue());
                    if (cmp == 0) {
                        cmp = Long.compare(
                                appointmentRepository.countByDoctor(b),
                                appointmentRepository.countByDoctor(a)
                        );
                    }
                    return cmp;
                })
                .limit(5)
                .map(d -> new StatisticsResponse.TopDoctor(
                        d.getUser().getFullName(),
                        d.getRating().doubleValue(),
                        appointmentRepository.countByDoctor(d)
                ))
                .toList();

        return new StatisticsResponse(kpis, monthly, statusDist, weeklyTrend, specializations, topDoctors);
    }

    // ===== Admin profile =====

    @Transactional(readOnly = true)
    public com.medical.dto.admin.AdminProfileResponse getAdminProfile(org.springframework.security.core.Authentication authentication) {
        User user = resolveAdminUser(authentication);
        return new com.medical.dto.admin.AdminProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getAvatarUrl(),
                user.getRole().name(),
                user.getCreatedAt()
        );
    }

    @Transactional
    public com.medical.dto.admin.AdminProfileResponse updateAdminProfile(
            org.springframework.security.core.Authentication authentication,
            com.medical.dto.admin.UpdateAdminProfileRequest request
    ) {
        User user = resolveAdminUser(authentication);

        if (!user.getEmail().equalsIgnoreCase(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Email уже используется", "EMAIL_ALREADY_EXISTS");
        }

        String newUsername = request.username() != null && !request.username().isBlank()
                ? request.username()
                : user.getUsername();

        if (!user.getUsername().equalsIgnoreCase(newUsername) && userRepository.existsByUsername(newUsername)) {
            throw new BusinessException("Имя пользователя уже занято", "USERNAME_ALREADY_EXISTS");
        }

        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setUsername(newUsername);

        User saved = userRepository.save(user);
        return new com.medical.dto.admin.AdminProfileResponse(
                saved.getId(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getPhone(),
                saved.getAvatarUrl(),
                saved.getRole().name(),
                saved.getCreatedAt()
        );
    }

    @Transactional
    public com.medical.dto.admin.AdminProfileResponse uploadAdminAvatar(
            org.springframework.security.core.Authentication authentication,
            String avatarUrl
    ) {
        User user = resolveAdminUser(authentication);
        user.setAvatarUrl(avatarUrl);
        User saved = userRepository.save(user);
        return new com.medical.dto.admin.AdminProfileResponse(
                saved.getId(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getPhone(),
                saved.getAvatarUrl(),
                saved.getRole().name(),
                saved.getCreatedAt()
        );
    }

    @Transactional
    public void changeAdminPassword(
            org.springframework.security.core.Authentication authentication,
            String currentPassword,
            String newPassword
    ) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new BusinessException("Пароль должен содержать минимум 6 символов", "INVALID_PASSWORD");
        }
        User user = resolveAdminUser(authentication);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BusinessException("Текущий пароль неверен", "INVALID_CURRENT_PASSWORD");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private User resolveAdminUser(org.springframework.security.core.Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
            return userRepository.findByUsername(ud.getUsername())
                    .orElseThrow(() -> new BusinessException("Администратор не найден", "USER_NOT_FOUND"));
        }
        throw new BusinessException("Неверная аутентификация", "INVALID_AUTH");
    }
}
