package com.pookiebear278.loan_tracker.controller;


import com.pookiebear278.loan_tracker.domain.Entry;
import com.pookiebear278.loan_tracker.service.EntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.net.URI;

@RestController
@RequestMapping("/entry")
@RequiredArgsConstructor
public class EntryController {
    private final EntryService entryService;

    @GetMapping
    public ResponseEntity<Page<Entry>> getAllEntries(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(entryService.getAllEntries(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Entry> getEntry(@PathVariable String id) {
        return ResponseEntity.ok(entryService.getEntry(id));
    }

    @PostMapping
    public ResponseEntity<Entry> createEntry(@RequestBody Entry entry) {
        Entry created = entryService.createEntry(entry);
        return ResponseEntity.created(URI.create("/entry/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Entry> updateEntry(@PathVariable String id, @RequestBody Entry entry) {
        return ResponseEntity.ok(entryService.updateEntry(id, entry));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable String id) {
        entryService.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/receipt")
    public ResponseEntity<String> uploadReceipt(@PathVariable String id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(entryService.uploadReceipt(id, file));
    }
}
