package com.pookiebear278.loan_tracker.util;

import java.time.LocalDate;

public class SystemTimeProvider {
    private static LocalDate simulatedDate = null;

    private SystemTimeProvider() {}

    public static LocalDate now() {
        if (simulatedDate != null) {
            return simulatedDate;
        }
        return LocalDate.now();
    }

    public static LocalDate getSimulatedDate() {
        return simulatedDate;
    }

    public static void setSimulatedDate(LocalDate date) {
        simulatedDate = date;
    }

    public static void clearSimulatedDate() {
        simulatedDate = null;
    }
}
