package com.medical.repository;

import com.medical.entity.Appointment;
import com.medical.entity.AppointmentStatus;
import com.medical.entity.Doctor;
import com.medical.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    long countByStatus(AppointmentStatus status);
    long countByDoctor(Doctor doctor);
    long countByDoctorAndStatus(Doctor doctor, AppointmentStatus status);
    long countByPatient(Patient patient);
    long countByPatientAndStatusIn(Patient patient, List<AppointmentStatus> statuses);
    List<Appointment> findTop10ByDoctorOrderBySlotDateAscSlotStartTimeAsc(Doctor doctor);
    List<Appointment> findTop5ByPatientAndStatusInOrderBySlotDateAscSlotStartTimeAsc(Patient patient, List<AppointmentStatus> statuses);
    List<Appointment> findByDoctorAndSlotDateOrderBySlotStartTimeAsc(Doctor doctor, LocalDate date);
    List<Appointment> findByDoctorOrderBySlotDateDescSlotStartTimeDesc(Doctor doctor);
    List<Appointment> findByPatientOrderBySlotDateDescSlotStartTimeDesc(Patient patient);
    List<Appointment> findAllByOrderBySlotDateDescSlotStartTimeDesc();
}
