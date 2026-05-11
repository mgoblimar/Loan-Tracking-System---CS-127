package com.pookiebear278.loan_tracker.repo;

import com.pookiebear278.loan_tracker.domain.Group;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepo extends JpaRepository<Group, String> {
}
