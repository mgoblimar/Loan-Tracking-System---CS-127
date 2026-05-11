package com.pookiebear278.loan_tracker.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "persons")
public class Person {
    @Id
    @UuidGenerator
    @Column(name = "id", unique = true, updatable = false)
    private String id;

    @Column(nullable = false)
    private String name;

    private String contactInfo;
}
