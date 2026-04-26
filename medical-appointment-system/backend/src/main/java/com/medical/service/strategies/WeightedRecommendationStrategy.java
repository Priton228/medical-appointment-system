package com.medical.service.strategies;

import com.medical.entity.Specialization;
import com.medical.entity.Symptom;
import com.medical.entity.SymptomSpecialization;
import com.medical.repository.SymptomSpecializationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WeightedRecommendationStrategy implements RecommendationStrategy {

    private final SymptomSpecializationRepository symptomSpecializationRepository;

    @Override
    public List<Specialization> recommendSpecializations(List<Symptom> symptoms) {
        List<Long> symptomIds = symptoms.stream().map(Symptom::getId).toList();
        List<SymptomSpecialization> symptomSpecializations = symptomSpecializationRepository.findAllBySymptomIds(symptomIds);
        
        return symptomSpecializations.stream()
                .map(SymptomSpecialization::getSpecialization)
                .distinct()
                .sorted(Comparator.comparingDouble(spec -> -calculateMatchScore(symptoms, spec)))
                .collect(Collectors.toList());
    }

    @Override
    public double calculateMatchScore(List<Symptom> symptoms, Specialization specialization) {
        double totalWeight = 0.0;
        double maxWeight = 0.0;

        List<Long> symptomIds = symptoms.stream().map(Symptom::getId).toList();
        List<SymptomSpecialization> symptomSpecializations = symptomSpecializationRepository.findAllBySymptomIds(symptomIds);
        
        for (SymptomSpecialization ss : symptomSpecializations) {
            if (ss.getSpecialization().getId().equals(specialization.getId())) {
                totalWeight += ss.getWeight().doubleValue();
            }
            maxWeight += 1.0;
        }

        return maxWeight > 0 ? totalWeight / maxWeight : 0.0;
    }
}
