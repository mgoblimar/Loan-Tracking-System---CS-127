package com.pookiebear278.loan_tracker.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pookiebear278.loan_tracker.domain.enums.InstallmentStatus;
import com.pookiebear278.loan_tracker.domain.enums.PaymentFrequency;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "installment_details")
public class InstallmentDetail {

    @Id
    @UuidGenerator
    @Column(name = "id", unique = true, updatable = false)
    private String id;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "entry_id", nullable = false)
    private Entry entry;

    // Not stored in DB
    @Transient
    private InstallmentStatus status;

    @Column(nullable = false)
    private LocalDate startDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentFrequency paymentFrequency;

    @Column(nullable = false)
    private Integer paymentTerms;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal paymentAmountPerTerm;

    private String notes;


    // To track which terms the user manually skipped
    private Integer skippedTerms = 0;

    @PrePersist
    public void setDefaults(){
        if (this.skippedTerms == null) {
            this.skippedTerms = 0;
        }
    }
}
