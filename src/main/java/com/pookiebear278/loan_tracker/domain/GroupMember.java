package com.pookiebear278.loan_tracker.domain;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "group_members")
public class GroupMember {

    @Id
    @UuidGenerator
    @Column(name = "id", unique = true, updatable = false)
    private String id;

    @ManyToOne
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;
}
