import React, { useState } from 'react';
import PayNowModal from './PayNowModal';
import { paymentApi } from '../api';

export default function Payments({ loans, setLoans, contacts, groups = [], activePersonId, refreshAllData, simulatedDate }) {
  const [showPayNow, setShowPayNow] = useState(null);
  const [removingPaymentId, setRemovingPaymentId] = useState(null);
  const [showArchivedPayments, setShowArchivedPayments] = useState(false);

  const getContact = (id) => contacts.find((c) => c.id === id);

  const getLoanBalance = (loan, activeId) => {
    const isGroup = loan.type === 'Group';
    let userShare = 0;
    let hasUserShare = false;
    
    if (isGroup && loan.splits) {
      const userSplitVal = loan.splits[activeId];
      if (userSplitVal !== undefined) {
        hasUserShare = true;
        const rawSplit = parseFloat(userSplitVal) || 0;
        userShare = loan.splitMethod === 'Divide Percent'
          ? (rawSplit / 100) * loan.amount
          : rawSplit;
      }
    }
    
    if (isGroup && hasUserShare) {
      if (loan.direction === 'owed') {
        const effTotal = loan.amount - userShare;
        const effPaid = loan.paidAmount;
        return {
          total: effTotal,
          paid: effPaid,
          remaining: Math.max(0, effTotal - effPaid)
        };
      } else {
        const effTotal = userShare;
        const effPaid = loan.paidAmount;
        return {
          total: effTotal,
          paid: effPaid,
          remaining: Math.max(0, effTotal - effPaid)
        };
      }
    }
    
    return {
      total: loan.amount,
      paid: loan.paidAmount,
      remaining: Math.max(0, loan.amount - loan.paidAmount)
    };
  };

  const youPaid = loans.filter((l) => {
    const bal = getLoanBalance(l, activePersonId);
    return l.direction === 'owe' && bal.remaining > 0 && !l.archived;
  });
  const paidYou = loans.filter((l) => {
    const bal = getLoanBalance(l, activePersonId);
    return l.direction === 'owed' && bal.remaining > 0 && !l.archived;
  });

  const totalDueFromYou = youPaid.reduce((s, l) => s + getLoanBalance(l, activePersonId).remaining, 0);
  const totalDueToYou = paidYou.reduce((s, l) => s + getLoanBalance(l, activePersonId).remaining, 0);

  const fmt = (n) => `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Filter loans for previous payments history: if showArchivedPayments is false, hide payments from archived loans
  const loansForPayments = showArchivedPayments ? loans : loans.filter(l => !l.archived);
  // Flatten ALL payments from ALL loans, newest first
  const allPayments = loansForPayments
    .flatMap((loan) => {
      const contactName = loan.type === 'Group'
        ? (groups.find((g) => String(g.id) === String(loan.groupId))?.name || 'Unknown Group')
        : (getContact(loan.borrowerId || loan.lenderId)?.name || 'Unknown');
      return (loan.payments || []).map((p) => ({
        ...p,
        loanName: loan.name,
        loanId: loan.id,
        loanDirection: loan.direction,
        loanType: loan.type,
        loanFrequency: loan.frequency,
        contactName,
        referenceId: loan.referenceId,
        rawDate: p.date, // already formatted string, use for display
      }));
    })
    .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

  const totalPaymentsCount = allPayments.length;
  const totalPaidAmount = allPayments.reduce((s, p) => s + p.amount, 0);

  const handlePayNow = async (amount, method, loan, memberPayments) => {
    try {
      const activePaymentDate = simulatedDate || new Date().toISOString().split('T')[0];
      if (memberPayments && memberPayments.length > 0) {
        for (const mp of memberPayments) {
          await paymentApi.record(loan.id, {
            paymentAmount: mp.amount,
            payee: { id: mp.memberId },
            paymentDate: activePaymentDate,
            paymentMethod: method,
            notes: `Paid via ${method}`
          });
        }
      } else {
        const payeeId = loan.direction === 'owe' ? loan.lenderId : activePersonId;
        await paymentApi.record(loan.id, {
          paymentAmount: amount,
          payee: { id: payeeId },
          paymentDate: activePaymentDate,
          paymentMethod: method,
          notes: `Paid via ${method}`
        });
      }
      setShowPayNow(null);
      refreshAllData();
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRemovePayment = async (loanId, payment) => {
    if (!window.confirm(`Remove payment of ₱${payment.amount.toLocaleString()} from ${payment.date}? This will revert the loan balance.`)) return;
    setRemovingPaymentId(payment.id);
    try {
      await paymentApi.delete(loanId, payment.id);
      refreshAllData();
    } catch (err) {
      console.error('Error removing payment:', err);
      alert('Failed to remove payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setRemovingPaymentId(null);
    }
  };

  const directionBadge = (dir) =>
    dir === 'owe'
      ? <span className="pay-dir-badge pay-dir-owe">You Paid</span>
      : <span className="pay-dir-badge pay-dir-owed">Received</span>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payment Schedules</h1>
      </div>

      {/* Summary cards */}
      <div className="payments-summary-grid">
        <div className="payment-summary-card">
          <div className="payment-summary-label">
            <span className="stat-dot dot-red" /> Payments You Have to Make
          </div>
          <div className="payment-summary-amount amount-red">{fmt(totalDueFromYou)}</div>
          <div className="payment-summary-sub">You owe {youPaid.length} active loans</div>
        </div>
        <div className="payment-summary-card">
          <div className="payment-summary-label">
            <span className="stat-dot dot-green" /> Payments You Have Yet to Receive
          </div>
          <div className="payment-summary-amount amount-green">{fmt(totalDueToYou)}</div>
          <div className="payment-summary-sub">{paidYou.length} people owe you</div>
        </div>
      </div>

      {/* Two columns — pending payments */}
      <div className="payments-columns">
        <div className="payments-list-card">
          <div className="payments-list-title">Payments You Have to Make:</div>
          {youPaid.map((loan) => {
            const contact = getContact(loan.borrowerId || loan.lenderId);
            const displayName = loan.type === 'Group'
              ? (groups.find((g) => String(g.id) === String(loan.groupId))?.name || 'Unknown Group')
              : (contact?.name || 'Unknown');
            return (
              <div key={loan.id} className="payment-list-item">
                <div className="payment-list-info">
                  <h4>{displayName}</h4>
                  <p style={{ marginBottom: 0 }}>
                    <strong>{loan.name}</strong>
                    {loan.referenceId && (
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 600, 
                        color: '#475569', 
                        background: '#e2e8f0', 
                        borderRadius: '4px', 
                        padding: '1px 5px', 
                        marginLeft: '6px',
                        display: 'inline-block'
                      }}>
                        {loan.referenceId}
                      </span>
                    )}
                  </p>
                  <div style={{ marginTop: '5.5px', marginBottom: '5.5px' }}>
                    <span className={`pp-type-badge pp-type-${loan.type.toLowerCase()}`} style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {loan.type === 'Installment' ? `${loan.frequency} Installment` : loan.type}
                    </span>
                  </div>
                  <div className="loan-dates-badges">
                    <span className="date-badge start" title="Start Date">
                      📅 {loan.startDate}
                    </span>
                    {loan.dueDate && (
                      <span className="date-badge due" title="Due Date">
                        ⌛ {loan.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                <div className="payment-list-actions-side">
                  <div className="payment-list-amount amount-red">
                    ₱ {getLoanBalance(loan, activePersonId).remaining.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <button
                    className="btn btn-dark btn-sm inline-pay-btn"
                    onClick={() => setShowPayNow(loan)}
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            );
          })}
          {youPaid.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>No payments due. You are all caught up!</div>
          )}
        </div>

        <div className="payments-list-card">
          <div className="payments-list-title">Payments You Have Yet to Receive:</div>
          {paidYou.map((loan) => {
            const contact = getContact(loan.borrowerId || loan.lenderId);
            const displayName = loan.type === 'Group'
              ? (groups.find((g) => String(g.id) === String(loan.groupId))?.name || 'Unknown Group')
              : (contact?.name || 'Unknown');
            return (
              <div key={loan.id} className="payment-list-item">
                <div className="payment-list-info">
                  <h4>{displayName}</h4>
                  <p style={{ marginBottom: 0 }}>
                    <strong>{loan.name}</strong>
                    {loan.referenceId && (
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 600, 
                        color: '#475569', 
                        background: '#e2e8f0', 
                        borderRadius: '4px', 
                        padding: '1px 5px', 
                        marginLeft: '6px',
                        display: 'inline-block'
                      }}>
                        {loan.referenceId}
                      </span>
                    )}
                  </p>
                  <div style={{ marginTop: '5.5px', marginBottom: '5.5px' }}>
                    <span className={`pp-type-badge pp-type-${loan.type.toLowerCase()}`} style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {loan.type === 'Installment' ? `${loan.frequency} Installment` : loan.type}
                    </span>
                  </div>
                  <div className="loan-dates-badges">
                    <span className="date-badge start" title="Start Date">
                      📅 {loan.startDate}
                    </span>
                    {loan.dueDate && (
                      <span className="date-badge due" title="Due Date">
                        ⌛ {loan.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                <div className="payment-list-actions-side">
                  <div className="payment-list-amount amount-green">
                    ₱ {getLoanBalance(loan, activePersonId).remaining.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <button
                    className="btn btn-dark btn-sm inline-pay-btn"
                    onClick={() => setShowPayNow(loan)}
                  >
                    Update Payments
                  </button>
                </div>
              </div>
            );
          })}
          {paidYou.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>No incoming payments pending.</div>
          )}
        </div>
      </div>

      {/* Previous Payments — full history, newest first */}
      <div className="prev-payments-card">
        <div className="prev-payments-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <div className="prev-payments-title">Previous Payments</div>
            <div className="prev-payments-sub">
              {totalPaymentsCount} payment{totalPaymentsCount !== 1 ? 's' : ''} · Total: <strong>{fmt(totalPaidAmount)}</strong>
            </div>
          </div>
          <button
            className={`filter-chip archived-toggle ${showArchivedPayments ? 'active' : ''}`}
            onClick={() => setShowArchivedPayments(!showArchivedPayments)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: showArchivedPayments ? '1.5px solid #38bdf8' : '1.5px solid #e0e0e0',
              background: showArchivedPayments ? 'rgba(56, 189, 248, 0.1)' : '#fff',
              color: showArchivedPayments ? '#38bdf8' : '#555',
              padding: '0.3rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            📥 {showArchivedPayments ? 'Viewing Archived Payments' : 'Show Archived Payments'}
          </button>
        </div>

        {allPayments.length > 0 ? (
          <div className="prev-payments-table">
            {/* Header */}
            <div className="prev-payments-row prev-payments-head">
              <span>Date</span>
              <span>Loan</span>
              <span>Contact</span>
              <span>Method</span>
              <span>Type</span>
              <span>Direction</span>
              <span>Amount</span>
              <span style={{ textAlign: 'right' }}>Action</span>
            </div>
            {allPayments.map((p) => (
              <div className="prev-payments-row" key={p.id}>
                <span className="pp-date">{p.date}</span>
                <span className="pp-loan-name">
                  <strong>{p.loanName}</strong>
                  {p.referenceId && (
                    <span style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 600, 
                      color: '#475569', 
                      background: '#e2e8f0', 
                      borderRadius: '4px', 
                      padding: '1px 4px', 
                      marginLeft: '5px',
                      display: 'inline-block',
                      fontFamily: 'monospace'
                    }}>
                      {p.referenceId}
                    </span>
                  )}
                </span>
                <span className="pp-contact">{p.contactName}</span>
                <span>
                  <span className={`payment-method-badge ${p.type.toLowerCase().replace(/\s+/g, '-')}`}>
                    {p.type}
                  </span>
                </span>
                <span>
                  <span className={`pp-type-badge pp-type-${p.loanType.toLowerCase()}`}>
                    {p.loanType === 'Installment' ? `${p.loanFrequency || 'Monthly'} Installment` : p.loanType}
                  </span>
                </span>
                <span>{directionBadge(p.loanDirection)}</span>
                <span className={`pp-amount ${p.loanDirection === 'owe' ? 'amount-red' : 'amount-green'}`}>
                  ₱{p.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ textAlign: 'right' }}>
                  <button
                    className="btn-remove-payment"
                    disabled={removingPaymentId === p.id}
                    onClick={() => handleRemovePayment(p.loanId, p)}
                    title="Revert this payment"
                  >
                    {removingPaymentId === p.id ? '…' : '↩ Revert'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="prev-payments-empty">No payments have been recorded yet.</div>
        )}
      </div>

      {showPayNow && (
        <PayNowModal
          loan={showPayNow}
          onClose={() => setShowPayNow(null)}
          onPay={handlePayNow}
          contacts={contacts}
          activePersonId={activePersonId}
        />
      )}
    </div>
  );
}
