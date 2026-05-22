package com.pookiebear278.loan_tracker.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@Slf4j
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    @Value("${supabase.bucket}")
    private String bucket;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Uploads a file to Supabase Storage and returns the public URL.
     */
    public String upload(MultipartFile file) {
        try {
            String extension = getExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);

            String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucket + "/" + filename;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseKey);
            headers.setContentType(MediaType.parseMediaType(
                file.getContentType() != null ? file.getContentType() : "application/octet-stream"
            ));

            HttpEntity<byte[]> request = new HttpEntity<>(file.getBytes(), headers);

            ResponseEntity<String> response = restTemplate.exchange(
                uploadUrl, HttpMethod.POST, request, String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                String publicUrl = supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + filename;
                log.info("Receipt uploaded to Supabase Storage: {}", publicUrl);
                return publicUrl;
            }

            throw new RuntimeException("Supabase Storage upload failed with status: " + response.getStatusCode());

        } catch (Exception e) {
            throw new RuntimeException("Failed to upload receipt to Supabase Storage: " + e.getMessage(), e);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1);
    }
}
