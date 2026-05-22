package com.pookiebear278.loan_tracker.controller;

import com.pookiebear278.loan_tracker.util.SystemTimeProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class SystemDateControllerTest {

    private final SystemDateController controller = new SystemDateController();

    @BeforeEach
    @AfterEach
    void cleanup() {
        SystemTimeProvider.clearSimulatedDate();
    }

    @Test
    void testGetDefaultDate() {
        ResponseEntity<LocalDate> response = controller.getSimulatedDate();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNull(response.getBody());
    }

    @Test
    void testSetSimulatedDate() {
        String targetDate = "2026-10-31";
        ResponseEntity<LocalDate> response = controller.setSimulatedDate(targetDate);
        
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(LocalDate.parse(targetDate), response.getBody());
        assertEquals(LocalDate.parse(targetDate), SystemTimeProvider.getSimulatedDate());
        assertEquals(LocalDate.parse(targetDate), SystemTimeProvider.now());

        // Test GET returns the simulated date
        ResponseEntity<LocalDate> getResponse = controller.getSimulatedDate();
        assertEquals(HttpStatus.OK, getResponse.getStatusCode());
        assertEquals(LocalDate.parse(targetDate), getResponse.getBody());
    }

    @Test
    void testClearSimulatedDate() {
        SystemTimeProvider.setSimulatedDate(LocalDate.of(2026, 10, 31));

        ResponseEntity<Void> response = controller.clearSimulatedDate();
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());

        assertNull(SystemTimeProvider.getSimulatedDate());
        assertEquals(LocalDate.now(), SystemTimeProvider.now());
    }
}

