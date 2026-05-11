package com.pookiebear278.loan_tracker.controller;

import com.pookiebear278.loan_tracker.domain.Person;
import com.pookiebear278.loan_tracker.service.PersonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/person")
@RequiredArgsConstructor
public class PersonController {
    private final PersonService personService;

    @GetMapping
    public ResponseEntity<List<Person>> getAllPersons() {
        return ResponseEntity.ok(personService.getAllPerson());
    }


    @GetMapping("/{id}")
    public ResponseEntity<Person> getPerson(@PathVariable String id) {
        return ResponseEntity.ok(personService.getPerson(id));
    }

    @PostMapping
    public ResponseEntity<Person> createPerson(@RequestBody Person person) {
        Person created = personService.createPerson(person);
        return ResponseEntity.created(URI.create("/person/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Person> updatePerson(@PathVariable String id, @RequestBody Person person) {
        return ResponseEntity.ok(personService.updatePerson(id, person));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePerson(@PathVariable String id) {
        personService.deletePerson(id);
        return ResponseEntity.noContent().build();
    }
}
