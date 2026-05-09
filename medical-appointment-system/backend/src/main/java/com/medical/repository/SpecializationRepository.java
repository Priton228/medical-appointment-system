package com.medical.repository;

import com.medical.entity.Specialization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpecializationRepository extends JpaRepository<Specialization, Long> {
    List<Specialization> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
