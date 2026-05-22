import React, { useState, useMemo } from 'react';

export default function PayNowModal({ loan, onClose, onPay, contacts = [], activePersonId }) {
  const isInstallment = loan.type === 'Installment';
  const isGroup = loan.type === 'Group';
  // Calculate user share if they are in the group splits
  const userShareAmount = useMemo(() => {
    if (!isGroup || !loan.splits) return 0;
    const userSplitVal = loan.splits[activePersonId];
    if (userSplitVal === undefined) return 0;
    const rawSplit = parseFloat(userSplitVal) || 0;
    return loan.splitMethod === 'Divide Percent'
      ? (rawSplit / 100) * loan.amount
      : rawSplit;
  }, [isGroup, loan.splits, loan.splitMethod, loan.amount, activePersonId]);

  const remaining = Math.max(0, loan.amount - userShareAmount - loan.paidAmount);

  // ── Installment helpers ────────────────────────────────────────────────────
  const termAmount = loan.termAmount || 0;
  const nextTermAmount = loan.nextTermAmount || 0;
  const remainingTerms = isInstallment ? Math.max(0, loan.totalTerms - loan.termsPaid) : 0;

  const getAmountForTerm = (termsCount) => {
    if (termsCount <= 0) return 0;
    if (termsCount === remainingTerms) return remaining;
    return nextTermAmount + (termsCount - 1) * termAmount;
  };

  const getTermsFromAmount = (amtStr) => {
    const val = parseFloat(amtStr);
    if (isNaN(val) || val <= 0) return '';
    for (let i = 1; i <= remainingTerms; i++) {
      if (Math.abs(val - getAmountForTerm(i)) < 0.01) return String(i);
    }
    return '';
  };

  // ── Group member data ──────────────────────────────────────────────────────
  const groupMembers = useMemo(() => {
    if (!isGroup || !loan.splits) return [];
    return Object.keys(loan.splits).map((id) => {
      const contact = contacts.find((c) => String(c.id) === String(id));
      const rawSplit = parseFloat(loan.splits[id]) || 0;
      const share = loan.splitMethod === 'Divide Percent'
        ? (rawSplit / 100) * loan.amount
        : rawSplit;
      const isMe = String(id) === String(activePersonId);
      return { id, name: contact?.name || `Member #${id}`, share, isMe };
    });
  }, [isGroup, loan.splits, loan.splitMethod, loan.amount, contacts, activePersonId]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [amount, setAmount] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [method, setMethod] = useState('Cash');
  const [error, setError] = useState('');

  // Member amounts keyed by member id (group only)
  const [memberAmounts, setMemberAmounts] = useState(() => {
    const init = {};
    groupMembers.forEach((m) => { init[m.id] = ''; });
    return init;
  });

  // ── Computed group total ───────────────────────────────────────────────────
  const groupTotal = groupMembers.reduce((sum, m) => {
    if (m.isMe) return sum;
    return sum + (parseFloat(memberAmounts[m.id]) || 0);
  }, 0);

  // ── Handlers — simple loan ─────────────────────────────────────────────────
  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    setSelectedTerm(getTermsFromAmount(e.target.value));
    if (error) setError('');
  };

  const handleTermChange = (e) => {
    const termVal = e.target.value;
    setSelectedTerm(termVal);
    setAmount(termVal ? getAmountForTerm(parseInt(termVal)).toString() : '');
    if (error) setError('');
  };

  // ── Pay in Full ────────────────────────────────────────────────────────────
  const handlePayInFull = () => {
    if (isGroup) {
      const next = {};
      groupMembers.forEach((m) => {
        next[m.id] = m.isMe ? '' : m.share.toFixed(2);
      });
      setMemberAmounts(next);
      if (error) setError('');
    } else {
      setAmount(remaining.toFixed(2));
      if (isInstallment) setSelectedTerm(String(remainingTerms));
      if (error) setError('');
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handlePay = () => {
    if (isGroup) {
      const anyNegative = groupMembers.some((m) => !m.isMe && parseFloat(memberAmounts[m.id]) < 0);
      if (anyNegative) {
        setError('Payment amounts cannot be negative.');
        return;
      }
      if (groupTotal <= 0) {
        setError('Enter a payment amount for at least one member.');
        return;
      }
      if (groupTotal > remaining + 0.01) {
        setError(`Total (₱${groupTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds remaining balance of ₱${remaining.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
        return;
      }
      const memberPayments = groupMembers
        .filter((m) => !m.isMe && (parseFloat(memberAmounts[m.id]) || 0) > 0)
        .map((m) => ({ memberId: m.id, amount: parseFloat(memberAmounts[m.id]) }));
      setError('');
      onPay(groupTotal, method, loan, memberPayments);
    } else {
      if (!amount.trim()) { setError('Please enter a payment amount.'); return; }
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) { setError('Amount must be greater than zero.'); return; }
      if (val > remaining + 0.01) {
        setError(`Amount exceeds remaining balance of ₱${remaining.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
        return;
      }
      setError('');
      onPay(val, method, loan);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: isGroup ? 540 : 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">Record Payment / Pay Now</div>
        {/* Loan summary */}
        <div className="paynow-info-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div className="paynow-info-name" style={{ margin: 0 }}>{loan.name}</div>
            <span className={`pp-type-badge pp-type-${loan.type.toLowerCase()}`} style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {loan.type === 'Installment' ? `${loan.frequency} Installment` : loan.type}
            </span>
          </div>
          <div className="paynow-info-rows">
            <div>Remaining Balance: <strong>₱{remaining.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
            {isInstallment && (
              <>
                <div>Term Cost: <strong>₱{termAmount.toLocaleString()}</strong></div>
                {nextTermAmount > 0 && nextTermAmount !== termAmount && (
                  <div>Remaining for Next Term: <strong>₱{nextTermAmount.toLocaleString()}</strong></div>
                )}
                <div>Terms Paid: <strong>{loan.termsPaid} / {loan.totalTerms}</strong></div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="alert-label-sub dynamic-fade-in" style={{ fontSize: '0.8rem', marginBottom: '1rem', padding: '0.5rem 0.75rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── GROUP: member payment table ── */}
        {isGroup && (
          <div className="group-pay-section">
            <div className="group-pay-header">
              <span className="form-label-sub" style={{ margin: 0 }}>Member Payments</span>
              <button type="button" className="btn-pay-in-full" onClick={handlePayInFull}>
                ✓ Pay All in Full
              </button>
            </div>

            <div className="group-pay-table">
              <div className="group-pay-row group-pay-head">
                <span>Member</span>
                <span>Their Share</span>
                <span>Paying Now</span>
              </div>

              {groupMembers.map((m) => (
                <div className={`group-pay-row${m.isMe ? ' group-pay-me' : ''}`} key={m.id}>
                  <span className="gp-member-name">
                    {m.name}
                    {m.isMe && <span className="gp-you-badge">You</span>}
                  </span>
                  <span className="gp-share">
                    ₱{m.share.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {m.isMe ? (
                    <span className="gp-excluded-label">Excluded (your share)</span>
                  ) : (
                    <input
                      className="form-input gp-amount-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={memberAmounts[m.id] || ''}
                      onChange={(e) => {
                        setMemberAmounts((prev) => ({ ...prev, [m.id]: e.target.value }));
                        if (error) setError('');
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {groupTotal > 0 && (
              <div className="gp-total-row">
                Total Payment: <strong>₱{groupTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                {groupTotal > remaining + 0.01 && (
                  <span className="gp-over-warning"> · Exceeds remaining!</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── INSTALLMENT: term select ── */}
        {isInstallment && remainingTerms > 0 && (
          <div className="form-group">
            <label className="form-label-sub">Pay by Terms</label>
            <div className="select-wrapper">
              <select className="form-select" value={selectedTerm} onChange={handleTermChange}>
                <option value="">-- Select Term Option (Custom Amount) --</option>
                {Array.from({ length: remainingTerms }, (_, i) => i + 1).map((t) => {
                  const amt = getAmountForTerm(t);
                  return (
                    <option key={t} value={t}>
                      {t} {t === 1 ? 'Term' : 'Terms'} (₱{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        {/* ── NON-GROUP: amount input + pay in full ── */}
        {!isGroup && (
          <div className="form-group">
            <div className="paynow-amount-header">
              <label className="form-label-sub" style={{ margin: 0 }}>Amount to Pay (₱)</label>
              <button type="button" className="btn-pay-in-full" onClick={handlePayInFull}>
                ✓ Pay in Full
              </button>
            </div>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount to Pay"
              value={amount}
              onChange={handleAmountChange}
            />
          </div>
        )}

        {/* ── PAYMENT METHOD ── */}
        <div className="form-group">
          <label className="form-label-sub">Payment Method</label>
          <div className="select-wrapper">
            <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={handlePay}>Confirm Payment</button>
        </div>
      </div>
    </div>
  );
}
