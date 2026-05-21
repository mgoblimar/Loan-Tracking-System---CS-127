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

import com.pookiebear278.loan_tracker.domain.enums.TransactionType;
import com.pookiebear278.loan_tracker.domain.InstallmentDetail;
import java.math.BigDecimal;
import java.math.RoundingMode;
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

        updateNextDueDateForInstallment(entry, payment, null);

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
        updateNextDueDateForInstallment(entry, null, payment.getId());
    }

    public void updateNextDueDateForInstallment(Entry entry, Payment newPayment, String excludePaymentId) {
        if (entry.getTransactionType() != TransactionType.INSTALLMENT_EXPENSE) {
            return;
        }

        InstallmentDetail detail = entry.getInstallmentDetail();
        if (detail == null) {
            return;
        }

        List<Payment> payments = paymentRepo.findByEntryId(entry.getId());

        // Sum existing payments excluding deleted
        BigDecimal totalPaid = payments.stream()
                .filter(p -> excludePaymentId == null || !p.getId().equals(excludePaymentId))
                .map(Payment::getPaymentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Add the new payment if it's not already in the database list
        if (newPayment != null && payments.stream().noneMatch(p -> p.getId() != null && p.getId().equals(newPayment.getId()))) {
            totalPaid = totalPaid.add(newPayment.getPaymentAmount());
        }

        BigDecimal perTerm = detail.getPaymentAmountPerTerm();
        if (perTerm == null || perTerm.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }

        // Calculate fully paid terms: k = totalPaid / perTerm
        int k = totalPaid.divide(perTerm, 0, RoundingMode.DOWN).intValue();

        // Account for skipped terms in next due date calculation
        int totalShift = k + detail.getSkippedTerms();

        // The next due date is the due date of Term totalShift + 1
        LocalDate nextDueDate = null;
        if (totalShift < detail.getPaymentTerms()) {
            nextDueDate = switch (detail.getPaymentFrequency()) {
                case MONTHLY -> detail.getStartDate().plusMonths(totalShift + 1);
                case WEEKLY -> detail.getStartDate().plusWeeks(totalShift + 1);
            };
        }

        // Extract existing notes
        String currentNotes = entry.getNotes();
        String actualNotes = "";
        if (currentNotes != null) {
            if (currentNotes.startsWith("[Due: ") && currentNotes.contains("]")) {
                actualNotes = currentNotes.substring(currentNotes.indexOf("]") + 1).trim();
            } else {
                actualNotes = currentNotes;
            }
        }

        if (nextDueDate != null) {
            entry.setNotes("[Due: " + nextDueDate.toString() + "] " + actualNotes);
        } else {
            entry.setNotes(actualNotes);
        }
    }
}
