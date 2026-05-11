package com.pookiebear278.loan_tracker.repo;

import com.pookiebear278.loan_tracker.domain.Entry;
import com.pookiebear278.loan_tracker.domain.enums.PaymentStatus;
import com.pookiebear278.loan_tracker.domain.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


public interface EntryRepo extends JpaRepository<Entry, String> {
    List<Entry> findByBorrowerPersonId(String personId);
    List<Entry> findByBorrowerGroupId(String groupId);
    List<Entry> findByStatus (PaymentStatus status);
    List<Entry> findByTransactionType(TransactionType status);
    List<Entry> findByLenderId(String lenderId);
}
