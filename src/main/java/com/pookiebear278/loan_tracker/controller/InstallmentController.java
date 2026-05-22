package com.pookiebear278.loan_tracker.controller;

import com.pookiebear278.loan_tracker.domain.InstallmentDetail;
import com.pookiebear278.loan_tracker.domain.enums.InstallmentStatus;
import com.pookiebear278.loan_tracker.service.InstallmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/entry/{entryId}/installment")
@RequiredArgsConstructor
public class InstallmentController {
    private final InstallmentService installmentService;

    @GetMapping
    public ResponseEntity<InstallmentDetail> getInstallmentDetail(@PathVariable String entryId) {
        return ResponseEntity.ok(installmentService.getInstallmentDetail(entryId));
    }

    @PostMapping
    public ResponseEntity<InstallmentDetail> createInstallmentDetail(
            @PathVariable String entryId,
            @RequestBody InstallmentDetail detail
    ) {
        InstallmentDetail created = installmentService.createInstallmentDetail(entryId, detail);
        return ResponseEntity.created(URI.create("/entry/" + entryId + "/installment")).body(created);
    }

    @PutMapping
    public ResponseEntity<InstallmentDetail> updateInstallmentDetail(
            @PathVariable String entryId,
            @RequestBody InstallmentDetail detail
    ) {
        return ResponseEntity.ok(installmentService.updateInstallmentDetail(entryId, detail));

    }

    @PostMapping("/skip")
    public ResponseEntity<InstallmentDetail> skipTerm(
            @PathVariable String entryId,
            @RequestParam(required = false, defaultValue = "extend") String option
    ) {
        return ResponseEntity.ok(installmentService.skipTerm(entryId, option));
    }

    @GetMapping("/statuses")
    public ResponseEntity<List<InstallmentStatus>> getInstallmentDetailStatus(@PathVariable String entryId) {
        return ResponseEntity.ok(installmentService.getAllTermsStatuses(entryId));
    }
}
