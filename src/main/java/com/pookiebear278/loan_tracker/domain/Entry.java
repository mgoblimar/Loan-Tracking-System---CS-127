package com.pookiebear278.loan_tracker.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.pookiebear278.loan_tracker.domain.enums.PaymentStatus;
import com.pookiebear278.loan_tracker.domain.enums.TransactionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Table(name = "entries")
public class Entry {
    @Id
    @UuidGenerator
    @Column(name = "id", unique = true, updatable = false)
    private String id;

    @Column(nullable = false)
    private String name;


    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType transactionType;


    private LocalDate dateBorrowed;
    private LocalDate   dateFullyPaid;

    @ManyToOne
    @JoinColumn(name = "borrower_person_id")
    private Person borrowerPerson;

    @ManyToOne
    @JoinColumn(name = "borrower_group_id")
    private Group borrowerGroup;

    @ManyToOne
    @JoinColumn(name = "lender_id", nullable = false)
    private Person lender;

    @Column (nullable = false, precision = 19, scale = 4)
    private BigDecimal amountBorrowed;

    @Column(nullable = false, precision = 19, scale =4)
    private BigDecimal  amountRemaining;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status =  PaymentStatus.UNPAID;

    private String notes;
    private String paymentNotes;


    private String receipt;

    @Column(updatable = false)
    private String referenceId;



    @JsonIgnore
    @OneToMany(mappedBy = "entry",  cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Payment> payments = new ArrayList<>();


    @JsonIgnore
    @OneToOne(mappedBy = "entry", cascade = CascadeType.ALL, orphanRemoval = true)
    private InstallmentDetail installmentDetail;

    @JsonIgnore
    @OneToMany(mappedBy = "entry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PaymentAllocation> paymentAllocation = new ArrayList<>();


    // --- Helper Methods ---
    public String getBorrowerInitial() {
        String borrowerName = null;
        if (this.borrowerPerson != null) {
            borrowerName = this.borrowerPerson.getName();
        } else if (this.borrowerGroup != null) {
            borrowerName = this.borrowerGroup.getName();
        }
        return extractInitials(borrowerName);
    }

    public String getLenderInitial() {
        if (this.lender == null) return "";
        return extractInitials(this.lender.getName());
    }

    public String extractInitials(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) return "";
        String[] parts = fullName.trim().split("\\s+");
        StringBuilder initials = new StringBuilder();
        for (String part : parts) {
            if(!part.isEmpty()){
                initials.append(part.charAt(0));
            }
        }
        return initials.toString().toUpperCase();
    }

    @PrePersist
    public void generateReferenceId(){

        if (this.status == null) {
            this.status = PaymentStatus.UNPAID;
        }

        if (this.amountRemaining == null && this.amountBorrowed != null){
            this.amountRemaining = this.amountBorrowed;
        }

        String initials = getBorrowerInitial() + getLenderInitial();

        String uniquePart = UUID.randomUUID().toString().substring(0,8);

        this.referenceId = initials + "-" + uniquePart;


    }

}
