package com.pookiebear278.loan_tracker.repo;

import com.pookiebear278.loan_tracker.domain.PaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentAllocationRepo extends JpaRepository<PaymentAllocation, String> {
    List<PaymentAllocation> findByEntryId(String entryId);
}
