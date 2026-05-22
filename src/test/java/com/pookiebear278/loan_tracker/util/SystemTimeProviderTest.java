package com.pookiebear278.loan_tracker.util;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class SystemTimeProviderTest {

    @BeforeEach
    @AfterEach
    void cleanup() {
        SystemTimeProvider.clearSimulatedDate();
    }

    @Test
    void testDefaultTime() {
        assertNull(SystemTimeProvider.getSimulatedDate());
        assertEquals(LocalDate.now(), SystemTimeProvider.now());
    }

    @Test
    void testSetSimulatedTime() {
        LocalDate customDate = LocalDate.of(2026, 12, 25);
        SystemTimeProvider.setSimulatedDate(customDate);
        
        assertEquals(customDate, SystemTimeProvider.getSimulatedDate());
        assertEquals(customDate, SystemTimeProvider.now());
    }

    @Test
    void testClearSimulatedTime() {
        LocalDate customDate = LocalDate.of(2026, 12, 25);
        SystemTimeProvider.setSimulatedDate(customDate);
        assertEquals(customDate, SystemTimeProvider.now());

        SystemTimeProvider.clearSimulatedDate();
        assertNull(SystemTimeProvider.getSimulatedDate());
        assertEquals(LocalDate.now(), SystemTimeProvider.now());
    }
}
