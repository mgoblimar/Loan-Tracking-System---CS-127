package com.pookiebear278.loan_tracker.service;


import com.pookiebear278.loan_tracker.domain.Entry;
import com.pookiebear278.loan_tracker.domain.InstallmentDetail;
import com.pookiebear278.loan_tracker.domain.enums.InstallmentStatus;
import com.pookiebear278.loan_tracker.domain.enums.TransactionType;
import com.pookiebear278.loan_tracker.exception.InvalidEntryConfigurationException;
import com.pookiebear278.loan_tracker.exception.NotFoundException;
import com.pookiebear278.loan_tracker.repo.InstallmentDetailRepo;
import com.pookiebear278.loan_tracker.repo.PaymentRepo;
import com.pookiebear278.loan_tracker.util.InstallmentStatusCalculator;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(rollbackOn = Exception.class)
@RequiredArgsConstructor
public class InstallmentService {
    private final InstallmentDetailRepo installmentDetailRepo;
    private final EntryService entryService;
    private final PaymentRepo paymentRepo;
    private final PaymentService paymentService;

    public InstallmentDetail getInstallmentDetail(String entryId) {
        InstallmentDetail detail = installmentDetailRepo.findByEntryId(entryId).orElseThrow(() -> new NotFoundException("Installment detail not found for entry: " + entryId));

        detail.setStatus(computeCurrentTermStatus(detail));
        return detail;
    }

    public InstallmentDetail createInstallmentDetail(String entryId, InstallmentDetail detail) {
        if (detail.getPaymentTerms() == null || detail.getPaymentTerms() <= 0) {
            throw new InvalidEntryConfigurationException("Payment terms must be greater than zero");
        }
        if (detail.getSkippedTerms() != null && detail.getSkippedTerms() < 0) {
            throw new InvalidEntryConfigurationException("Skipped terms cannot be negative");
        }

        Entry entry = entryService.getEntry(entryId);
        if(entry.getTransactionType() != TransactionType.INSTALLMENT_EXPENSE) {
            throw new InvalidEntryConfigurationException("Installment details can only be added to INSTALLMENT_EXPENSE entries");
        }

        detail.setEntry(entry);

        // Auto complete payment amount per term
        BigDecimal perTerm = entry.getAmountBorrowed()
                .divide(new BigDecimal(detail.getPaymentTerms()), 4, RoundingMode.HALF_UP);

        detail.setPaymentAmountPerTerm(perTerm);

        entry.setInstallmentDetail(detail);
        InstallmentDetail saved = installmentDetailRepo.save(detail);

        // Calculate initial next due date
        paymentService.updateNextDueDateForInstallment(entry, null, null);

        return saved;
    }


    public InstallmentDetail updateInstallmentDetail(String entryId, InstallmentDetail updated){
        InstallmentDetail existing = installmentDetailRepo.findByEntryId(entryId).orElseThrow(
                () -> new NotFoundException("Installment detail not found for entry: " + entryId)
        );

        if (updated.getStartDate() != null) {
            existing.setStartDate(updated.getStartDate());
        }
        if (updated.getPaymentFrequency() != null) {
            existing.setPaymentFrequency(updated.getPaymentFrequency());
        }
        if (updated.getPaymentTerms() != null) {
            if (updated.getPaymentTerms() <= 0) {
                throw new InvalidEntryConfigurationException("Payment terms must be greater than zero");
            }
            existing.setPaymentTerms(updated.getPaymentTerms());
        }
        if (updated.getNotes() != null) {
            existing.setNotes(updated.getNotes());
        }

        // Recompute per term amount when terms change
        Entry entry = entryService.getEntry(entryId);
        BigDecimal perTerm = entry.getAmountBorrowed()
                .divide(new BigDecimal(existing.getPaymentTerms()), 4, RoundingMode.HALF_UP);

        existing.setPaymentAmountPerTerm(perTerm);

        InstallmentDetail saved = installmentDetailRepo.save(existing);

        // Recalculate next due date
        paymentService.updateNextDueDateForInstallment(entry, null, null);

        return saved;
    }

    public InstallmentDetail skipTerm(String entryId, String option) {
        InstallmentDetail detail = installmentDetailRepo.findByEntryId(entryId)
                .orElseThrow(() -> new NotFoundException("Installment detail not found for entry: " + entryId));

        Entry entry = detail.getEntry();
        BigDecimal perTerm = detail.getPaymentAmountPerTerm();

        // Calculate paid terms using CEILING division
        int paidTerms = 0;
        if (perTerm != null && perTerm.compareTo(BigDecimal.ZERO) > 0) {
            int unpaidTerms = entry.getAmountRemaining().divide(perTerm, 0, RoundingMode.CEILING).intValue();
            paidTerms = detail.getPaymentTerms() - detail.getSkippedTerms() - unpaidTerms;
            if (paidTerms < 0) paidTerms = 0;
        }

        if ("recalculate".equalsIgnoreCase(option)) {
            // Recalculate remaining terms: keep paymentTerms the same, but increase skippedTerms
            detail.setSkippedTerms(detail.getSkippedTerms() + 1);

            int remainingActiveTerms = detail.getPaymentTerms() - (paidTerms + detail.getSkippedTerms());
            if (remainingActiveTerms <= 0) {
                throw new InvalidEntryConfigurationException("Cannot recalculate remaining terms because no active terms are left. Please choose the 'Extend Maturity' option instead.");
            }

            // newPerTerm = amountRemaining / remainingActiveTerms
            BigDecimal newPerTerm = entry.getAmountRemaining()
                    .divide(new BigDecimal(remainingActiveTerms), 4, RoundingMode.HALF_UP);
            detail.setPaymentAmountPerTerm(newPerTerm);
        } else {
            // Option "extend" (default): Increase both total terms and skipped terms by 1
            detail.setPaymentTerms(detail.getPaymentTerms() + 1);
            detail.setSkippedTerms(detail.getSkippedTerms() + 1);
            // paymentAmountPerTerm remains unchanged!
        }

        InstallmentDetail saved = installmentDetailRepo.save(detail);

        // Recalculate next due date
        paymentService.updateNextDueDateForInstallment(entry, null, null);

        return saved;
    }

    public List<InstallmentStatus> getAllTermsStatuses(String entryId){
        InstallmentDetail detail = getInstallmentDetail(entryId);
        BigDecimal perTerm = detail.getPaymentAmountPerTerm();
        int paidTerms = 0;
        if (perTerm != null && perTerm.compareTo(BigDecimal.ZERO) > 0) {
            int unpaidTerms = detail.getEntry().getAmountRemaining().divide(perTerm, 0, RoundingMode.CEILING).intValue();
            paidTerms = detail.getPaymentTerms() - detail.getSkippedTerms() - unpaidTerms;
            if (paidTerms < 0) paidTerms = 0;
        }

        List<InstallmentStatus> statuses = new ArrayList<>();
        for (int term = 1; term <= detail.getPaymentTerms(); term++) {
            statuses.add(InstallmentStatusCalculator.compute(
                    term,
                    detail.getStartDate(),
                    detail.getPaymentFrequency(),
                    paidTerms,
                    detail.getSkippedTerms(),
                    detail.getPaymentTerms()
            ));
        }
        return statuses;
    }

    private InstallmentStatus computeCurrentTermStatus(InstallmentDetail detail){
        int elapsed = InstallmentStatusCalculator.elapsedTerms(detail.getStartDate(), detail.getPaymentFrequency());
        BigDecimal perTerm = detail.getPaymentAmountPerTerm();
        int paidTerms = 0;
        if (perTerm != null && perTerm.compareTo(BigDecimal.ZERO) > 0) {
            int unpaidTerms = detail.getEntry().getAmountRemaining().divide(perTerm, 0, RoundingMode.CEILING).intValue();
            paidTerms = detail.getPaymentTerms() - detail.getSkippedTerms() - unpaidTerms;
            if (paidTerms < 0) paidTerms = 0;
        }

        return InstallmentStatusCalculator.compute(
                elapsed,
                detail.getStartDate(),
                detail.getPaymentFrequency(),
                paidTerms,
                detail.getSkippedTerms(),
                detail.getPaymentTerms()
        );
    }
}
