package com.pookiebear278.loan_tracker.controller;


import com.pookiebear278.loan_tracker.domain.Payment;
import com.pookiebear278.loan_tracker.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/entry/{entryId}/payment")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @GetMapping
    public ResponseEntity<List<Payment>> getPayments(@PathVariable String entryId) {
        return ResponseEntity.ok(paymentService.getPaymentsForEntry(entryId));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<Payment> getPayment(
            @PathVariable String entryId,
            @PathVariable String paymentId
    ) {
        return ResponseEntity.ok(paymentService.getPayment(paymentId));
    }

    @PostMapping
    public ResponseEntity<Payment> recordPayment(
            @PathVariable String entryId,
            @RequestBody Payment payment
    ) {
        Payment recorded = paymentService.recordPayment(entryId, payment);
        return ResponseEntity.created(URI.create("/entry/" + entryId + "/payment/" + recorded.getId())).body(recorded);

    }


    @DeleteMapping("/{paymentId}")
    public ResponseEntity<Void> deletePayment(
            @PathVariable String entryId,
            @PathVariable String paymentId
    ){
        paymentService.deletePayment(paymentId);
        return ResponseEntity.noContent().build();
    }
}
