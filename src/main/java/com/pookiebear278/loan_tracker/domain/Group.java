package com.pookiebear278.loan_tracker.domain;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "loan_groups")
public class Group {
    @Id
    @UuidGenerator
    @Column(name = "id", unique = true, updatable = false)
    private String id;

    @Column(nullable = false)
    private String name;

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GroupMember> members = new ArrayList<>();
}
