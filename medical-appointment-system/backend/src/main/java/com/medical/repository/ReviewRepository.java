package com.medical.repository;

import com.medical.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);

    List<Review> findAllByOrderByCreatedAtDesc();

    Optional<Review> findByAppointmentId(Long appointmentId);

    boolean existsByAppointmentId(Long appointmentId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.doctor.id = :doctorId")
    Double calculateAverageRatingByDoctorId(Long doctorId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.doctor.id = :doctorId")
    Long countByDoctorId(Long doctorId);
}
