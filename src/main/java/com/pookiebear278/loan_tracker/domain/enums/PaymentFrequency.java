package com.pookiebear278.loan_tracker.domain.enums;

public enum PaymentFrequency {
    MONTHLY("Monthly"),
    WEEKLY("Weekly");

    private final String description;
    PaymentFrequency(String description){
        this.description = description;
    }

    public String getDescription(){
        return description;
    }
}
