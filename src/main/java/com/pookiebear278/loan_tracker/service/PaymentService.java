package com.pookiebear278.loan_tracker.service;


import com.pookiebear278.loan_tracker.domain.Entry;
import com.pookiebear278.loan_tracker.domain.Payment;
import com.pookiebear278.loan_tracker.domain.enums.PaymentStatus;
import com.pookiebear278.loan_tracker.exception.InvalidEntryConfigurationException;
import com.pookiebear278.loan_tracker.exception.NotFoundException;
import com.pookiebear278.loan_tracker.repo.PaymentRepo;
import com.pookiebear278.loan_tracker.repo.PersonRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(rollbackOn = Exception.class)
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepo paymentRepo;
    private final EntryService entryService;
    private final PersonRepo personRepo;

    public List<Payment> getPaymentsForEntry(String entryId){
        return paymentRepo.findByEntryId(entryId);
    }

    public Payment getPayment(String id){
        return paymentRepo.findById(id).orElseThrow(() -> new NotFoundException("Payment not found: " + id));
    }

    public Payment recordPayment(String entryId, Payment payment){
        if (payment.getPaymentAmount() == null ||
                payment.getPaymentAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidEntryConfigurationException("Payment amount must be greater than zero");
        }

        Entry entry = entryService.getEntry(entryId);

        // Reject payment if already fully paid
        if (entry.getAmountRemaining().compareTo(BigDecimal.ZERO) == 0) {
            throw new InvalidEntryConfigurationException("This entry is already fully paid");
        }


        payment.setEntry(entry);

        if (payment.getPayee() != null && payment.getPayee().getId() != null) {
            payment.setPayee(personRepo.findById(payment.getPayee().getId())
                    .orElseThrow(() -> new NotFoundException("Payee not found")));
        }



        //Deduct from remaining balance
        BigDecimal newRemaining = entry.getAmountRemaining().subtract(payment.getPaymentAmount());

        // Cap at zero - cannot go negative
        if (newRemaining.compareTo(BigDecimal.ZERO) <= 0){
            newRemaining = BigDecimal.ZERO;
        }

        entry.setAmountRemaining(newRemaining);

        // Auto-update entry status
        if(newRemaining.compareTo(BigDecimal.ZERO) == 0){
            entry.setStatus(PaymentStatus.PAID);
            entry.setDateFullyPaid(LocalDate.now());
        } else {
            entry.setStatus(PaymentStatus.PARTIALLY_PAID);
        }

        return paymentRepo.save(payment);
    }


    public void deletePayment(String id){
        Payment payment = getPayment(id);

        // Restore the amount back to the entry
        Entry entry = payment.getEntry();

        entry.setAmountRemaining(entry.getAmountRemaining().add(payment.getPaymentAmount()));



        // Recalculate status after reversal
        if(entry.getAmountRemaining().compareTo(entry.getAmountBorrowed()) >= 0){
            entry.setStatus(PaymentStatus.UNPAID);
            entry.setDateFullyPaid(null);
        } else {
            entry.setStatus(PaymentStatus.PARTIALLY_PAID);
        }

        paymentRepo.delete(payment);
    }





}
