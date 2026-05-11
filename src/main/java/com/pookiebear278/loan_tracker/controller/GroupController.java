package com.pookiebear278.loan_tracker.controller;

import com.pookiebear278.loan_tracker.domain.Group;
import com.pookiebear278.loan_tracker.domain.GroupMember;
import com.pookiebear278.loan_tracker.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/group")
@RequiredArgsConstructor
public class GroupController {
    private final GroupService groupService;

    @GetMapping
    public ResponseEntity<List<Group>> getAllGroups() {
        return ResponseEntity.ok(groupService.getAllGroups());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Group> getGroup(@PathVariable String id) {
        return ResponseEntity.ok(groupService.getGroup(id));
    }

    @PostMapping
    public ResponseEntity<Group> createGroup(@RequestBody Group group) {
        Group created = groupService.createGroup(group);
        return ResponseEntity.created(URI.create("/group/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Group> updateGroup(@PathVariable String id, @RequestBody Group group) {
        return ResponseEntity.ok(groupService.updateGroup(id, group));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable String id) {
        groupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<GroupMember>> getMembers(@PathVariable String groupId) {
        return ResponseEntity.ok(groupService.getMembers(groupId));
    }

    @PostMapping("/{groupId}/member/{personId}")
    public ResponseEntity<GroupMember> addMember(@PathVariable String groupId, @PathVariable String personId) {
        GroupMember member = groupService.addMember(groupId, personId);
        return ResponseEntity.created(URI.create("/group/" + groupId + "/members")).body(member);
    }

    @DeleteMapping("/member/{groupMemberId}")
    public ResponseEntity<Void> removeMember(@PathVariable String groupMemberId) {
        groupService.removeMember(groupMemberId);
        return ResponseEntity.noContent().build();
    }
}
