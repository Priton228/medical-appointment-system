package com.medical.service;

import com.medical.dto.admin.AdminDashboardResponse;
import com.medical.dto.admin.UpdateUserRequest;
import com.medical.dto.admin.UpsertDoctorRequest;
import com.medical.dto.admin.UpsertSymptomRequest;
import com.medical.dto.admin.UserResponse;
import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.DoctorResponse;
import com.medical.dto.common.SpecializationResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.common.SymptomResponse;
import com.medical.dto.doctor.RescheduleAppointmentRequest;
import com.medical.dto.doctor.UpdateAppointmentStatusRequest;
import com.medical.entity.Appointment;
import com.medical.entity.AppointmentStatus;
import com.medical.entity.Doctor;
import com.medical.entity.NotificationType;
import com.medical.entity.Patient;
import com.medical.entity.Role;
import com.medical.entity.Specialization;
import com.medical.entity.Slot;
import com.medical.entity.Symptom;
import com.medical.entity.User;
import com.medical.entity.UserNotification;
import com.medical.exception.BusinessException;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.DoctorRepository;
import com.medical.repository.PatientRepository;
import com.medical.repository.SpecializationRepository;
import com.medical.repository.SlotRepository;
import com.medical.repository.SymptomRepository;
import com.medical.repository.UserNotificationRepository;
import com.medical.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminCabinetService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final SlotRepository slotRepository;
    private final SymptomRepository symptomRepository;
    private final SpecializationRepository specializationRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserNotificationRepository userNotificationRepository;

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
    public List<UserResponse> getUsers(String search, Role role) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
        return userRepository.findAll().stream()
                .filter(user -> role == null || user.getRole() == role)
                .filter(user -> normalizedSearch.isBlank()
                        || user.getFullName().toLowerCase().contains(normalizedSearch)
                        || user.getEmail().toLowerCase().contains(normalizedSearch))
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getRole(),
                        user.getIsBlocked()
                ))
                .toList();
    }

    @Transactional
    public UserResponse updateUser(Long userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Пользователь не найден", "USER_NOT_FOUND"));
        if (!user.getEmail().equalsIgnoreCase(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Email уже используется", "EMAIL_ALREADY_EXISTS");
        }
        user.setFullName(request.fullName());
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
                saved.getEmail(),
                saved.getPhone(),
                saved.getRole(),
                saved.getIsBlocked()
        );
    }

    @Transactional
    public UserResponse setUserBlocked(Long userId, boolean blocked) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Пользователь не найден", "USER_NOT_FOUND"));
        user.setIsBlocked(blocked);
        User saved = userRepository.save(user);
        return new UserResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getPhone(),
                saved.getRole(),
                saved.getIsBlocked()
        );
    }

    @Transactional
    public DoctorResponse createDoctor(UpsertDoctorRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Пользователь с таким email уже существует", "EMAIL_ALREADY_EXISTS");
        }

        User user = User.builder()
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
                .orElseThrow(() -> new BusinessException("Врач не найден", "DOCTOR_NOT_FOUND"));
        User user = doctor.getUser();

        if (!user.getEmail().equalsIgnoreCase(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Пользователь с таким email уже существует", "EMAIL_ALREADY_EXISTS");
        }

        user.setFullName(request.fullName());
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
                .orElseThrow(() -> new BusinessException("Врач не найден", "DOCTOR_NOT_FOUND"));
        if (appointmentRepository.countByDoctor(doctor) > 0 || slotRepository.countByDoctor(doctor) > 0) {
            throw new BusinessException("Нельзя удалить врача с записями или слотами", "DOCTOR_HAS_DEPENDENCIES");
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
            throw new BusinessException("Симптом уже существует", "SYMPTOM_EXISTS");
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
                .orElseThrow(() -> new BusinessException("Симптом не найден", "SYMPTOM_NOT_FOUND"));
        symptom.setName(request.name());
        symptom.setDescription(request.description());
        symptom.setIsUrgent(request.isUrgent() != null && request.isUrgent());
        Symptom saved = symptomRepository.save(symptom);
        return new SymptomResponse(saved.getId(), saved.getName(), saved.getDescription(), saved.getIsUrgent());
    }

    @Transactional
    public void deleteSymptom(Long symptomId) {
        if (!symptomRepository.existsById(symptomId)) {
            throw new BusinessException("Симптом не найден", "SYMPTOM_NOT_FOUND");
        }
        symptomRepository.deleteById(symptomId);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAllAppointments() {
        return appointmentRepository.findAllByOrderBySlotDateDescSlotStartTimeDesc().stream()
                .map(this::toAppointmentResponse)
                .toList();
    }

    @Transactional
    public AppointmentResponse updateAppointmentStatus(Long appointmentId, UpdateAppointmentStatusRequest request) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));

        AppointmentStatus newStatus = request.status();
        if (newStatus == AppointmentStatus.RESCHEDULED) {
            throw new BusinessException("Для переноса используйте отдельный запрос", "USE_RESCHEDULE_ENDPOINT");
        }

        if (newStatus == AppointmentStatus.COMPLETED) {
            if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
                throw new BusinessException("Нельзя завершить отменённую запись", "INVALID_STATUS_TRANSITION");
            }
            appointment.setStatus(AppointmentStatus.COMPLETED);
            appointment.setDoctorNotes(trimToNull(request.doctorNotes()));
            appointment.setDiagnosis(trimToNull(request.diagnosis()));
            appointment.setTreatmentRecommendations(trimToNull(request.treatmentRecommendations()));
            Appointment saved = appointmentRepository.save(appointment);
            notifyPatient(
                    appointment.getPatient().getUser(),
                    NotificationType.APPOINTMENT_COMPLETED,
                    "Приём завершён",
                    "Администратор отметил завершение приёма " + saved.getSlot().getDate() + " " + saved.getSlot().getStartTime()
            );
            return toAppointmentResponse(saved);
        }

        if (newStatus == AppointmentStatus.CANCELLED) {
            if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
                throw new BusinessException("Нельзя отменить завершённую запись", "INVALID_STATUS_TRANSITION");
            }
            releaseSlot(appointment.getSlot());
            appointment.setStatus(AppointmentStatus.CANCELLED);
            appointment.setCancelledAt(LocalDateTime.now());
            appointment.setCancelledBy("ADMIN");
            appointment.setCancelReason(trimToNull(request.cancelReason()) != null ? request.cancelReason().trim() : "Отменено администратором");
            Appointment saved = appointmentRepository.save(appointment);
            notifyPatient(
                    appointment.getPatient().getUser(),
                    NotificationType.APPOINTMENT_CANCELLED,
                    "Запись отменена",
                    "Запись на " + saved.getSlot().getDate() + " " + saved.getSlot().getStartTime() + " отменена администратором"
            );
            return toAppointmentResponse(saved);
        }

        if (List.of(AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.MISSED).contains(newStatus)) {
            if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
                throw new BusinessException("Недопустимый переход статуса", "INVALID_STATUS_TRANSITION");
            }
            appointment.setStatus(newStatus);
            return toAppointmentResponse(appointmentRepository.save(appointment));
        }

        throw new BusinessException("Недопустимый статус", "INVALID_STATUS");
    }

    @Transactional
    public AppointmentResponse rescheduleAppointment(Long appointmentId, RescheduleAppointmentRequest request) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));
        if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BusinessException("Нельзя перенести эту запись", "APPOINTMENT_NOT_RESCHEDULABLE");
        }

        Slot newSlot = slotRepository.findById(request.newSlotId())
                .orElseThrow(() -> new BusinessException("Слот не найден", "SLOT_NOT_FOUND"));
        if (Boolean.TRUE.equals(newSlot.getIsBooked()) || Boolean.TRUE.equals(newSlot.getIsBlocked())) {
            throw new BusinessException("Слот недоступен", "SLOT_NOT_AVAILABLE");
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
        Appointment saved = appointmentRepository.save(appointment);

        notifyPatient(
                patient.getUser(),
                NotificationType.APPOINTMENT_RESCHEDULED,
                "Запись перенесена",
                "Администратор перенёс запись: " + saved.getSlot().getDate() + " " + saved.getSlot().getStartTime() + ", врач: " + saved.getDoctor().getUser().getFullName()
        );
        return toAppointmentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SlotResponse> getDoctorSchedule(Long doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new BusinessException("Врач не найден", "DOCTOR_NOT_FOUND");
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

    private void notifyPatient(User user, NotificationType type, String title, String message) {
        UserNotification notification = UserNotification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        userNotificationRepository.save(notification);
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
                    .description("Профиль врача")
                    .experienceYears(0)
                    .education("Не указано")
                    .build();
            doctorRepository.save(doctor);
        }
    }

    private Specialization resolveSpecialization(Long specializationId) {
        if (specializationId == null) {
            return null;
        }
        return specializationRepository.findById(specializationId)
                .orElseThrow(() -> new BusinessException("Специализация не найдена", "SPECIALIZATION_NOT_FOUND"));
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
}
