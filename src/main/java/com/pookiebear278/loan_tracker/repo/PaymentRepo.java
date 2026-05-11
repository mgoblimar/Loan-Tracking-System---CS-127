package com.pookiebear278.loan_tracker.repo;

import com.pookiebear278.loan_tracker.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepo extends JpaRepository<Payment, String> {
    List<Payment> findByEntryId(String entryId);
}
