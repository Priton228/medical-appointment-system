package com.medical.repository;

import com.medical.entity.Appointment;
import com.medical.entity.AppointmentStatus;
import com.medical.entity.Doctor;
import com.medical.entity.Patient;
import com.medical.entity.Slot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Query("SELECT a FROM Appointment a JOIN FETCH a.slot s JOIN FETCH a.patient p JOIN FETCH p.user JOIN FETCH a.doctor d JOIN FETCH d.user WHERE a.status IN :statuses")
    List<Appointment> findByStatusInWithSlot(@Param("statuses") List<AppointmentStatus> statuses);
    long countByStatus(AppointmentStatus status);
    long countByDoctor(Doctor doctor);
    long countByDoctorAndStatus(Doctor doctor, AppointmentStatus status);
    long countByPatient(Patient patient);
    long countByPatientAndStatusIn(Patient patient, List<AppointmentStatus> statuses);
    List<Appointment> findTop10ByDoctorOrderBySlotDateAscSlotStartTimeAsc(Doctor doctor);
    List<Appointment> findTop5ByPatientAndStatusInOrderBySlotDateAscSlotStartTimeAsc(Patient patient, List<AppointmentStatus> statuses);
    List<Appointment> findByPatientAndStatusInOrderBySlotDateAscSlotStartTimeAsc(Patient patient, List<AppointmentStatus> statuses);
    List<Appointment> findByDoctorAndSlotDateOrderBySlotStartTimeAsc(Doctor doctor, LocalDate date);
    List<Appointment> findByDoctorOrderBySlotDateDescSlotStartTimeDesc(Doctor doctor);
    List<Appointment> findByPatientOrderBySlotDateDescSlotStartTimeDesc(Patient patient);
    List<Appointment> findAllByOrderBySlotDateDescSlotStartTimeDesc();
    List<Appointment> findByStatusIn(List<AppointmentStatus> statuses);
    boolean existsBySlotId(Long slotId);
    boolean existsByPatientAndSlot(Patient patient, Slot slot);
    boolean existsByPatientIdAndSlotId(Long patientId, Long slotId);

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient p JOIN FETCH p.user JOIN FETCH a.doctor d JOIN FETCH d.user WHERE a.id = :id")
    Optional<Appointment> findByIdWithUsers(@Param("id") Long id);
}
