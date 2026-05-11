package com.pookiebear278.loan_tracker.repo;

import com.pookiebear278.loan_tracker.domain.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupMemberRepo extends JpaRepository<GroupMember, String> {
    List<GroupMember> findByGroupId(String groupId);
}
