package com.pookiebear278.loan_tracker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>>handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "timestamp",
                LocalDateTime.now().toString(),
                "status", 404,
                "error", ex.getMessage()
        ));
    }

    @ExceptionHandler(InvalidEntryConfigurationException.class)
    public ResponseEntity<Map<String, Object>>handleInvalidEntryConfiguration(InvalidEntryConfigurationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp",
                LocalDateTime.now().toString(),
                "status", 400,
                "error", ex.getMessage()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>>handleException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "timestamp",
                LocalDateTime.now().toString(),
                "status", 500,
                "error", ex.getMessage()
        ));
    }
}
