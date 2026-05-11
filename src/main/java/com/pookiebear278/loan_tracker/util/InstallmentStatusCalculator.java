package com.pookiebear278.loan_tracker.util;


import com.pookiebear278.loan_tracker.domain.enums.InstallmentStatus;
import com.pookiebear278.loan_tracker.domain.enums.PaymentFrequency;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class InstallmentStatusCalculator {

    private InstallmentStatusCalculator(){}

    /**
     * Returns the status of a specific term number (1-based).
     *
     * @param termNumber     which term to evaluate (1 = first term)
     * @param startDate      when the first payment was due
     * @param frequency      MONTHLY or WEEKLY
     * @param paidTerms      how many terms have been fully paid
     * @param skippedTerms   how many terms the user has manually skipped
     * @param totalTerms     total number of terms
     */

    public static InstallmentStatus compute(
            int termNumber,
            LocalDate startDate,
            PaymentFrequency frequency,
            int paidTerms,
            int skippedTerms,
            int totalTerms
            ) {

        LocalDate today = LocalDate.now();
        LocalDate termDueDate = getDueDate(startDate, frequency, termNumber);

        // Not Started Yet
        if (today.isBefore(startDate)){
            return InstallmentStatus.NOT_STARTED;
        }

        // Term has been paid
        if (termNumber <= paidTerms) {
            return InstallmentStatus.PAID;
        }

        // Term has been Skipped
        if (termNumber <= paidTerms + skippedTerms) {
            return InstallmentStatus.SKIPPED;
        }

        // Term due date has passed and not paid
        if (today.isAfter(termDueDate)) {
            return InstallmentStatus.DELINQUENT;
        }

        // Term is upcoming or currently due
        return InstallmentStatus.UNPAID;
    }

    public static LocalDate getDueDate(LocalDate startDate, PaymentFrequency frequency, int termNumber) {
        return switch (frequency) {
            case MONTHLY -> startDate.plusMonths(termNumber);
            case WEEKLY -> startDate.plusWeeks(termNumber);
        };
    }

    public static int elapsedTerms(LocalDate startDate, PaymentFrequency frequency) {
        LocalDate today = LocalDate.now();
        if(today.isBefore(startDate)){
            return 0;
        }

        return switch(frequency){
            case MONTHLY -> (int) ChronoUnit.MONTHS.between(startDate, today) + 1;
            case WEEKLY ->  (int) ChronoUnit.WEEKS.between(startDate, today) + 1 ;
        };

    }


}
