package com.pookiebear278.loan_tracker.controller;

import com.pookiebear278.loan_tracker.service.EntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class FileController {
    private final EntryService entryService;

    @GetMapping("/entry/image/{id}")
    public ResponseEntity<byte[]> getEntryImage(@PathVariable String id) throws Exception {
        byte[] image = entryService.getReceiptImage(id);
        if (image == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(image);
    }
}
