package com.pookiebear278.loan_tracker.controller;

import com.pookiebear278.loan_tracker.constant.Constant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequiredArgsConstructor
public class FileController {
    @GetMapping("/entry/image/{filename}")
    public ResponseEntity<byte[]> getEntryImage(@PathVariable String filename) throws Exception{
        Path filePath = Paths.get(Constant.PHOTO_DIRECTORY).resolve(filename).normalize();
        byte[] image = Files.readAllBytes(filePath);
        String  contentType = Files.probeContentType(filePath);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/png")).body(image);
    }
}
