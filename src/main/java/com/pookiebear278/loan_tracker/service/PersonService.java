package com.pookiebear278.loan_tracker.service;

import com.pookiebear278.loan_tracker.domain.Person;
import com.pookiebear278.loan_tracker.exception.NotFoundException;
import com.pookiebear278.loan_tracker.repo.PersonRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Transactional(rollbackOn = Exception.class)
@RequiredArgsConstructor
public class PersonService {
    private final PersonRepo personRepo;

    public List<Person> getAllPerson() {
        return personRepo.findAll();
    }

    public Person getPerson(String id) {
        return personRepo.findById(id).orElseThrow(() -> new NotFoundException("Person not found: " + id));
    }

    public Person createPerson(Person person){
        return personRepo.save(person);
    }

    public Person updatePerson(String id, Person updated){
        Person existingPerson = getPerson(id);
        existingPerson.setName(updated.getName());
        existingPerson.setContactInfo(updated.getContactInfo());
        return personRepo.save(existingPerson);
    }

    public void deletePerson(String id){
        personRepo.delete(getPerson(id));
    }

}
