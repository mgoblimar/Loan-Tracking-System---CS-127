package com.pookiebear278.loan_tracker.util;

import com.pookiebear278.loan_tracker.domain.enums.InstallmentStatus;
import com.pookiebear278.loan_tracker.domain.enums.PaymentFrequency;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class InstallmentStatusCalculatorTest {

    @BeforeEach
    @AfterEach
    void cleanup() {
        SystemTimeProvider.clearSimulatedDate();
    }

    @Test
    void testNotStarted() {
        LocalDate startDate = LocalDate.of(2026, 6, 1);
        SystemTimeProvider.setSimulatedDate(LocalDate.of(2026, 5, 20));

        InstallmentStatus status = InstallmentStatusCalculator.compute(
                1, startDate, PaymentFrequency.MONTHLY, 0, 0, 10
        );
        assertEquals(InstallmentStatus.NOT_STARTED, status);
    }

    @Test
    void testPaid() {
        LocalDate startDate = LocalDate.of(2026, 6, 1);
        SystemTimeProvider.setSimulatedDate(LocalDate.of(2026, 6, 15));

        InstallmentStatus status = InstallmentStatusCalculator.compute(
                1, startDate, PaymentFrequency.MONTHLY, 1, 0, 10
        );
        assertEquals(InstallmentStatus.PAID, status);
    }

    @Test
    void testSkipped() {
        LocalDate startDate = LocalDate.of(2026, 6, 1);
        SystemTimeProvider.setSimulatedDate(LocalDate.of(2026, 6, 15));

        // term 1 is unpaid, but 1 is skipped
        InstallmentStatus status = InstallmentStatusCalculator.compute(
                1, startDate, PaymentFrequency.MONTHLY, 0, 1, 10
        );
        assertEquals(InstallmentStatus.SKIPPED, status);
    }

    @Test
    void testDelinquent() {
        LocalDate startDate = LocalDate.of(2026, 6, 1);
        // Let's set simulated date way past due date (term 1 due date is 2026-07-01)
        SystemTimeProvider.setSimulatedDate(LocalDate.of(2026, 7, 10));

        InstallmentStatus status = InstallmentStatusCalculator.compute(
                1, startDate, PaymentFrequency.MONTHLY, 0, 0, 10
        );
        assertEquals(InstallmentStatus.DELINQUENT, status);
    }

    @Test
    void testUnpaid() {
        LocalDate startDate = LocalDate.of(2026, 6, 1);
        // Simulated date is before term 1 due date (2026-07-01) but after start date
        SystemTimeProvider.setSimulatedDate(LocalDate.of(2026, 6, 15));

        InstallmentStatus status = InstallmentStatusCalculator.compute(
                1, startDate, PaymentFrequency.MONTHLY, 0, 0, 10
        );
        assertEquals(InstallmentStatus.UNPAID, status);
    }
}
