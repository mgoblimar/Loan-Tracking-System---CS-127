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

        existing.setStartDate(updated.getStartDate());
        existing.setPaymentFrequency(updated.getPaymentFrequency());
        existing.setPaymentTerms(updated.getPaymentTerms());
        existing.setNotes(updated.getNotes());

        // Recompute per term amount when terms change
        Entry entry = entryService.getEntry(entryId);
        BigDecimal perTerm = entry.getAmountBorrowed()
                .divide(new BigDecimal(updated.getPaymentTerms()), 4, RoundingMode.HALF_UP);

        existing.setPaymentAmountPerTerm(perTerm);

        InstallmentDetail saved = installmentDetailRepo.save(existing);

        // Recalculate next due date
        paymentService.updateNextDueDateForInstallment(entry, null, null);

        return saved;
    }

    public InstallmentDetail skipTerm(String entryId){
        InstallmentDetail detail = installmentDetailRepo.findByEntryId(entryId).orElseThrow(() -> new NotFoundException("Installment detail not found for entry: " + entryId));

        detail.setSkippedTerms(detail.getSkippedTerms() + 1);
        InstallmentDetail saved = installmentDetailRepo.save(detail);

        // Recalculate next due date since skipped terms changed
        paymentService.updateNextDueDateForInstallment(detail.getEntry(), null, null);

        return saved;
    }

    public List<InstallmentStatus> getAllTermsStatuses(String entryId){
        InstallmentDetail detail = getInstallmentDetail(entryId);
        int paidTerms = paymentRepo.findByEntryId(entryId).size();

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
        int paidTerms = paymentRepo.findByEntryId(detail.getEntry().getId()).size();

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
