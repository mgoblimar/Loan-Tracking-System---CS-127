package com.pookiebear278.loan_tracker.repo;

import com.pookiebear278.loan_tracker.domain.InstallmentDetail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InstallmentDetailRepo extends JpaRepository<InstallmentDetail, String> {
    Optional<InstallmentDetail> findByEntryId(String entryId);
}
