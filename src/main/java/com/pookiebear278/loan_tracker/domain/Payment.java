package com.pookiebear278.loan_tracker.domain;


import com.fasterxml.jackson.annotation.JsonIgnore;
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
@Table(name = "payments")
public class Payment {

    @Id
    @UuidGenerator
    @Column(name = "id", unique = true, updatable = false)
    private String id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "entry_id", nullable = false)
    private Entry entry;

    @Column(nullable = false )
    private LocalDate paymentDate = LocalDate.now();

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal paymentAmount;


    @ManyToOne
    @JoinColumn(name = "payee_id", nullable = false)
    private Person payee;


    private String proof;
    private String notes;

    @PrePersist
    public void setDefault(){
        if(this.paymentDate == null){
            this.paymentDate = LocalDate.now();
        }
    }

}
