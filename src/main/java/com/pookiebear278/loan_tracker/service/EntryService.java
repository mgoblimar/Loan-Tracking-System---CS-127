package com.pookiebear278.loan_tracker.service;

import com.pookiebear278.loan_tracker.constant.Constant;
import com.pookiebear278.loan_tracker.domain.Entry;
import com.pookiebear278.loan_tracker.domain.enums.TransactionType;
import com.pookiebear278.loan_tracker.exception.InvalidEntryConfigurationException;
import com.pookiebear278.loan_tracker.exception.NotFoundException;
import com.pookiebear278.loan_tracker.repo.EntryRepo;
import com.pookiebear278.loan_tracker.repo.GroupRepo;
import com.pookiebear278.loan_tracker.repo.PersonRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Function;

import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;

@Service
@Slf4j
@Transactional(rollbackOn = Exception.class)
@RequiredArgsConstructor
public class EntryService {
    private final EntryRepo entryRepo;
    private final PersonRepo personRepo;
    private final GroupRepo groupRepo;


    public Page<Entry> getAllEntries(int page, int size) {
        return entryRepo.findAll(PageRequest.of(page, size, Sort.by("name")));
    }

    public Entry getEntry(String id) {
        return entryRepo.findById(id).orElseThrow(() -> new NotFoundException("Entry not found " + id));
    }

    public Entry createEntry(Entry entry){
        validateEntry(entry);
        resolveRelationships(entry);
        return entryRepo.save(entry);
    }

    public Entry updateEntry(String id, Entry updated){
        Entry existing = getEntry(id);
        resolveRelationships(updated);
        validateEntry(updated);

        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setTransactionType(updated.getTransactionType());
        existing.setDateBorrowed(updated.getDateBorrowed());
        existing.setDateFullyPaid(updated.getDateFullyPaid());
        existing.setBorrowerPerson(updated.getBorrowerPerson());
        existing.setBorrowerGroup(updated.getBorrowerGroup());
        existing.setLender(updated.getLender());
        existing.setAmountBorrowed(updated.getAmountBorrowed());
        existing.setAmountRemaining(updated.getAmountRemaining());
        existing.setStatus(updated.getStatus());
        existing.setNotes(updated.getNotes());
        existing.setPaymentNotes(updated.getPaymentNotes());

        return entryRepo.save(existing);
    }

    public void deleteEntry(String id){
        entryRepo.delete(getEntry(id));
    }

    public String uploadReceipt(String id, MultipartFile file){
        log.info("Saving receipt for entry ID: {}", id);
        Entry entry = getEntry(id);
        String photoUrl = photoFunction.apply(id, file);
        entry.setReceipt(photoUrl);
        entryRepo.save(entry);
        return photoUrl;
    }

    // --- Validation ---
    private void validateEntry(Entry entry){
        // Constraint: INSTALLMENT_EXPENSE cannot have a group borrower
        if (entry.getTransactionType() == TransactionType.INSTALLMENT_EXPENSE && entry.getBorrowerGroup() != null){
            throw new InvalidEntryConfigurationException("An installment entry cannot have a group as the borrower");
        }

        // Must have exactly one borrower
        if (entry.getBorrowerPerson() == null && entry.getBorrowerGroup() == null) {
            throw new InvalidEntryConfigurationException("An entry must have  a borrower");
        }

        if(entry.getBorrowerPerson() != null && entry.getBorrowerGroup() != null) {
            throw new InvalidEntryConfigurationException("An entry cannot have both a person and a group as borrower");
        }
    }

    // --- File Helpers ---
    private final Function<String, String> fileExtension = filename -> Optional.of(filename)
            .filter(name -> name.contains("."))
            .map(name -> "." + name.substring(name.lastIndexOf(".") + 1))
            .orElse(".png");

    private final BiFunction<String, MultipartFile, String> photoFunction = (id, image) ->
    {
        String filename = id + fileExtension.apply(image.getOriginalFilename());
        try{
            Path fileStorageLocation = Paths.get(Constant.PHOTO_DIRECTORY).toAbsolutePath().normalize();
            if (!Files.exists(fileStorageLocation)){
                Files.createDirectories(fileStorageLocation);
            }
            Files.copy(image.getInputStream(), fileStorageLocation.resolve(filename), REPLACE_EXISTING);
            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/entry/image/" + filename)
                    .toUriString();
    }catch (Exception ex){
            throw new RuntimeException("Unable to save image: " + ex.getMessage());
    }

    };

    private void resolveRelationships(Entry entry){
        if(entry.getBorrowerPerson() != null && entry.getBorrowerPerson().getId() != null) {
            entry.setBorrowerPerson(personRepo.findById(entry.getBorrowerPerson().getId()).orElseThrow(() -> new NotFoundException("Borrower person not found ")));
        }
        if (entry.getBorrowerGroup() != null && entry.getBorrowerGroup().getId() != null) {
            entry.setBorrowerGroup(groupRepo.findById(entry.getBorrowerGroup().getId())
                    .orElseThrow(() -> new NotFoundException("Borrower group not found")));
        }
        if (entry.getLender() != null && entry.getLender().getId() != null) {
            entry.setLender(personRepo.findById(entry.getLender().getId())
                    .orElseThrow(() -> new NotFoundException("Lender not found")));
        }
    }
}
