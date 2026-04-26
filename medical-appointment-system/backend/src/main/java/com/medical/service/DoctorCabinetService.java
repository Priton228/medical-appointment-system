package com.medical.service;

import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.doctor.DoctorDashboardResponse;
import com.medical.dto.doctor.RescheduleAppointmentRequest;
import com.medical.dto.doctor.UpdateAppointmentStatusRequest;
import com.medical.dto.doctor.UpsertSlotRequest;
import com.medical.entity.Appointment;
import com.medical.entity.AppointmentStatus;
import com.medical.entity.Doctor;
import com.medical.entity.NotificationType;
import com.medical.entity.Patient;
import com.medical.entity.Slot;
import com.medical.entity.User;
import com.medical.entity.UserNotification;
import com.medical.exception.BusinessException;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.DoctorRepository;
import com.medical.repository.SlotRepository;
import com.medical.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorCabinetService {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final SlotRepository slotRepository;
    private final UserNotificationRepository userNotificationRepository;

    @Transactional(readOnly = true)
    public DoctorDashboardResponse getDashboard(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        long todayAppointments = appointmentRepository.findByDoctorAndSlotDateOrderBySlotStartTimeAsc(doctor, LocalDate.now()).size();
        long totalAppointments = appointmentRepository.countByDoctor(doctor);
        long completedAppointments = appointmentRepository.countByDoctorAndStatus(doctor, AppointmentStatus.COMPLETED);
        long activeSlots = slotRepository.countByDoctorAndIsBookedFalse(doctor);
        return new DoctorDashboardResponse(todayAppointments, totalAppointments, completedAppointments, activeSlots);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getTodayAppointments(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        return appointmentRepository.findByDoctorAndSlotDateOrderBySlotStartTimeAsc(doctor, LocalDate.now())
                .stream()
                .map(this::toAppointmentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAllAppointments(Authentication authentication) {
        Doctor doctor = getCurrentDoctor(authentication);
        return appointmentRepository.findByDoctorOrderBySlotDateDescSlotStartTimeDesc(doctor).stream()
                .map(this::toAppointmentResponse)
                .toList();
    }

    @Transactional
    public AppointmentResponse updateAppointmentStatus(Authentication authentication, Long appointmentId, UpdateAppointmentStatusRequest request) {
        Doctor doctor = getCurrentDoctor(authentication);
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));
        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Нельзя изменять чужую запись", "FORBIDDEN_APPOINTMENT_UPDATE");
        }

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
                    "Врач завершил приём " + saved.getSlot().getDate() + " " + saved.getSlot().getStartTime()
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
            appointment.setCancelledBy("DOCTOR");
            appointment.setCancelReason(trimToNull(request.cancelReason()) != null ? request.cancelReason().trim() : "Отменено врачом");
            Appointment saved = appointmentRepository.save(appointment);
            notifyPatient(
                    appointment.getPatient().getUser(),
                    NotificationType.APPOINTMENT_CANCELLED,
                    "Запись отменена",
                    "Врач отменил запись на " + saved.getSlot().getDate() + " " + saved.getSlot().getStartTime()
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
    public AppointmentResponse rescheduleAppointment(Authentication authentication, Long appointmentId, RescheduleAppointmentRequest request) {
        Doctor doctor = getCurrentDoctor(authentication);
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new BusinessException("Запись не найдена", "APPOINTMENT_NOT_FOUND"));
        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Нельзя переносить чужую запись", "FORBIDDEN_APPOINTMENT_UPDATE");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BusinessException("Нельзя перенести эту запись", "APPOINTMENT_NOT_RESCHEDULABLE");
        }

        Slot newSlot = slotRepository.findById(request.newSlotId())
                .orElseThrow(() -> new BusinessException("Слот не найден", "SLOT_NOT_FOUND"));
        if (Boolean.TRUE.equals(newSlot.getIsBooked()) || Boolean.TRUE.equals(newSlot.getIsBlocked())) {
            throw new BusinessException("Слот недоступен", "SLOT_NOT_AVAILABLE");
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
        appointment.setStatus(AppointmentStatus.RESCHEDULED);
        Appointment saved = appointmentRepository.save(appointment);

        notifyPatient(
                patient.getUser(),
                NotificationType.APPOINTMENT_RESCHEDULED,
                "Запись перенесена",
                "Новое время: " + saved.getSlot().getDate() + " " + saved.getSlot().getStartTime() + ", врач: " + saved.getDoctor().getUser().getFullName()
        );
        return toAppointmentResponse(saved);
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
            throw new BusinessException("Слот с таким временем уже существует", "DUPLICATE_SLOT");
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
                .orElseThrow(() -> new BusinessException("Слот не найден", "SLOT_NOT_FOUND"));
        if (!slot.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Нельзя редактировать чужой слот", "FORBIDDEN_SLOT_UPDATE");
        }
        if (Boolean.TRUE.equals(slot.getIsBooked())) {
            throw new BusinessException("Нельзя изменить уже забронированный слот", "BOOKED_SLOT_UPDATE");
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
                .orElseThrow(() -> new BusinessException("Слот не найден", "SLOT_NOT_FOUND"));
        if (!slot.getDoctor().getId().equals(doctor.getId())) {
            throw new BusinessException("Нельзя удалить чужой слот", "FORBIDDEN_SLOT_DELETE");
        }
        if (Boolean.TRUE.equals(slot.getIsBooked())) {
            throw new BusinessException("Нельзя удалить уже забронированный слот", "BOOKED_SLOT_DELETE");
        }
        slotRepository.delete(slot);
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

    private Doctor getCurrentDoctor(Authentication authentication) {
        return doctorRepository.findByUserEmail(authentication.getName())
                .orElseThrow(() -> new BusinessException("Профиль врача не найден", "DOCTOR_NOT_FOUND"));
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
            throw new BusinessException("Время окончания должно быть позже времени начала", "INVALID_SLOT_TIME");
        }
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
