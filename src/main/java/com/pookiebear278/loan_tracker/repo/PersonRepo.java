package com.pookiebear278.loan_tracker.repo;

import com.pookiebear278.loan_tracker.domain.Person;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonRepo extends JpaRepository<Person, String> {

}
