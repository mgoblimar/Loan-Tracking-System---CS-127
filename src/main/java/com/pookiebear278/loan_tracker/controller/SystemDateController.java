package com.pookiebear278.loan_tracker.controller;

import com.pookiebear278.loan_tracker.util.SystemTimeProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/system/date")
public class SystemDateController {

    @GetMapping
    public ResponseEntity<LocalDate> getSimulatedDate() {
        return ResponseEntity.ok(SystemTimeProvider.getSimulatedDate());
    }

    @PostMapping
    public ResponseEntity<LocalDate> setSimulatedDate(@RequestParam String date) {
        LocalDate parsedDate = LocalDate.parse(date);
        SystemTimeProvider.setSimulatedDate(parsedDate);
        return ResponseEntity.ok(parsedDate);
    }

    @DeleteMapping
    public ResponseEntity<Void> clearSimulatedDate() {
        SystemTimeProvider.clearSimulatedDate();
        return ResponseEntity.noContent().build();
    }
}
