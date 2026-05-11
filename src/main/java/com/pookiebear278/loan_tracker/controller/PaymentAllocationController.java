package com.pookiebear278.loan_tracker.controller;

import com.pookiebear278.loan_tracker.domain.PaymentAllocation;
import com.pookiebear278.loan_tracker.service.PaymentAllocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/entry/{entryId}/allocation")
@RequiredArgsConstructor
public class PaymentAllocationController {
    private final PaymentAllocationService paymentAllocationService;

    @GetMapping
    public ResponseEntity<List<PaymentAllocation>> getAllocations(@PathVariable String entryId) {
        return ResponseEntity.ok(paymentAllocationService.getAllocation(entryId));
    }

    @PostMapping
    public ResponseEntity<PaymentAllocation> createdAllocation(
            @PathVariable String entryId,
            @RequestBody PaymentAllocation paymentAllocation
    ) {
        PaymentAllocation created = paymentAllocationService.createAllocation(entryId, paymentAllocation);
        return ResponseEntity.created(URI.create("/entry/" + entryId + "/allocation")).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PaymentAllocation> updatedAllocation(
            @PathVariable String entryId,
            @PathVariable String id,
            @RequestBody PaymentAllocation allocation
    ) {
        return ResponseEntity.ok(paymentAllocationService.updateAllocation(id, allocation));
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAllocation(
            @PathVariable String entryId,
            @PathVariable String id
    ) {
        paymentAllocationService.deleteAllocation(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/divide-equally")
    public ResponseEntity<List<PaymentAllocation>> divideEqually(@PathVariable String entryId) {
        return ResponseEntity.ok(paymentAllocationService.divideEqually(entryId));
    }

    @PostMapping("/divide-by-percent")
    public ResponseEntity<List<PaymentAllocation>> divideByPercent(@PathVariable String entryId, @RequestBody Map<String, BigDecimal> personIdToPercent) {
        return ResponseEntity.ok(paymentAllocationService.divideByPercent(entryId, personIdToPercent));

    }

    @PostMapping("/divide-by-amount")
    public ResponseEntity<List<PaymentAllocation>> divideByAmount(@PathVariable String entryId, @RequestBody Map<String, BigDecimal> personIdToAmount) {
        return ResponseEntity.ok(paymentAllocationService.divideByAmount(entryId, personIdToAmount));
    }
}
