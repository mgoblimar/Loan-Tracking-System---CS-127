package com.pookiebear278.loan_tracker.service;


import com.pookiebear278.loan_tracker.domain.Entry;
import com.pookiebear278.loan_tracker.domain.GroupMember;
import com.pookiebear278.loan_tracker.domain.PaymentAllocation;
import com.pookiebear278.loan_tracker.domain.Person;
import com.pookiebear278.loan_tracker.domain.enums.TransactionType;
import com.pookiebear278.loan_tracker.exception.InvalidEntryConfigurationException;
import com.pookiebear278.loan_tracker.exception.NotFoundException;
import com.pookiebear278.loan_tracker.repo.GroupMemberRepo;
import com.pookiebear278.loan_tracker.repo.PaymentAllocationRepo;
import com.pookiebear278.loan_tracker.repo.PersonRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Transactional(rollbackOn = Exception.class)
@RequiredArgsConstructor
public class PaymentAllocationService {

    private final PaymentAllocationRepo paymentAllocationRepo;
    private final EntryService entryService;
    private final GroupMemberRepo groupMemberRepo;
    private final PersonRepo personRepo;

    public List<PaymentAllocation> getAllocation(String entryId) {
        entryService.getEntry(entryId);
        return paymentAllocationRepo.findByEntryId(entryId);
    }

    public PaymentAllocation createAllocation(String entryId, PaymentAllocation allocation) {

        Entry entry = entryService.getEntry(entryId);
        validateGroupExpense(entry);
        allocation.setEntry(entry);

        // Resolve full payee
        if (allocation.getPayee() != null && allocation.getPayee().getId() != null) {
            allocation.setPayee(resolvePayee(allocation.getPayee().getId()));
        }

        return  paymentAllocationRepo.save(allocation);
    }


    public PaymentAllocation updateAllocation(String id, PaymentAllocation updated){
        PaymentAllocation existing = paymentAllocationRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Payment Allocation Not Found " + id));
        existing.setDescription(updated.getDescription());
        existing.setAmount(updated.getAmount());

        existing.setNotes(updated.getNotes());
        // Resolve full payee before setting
        if (updated.getPayee() != null && updated.getPayee().getId() != null) {
            existing.setPayee(resolvePayee(updated.getPayee().getId()));
        }

        return paymentAllocationRepo.save(existing);
    }

    public void deleteAllocation(String id) {
        PaymentAllocation allocation = paymentAllocationRepo.findById(id).orElseThrow(() -> new NotFoundException("Payment Allocation Not Found " + id));

        paymentAllocationRepo.delete(allocation);
    }

    //Splits the total equally among all group members
    public List<PaymentAllocation> divideEqually(String entryId){
        Entry entry = entryService.getEntry(entryId);
        validateGroupExpense(entry);

        List<GroupMember> members = groupMemberRepo.findByGroupId(entry.getBorrowerGroup().getId());
        if(members.isEmpty())
        {
            throw new InvalidEntryConfigurationException("Group has no members to divide among");
        }

        // Remove existing allocations before replacing
        paymentAllocationRepo.findByEntryId(entryId)
                .forEach(paymentAllocationRepo::delete);

        BigDecimal share = entry.getAmountBorrowed().divide(new BigDecimal(members.size()), 4, RoundingMode.HALF_UP);

        List<PaymentAllocation> allocations = new ArrayList<>();
        for (GroupMember member : members) {
            PaymentAllocation allocation = new PaymentAllocation();
            allocation.setEntry(entry);
            allocation.setPayee(member.getPerson());
            allocation.setDescription("Equal Share");
            allocation.setAmount(share);
            allocations.add(paymentAllocationRepo.save(allocation));
        }
        return allocations;
    }

    public List<PaymentAllocation> divideByPercent(String entryId, Map<String, BigDecimal> personIdToPercent) {
        Entry entry = entryService.getEntry(entryId);
        validateGroupExpense(entry);

        paymentAllocationRepo.findByEntryId(entryId)
                .forEach(paymentAllocationRepo::delete);

        List<PaymentAllocation> allocations = new ArrayList<>();
        for(Map.Entry<String, BigDecimal> e : personIdToPercent.entrySet()){
            BigDecimal amount = entry.getAmountBorrowed()
                    .multiply(e.getValue())
                    .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);

            PaymentAllocation allocation = new PaymentAllocation();
            allocation.setEntry(entry);
            allocation.setPayee(resolvePayee(e.getKey()));
            allocation.setDescription(e.getValue() + "% share");
            allocation.setAmount(amount);
            allocations.add(paymentAllocationRepo.save(allocation));
        }
        return allocations;
    }

    // personIdToAmoun: Map of personid -> exact amount they owe

    public List<PaymentAllocation> divideByAmount(String entryId, Map<String, BigDecimal> personIdToAmount) {
        Entry entry = entryService.getEntry(entryId);
        validateGroupExpense(entry);

        paymentAllocationRepo.findByEntryId(entryId)
                .forEach(paymentAllocationRepo::delete);

        List<PaymentAllocation> allocations = new ArrayList<>();
        for(Map.Entry<String, BigDecimal> e : personIdToAmount.entrySet()) {
            PaymentAllocation allocation = new PaymentAllocation();
            allocation.setEntry(entry);
            allocation.setPayee(resolvePayee(e.getKey()));
            allocation.setDescription("Custom amount");
            allocation.setAmount(e.getValue());
            allocations.add(paymentAllocationRepo.save(allocation));
        }
        return allocations;
    }

    private void validateGroupExpense(Entry entry) {
        if(entry.getTransactionType() != TransactionType.GROUP_EXPENSE){
            throw new InvalidEntryConfigurationException("Payment allocations are only for  GROUP_EXPENSE entries");
        }
    }



    private Person resolvePayee(String personId) {
        return personRepo.findById(personId)
                .orElseThrow(() -> new NotFoundException("Person not found: " + personId));
    }

}
