package com.medical.repository;

import com.medical.entity.Doctor;
import com.medical.entity.Slot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SlotRepository extends JpaRepository<Slot, Long> {
    List<Slot> findByDoctorAndDateOrderByStartTime(Doctor doctor, LocalDate date);
    List<Slot> findByDoctorAndDateAndIsBookedFalseAndIsBlockedFalseOrderByStartTime(Doctor doctor, LocalDate date);
    List<Slot> findByDoctorOrderByDateAscStartTimeAsc(Doctor doctor);
    List<Slot> findByDoctorIdOrderByDateAscStartTimeAsc(Long doctorId);
    long countByDoctor(Doctor doctor);
    long countByDoctorAndIsBookedFalse(Doctor doctor);
    Boolean existsByDoctorAndDateAndStartTime(Doctor doctor, LocalDate date, java.time.LocalTime startTime);

    @Query("SELECT s FROM Slot s WHERE s.doctor.id = :doctorId AND s.date BETWEEN :startDate AND :endDate ORDER BY s.date, s.startTime")
    List<Slot> findByDoctorIdAndDateBetween(Long doctorId, LocalDate startDate, LocalDate endDate);
}