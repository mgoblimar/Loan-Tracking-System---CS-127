package com.pookiebear278.loan_tracker.service;

import com.pookiebear278.loan_tracker.domain.Group;
import com.pookiebear278.loan_tracker.domain.GroupMember;
import com.pookiebear278.loan_tracker.domain.Person;
import com.pookiebear278.loan_tracker.exception.NotFoundException;
import com.pookiebear278.loan_tracker.repo.GroupMemberRepo;
import com.pookiebear278.loan_tracker.repo.GroupRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Transactional(rollbackOn = Exception.class)
@RequiredArgsConstructor
public class GroupService {
    private final GroupRepo groupRepo;
    private final GroupMemberRepo groupMemberRepo;
    private final PersonService personService;

    public List<Group> getAllGroups(){
        return groupRepo.findAll();
    }

    public Group getGroup(String id) {
        return groupRepo.findById(id).orElseThrow(() -> new NotFoundException("Group not found " + id));
    }

    public Group createGroup(Group group){
        return groupRepo.save(group);
    }

    public Group updateGroup(String id, Group updated){
        Group existing = getGroup(id);
        existing.setName(updated.getName());
        return groupRepo.save(existing);
    }

    public void deleteGroup(String id){
        groupRepo.delete(getGroup(id));
    }


    public GroupMember addMember(String groupId, String personId) {
        Group group = getGroup(groupId);
        Person person = personService.getPerson(personId);

        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setPerson(person);
        return groupMemberRepo.save(member);

    }

    public void removeMember(String groupMemberId){
        GroupMember member = groupMemberRepo.findById(groupMemberId).orElseThrow(() -> new NotFoundException("Member not found " + groupMemberId));
        groupMemberRepo.delete(member);
    }

    public List<GroupMember> getMembers(String groupId){
        getGroup(groupId);
        return groupMemberRepo.findByGroupId(groupId);
    }

}
