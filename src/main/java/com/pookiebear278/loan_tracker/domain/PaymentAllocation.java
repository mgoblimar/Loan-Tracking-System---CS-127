package com.pookiebear278.loan_tracker.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pookiebear278.loan_tracker.domain.enums.PaymentAllocationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payment_allocations")
public class PaymentAllocation {

    @Id
    @UuidGenerator
    @Column(name = "id", unique = true, updatable = false)
    private String id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "entry_id", nullable = false)
    private Entry entry;


    @Column(nullable = false)
    private String description;

    @ManyToOne
    @JoinColumn(name = "payee_id", nullable = false)
    private Person payee;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    private String notes;

    @Transient
    private BigDecimal percentageOfTotal;

    @Transient
    private PaymentAllocationStatus status;
}
