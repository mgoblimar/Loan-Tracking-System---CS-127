import React, { useState, useMemo } from 'react';

export default function PayNowModal({ loan, onClose, onPay, contacts = [], activePersonId }) {
  const isInstallment = loan.type === 'Installment';
  const isGroup = loan.type === 'Group';

  // Universal remaining balance: total amount minus total paid so far on the entry
  const remaining = Math.max(0, loan.amount - loan.paidAmount);

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

  // ── Group member data (enriched with paid & remaining status) ──────────────
  const groupMembers = useMemo(() => {
    if (!isGroup || !loan.splits) return [];
    return Object.entries(loan.splits).map(([id, splitVal]) => {
      const contact = contacts.find((c) => String(c.id) === String(id));
      const rawSplit = parseFloat(splitVal) || 0;
      const share = loan.splitMethod === 'Divide Percent'
        ? (rawSplit / 100) * loan.amount
        : rawSplit;
      const paid = loan.payments
        ? loan.payments
            .filter((p) => String(p.payeeId) === String(id))
            .reduce((sum, p) => sum + p.amount, 0)
        : 0;
      const memberRemaining = Math.max(0, share - paid);
      const isMe = String(id) === String(activePersonId);
      return {
        id,
        name: contact?.name || `Member #${id}`,
        share,
        paid,
        remaining: memberRemaining,
        isMe
      };
    });
  }, [isGroup, loan.splits, loan.splitMethod, loan.amount, loan.payments, contacts, activePersonId]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedMemberId, setSelectedMemberId] = useState(() => {
    if (!isGroup || !loan.splits) return '';
    // Default to the first member that has a remaining balance
    const members = Object.entries(loan.splits).map(([id, splitVal]) => {
      const rawSplit = parseFloat(splitVal) || 0;
      const share = loan.splitMethod === 'Divide Percent'
        ? (rawSplit / 100) * loan.amount
        : rawSplit;
      const paid = loan.payments
        ? loan.payments
            .filter((p) => String(p.payeeId) === String(id))
            .reduce((sum, p) => sum + p.amount, 0)
        : 0;
      return { id, remaining: Math.max(0, share - paid) };
    });
    const firstWithRemaining = members.find(m => m.remaining > 0.01);
    return firstWithRemaining ? firstWithRemaining.id : (members[0]?.id || '');
  });

  const [amount, setAmount] = useState(() => {
    if (!isGroup) return '';
    // Prefill with remaining of the default selected member
    const targetId = (() => {
      const members = Object.entries(loan.splits || {}).map(([id, splitVal]) => {
        const rawSplit = parseFloat(splitVal) || 0;
        const share = loan.splitMethod === 'Divide Percent'
          ? (rawSplit / 100) * loan.amount
          : rawSplit;
        const paid = loan.payments
          ? loan.payments
              .filter((p) => String(p.payeeId) === String(id))
              .reduce((sum, p) => sum + p.amount, 0)
          : 0;
        return { id, remaining: Math.max(0, share - paid) };
      });
      const firstWithRemaining = members.find(m => m.remaining > 0.01);
      return firstWithRemaining ? firstWithRemaining.id : (members[0]?.id || '');
    })();
    const splitVal = loan.splits?.[targetId];
    if (splitVal === undefined) return '';
    const rawSplit = parseFloat(splitVal) || 0;
    const share = loan.splitMethod === 'Divide Percent'
      ? (rawSplit / 100) * loan.amount
      : rawSplit;
    const paid = loan.payments
      ? loan.payments
          .filter((p) => String(p.payeeId) === String(targetId))
          .reduce((sum, p) => sum + p.amount, 0)
      : 0;
    return Math.max(0, share - paid).toFixed(2);
  });

  const [selectedTerm, setSelectedTerm] = useState('');
  const [method, setMethod] = useState('Cash');
  const [error, setError] = useState('');

  // ── Selected Member helper ─────────────────────────────────────────────────
  const selectedMember = useMemo(() => {
    return groupMembers.find(m => String(m.id) === String(selectedMemberId));
  }, [groupMembers, selectedMemberId]);

  const isFullySettled = useMemo(() => {
    if (isGroup) {
      return groupMembers.length > 0 && groupMembers.every(m => m.remaining <= 0.01);
    }
    return remaining <= 0.01;
  }, [isGroup, groupMembers, remaining]);

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  const handleMemberChange = (memId) => {
    setSelectedMemberId(memId);
    const mem = groupMembers.find(m => String(m.id) === String(memId));
    if (mem) {
      setAmount(mem.remaining.toFixed(2));
    } else {
      setAmount('');
    }
    if (error) setError('');
  };

  const handlePayInFull = () => {
    if (isGroup && selectedMember) {
      setAmount(selectedMember.remaining.toFixed(2));
      if (error) setError('');
    } else if (!isGroup) {
      setAmount(remaining.toFixed(2));
      if (isInstallment) setSelectedTerm(String(remainingTerms));
      if (error) setError('');
    }
  };

  const handlePay = () => {
    if (isGroup) {
      if (!selectedMemberId) {
        setError('Please select a group member to pay for.');
        return;
      }
      if (!amount.trim()) {
        setError('Please enter a payment amount.');
        return;
      }
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) {
        setError('Amount must be greater than zero.');
        return;
      }
      if (!selectedMember) {
        setError('Selected member not found.');
        return;
      }
      if (val > selectedMember.remaining + 0.01) {
        setError(`Amount exceeds remaining balance of ₱${selectedMember.remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for ${selectedMember.name}.`);
        return;
      }
      setError('');
      // Record a single payment for this selected member
      onPay(val, method, loan, [{ memberId: selectedMemberId, amount: val }]);
    } else {
      if (!amount.trim()) { setError('Please enter a payment amount.'); return; }
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) { setError('Amount must be greater than zero.'); return; }
      if (val > remaining + 0.01) {
        setError(`Amount exceeds remaining balance of ₱${remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`);
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
        <style>{`
          .member-list-container::-webkit-scrollbar {
            width: 6px;
          }
          .member-list-container::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 999px;
          }
          .member-list-container::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 999px;
          }
          .member-list-container::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .member-item-card {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .member-item-card:not(.paid):hover {
            background: rgba(56, 189, 248, 0.04) !important;
            border-color: #38bdf8 !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(56, 189, 248, 0.08);
          }
          .member-item-card:not(.paid):active {
            transform: translateY(0);
          }
        `}</style>

        <div className="modal-title">Record Payment / Pay Now</div>
        
        {/* Loan summary info box */}
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

        {/* If the entire loan is fully settled */}
        {isFullySettled ? (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '24px 16px',
            textAlign: 'center',
            color: '#15803d',
            margin: '1.5rem 0'
          }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🎉</span>
            <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: '6px' }}>All Shares Settled!</strong>
            <span style={{ fontSize: '0.82rem', color: '#166534', opacity: 0.9 }}>
              Every member has fully paid their split amount. This group loan is completely cleared.
            </span>
          </div>
        ) : (
          <>
            {/* ── GROUP: Member Selection & Payment Form ── */}
            {isGroup && (
              <div className="group-pay-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="group-pay-header" style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '8px', marginBottom: '4px' }}>
                  <span className="form-label-sub" style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Member Status &amp; Selection</span>
                </div>

                {/* Clickable Member Selection List */}
                <div className="member-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {groupMembers.map((m) => {
                    const isSelected = String(m.id) === String(selectedMemberId);
                    const isPaid = m.remaining <= 0.01;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (!isPaid) {
                            handleMemberChange(m.id);
                          }
                        }}
                        className={`member-item-card ${isPaid ? 'paid' : ''}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: isSelected 
                            ? 'rgba(56, 189, 248, 0.08)' 
                            : isPaid 
                              ? '#f8fafc' 
                              : '#ffffff',
                          border: isSelected 
                            ? '2px solid #38bdf8' 
                            : isPaid 
                              ? '1px solid #e2e8f0' 
                              : '1px solid #cbd5e1',
                          cursor: isPaid ? 'not-allowed' : 'pointer',
                          opacity: isPaid ? 0.65 : 1,
                          boxShadow: isSelected ? '0 2px 6px rgba(56, 189, 248, 0.1)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="radio"
                            name="selectedMember"
                            checked={isSelected}
                            disabled={isPaid}
                            readOnly
                            style={{ cursor: isPaid ? 'not-allowed' : 'pointer', accentColor: '#38bdf8' }}
                          />
                          <div style={{ textAlign: 'left' }}>
                            <strong style={{ color: isPaid ? '#64748b' : '#0f172a', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {m.name}
                              {m.isMe && <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>You</span>}
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                              Paid: ₱{m.paid.toLocaleString()} / Share: ₱{m.share.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {isPaid ? (
                            <span style={{ 
                              background: '#dcfce7', 
                              color: '#15803d', 
                              fontSize: '0.68rem', 
                              fontWeight: 700, 
                              padding: '2px 8px', 
                              borderRadius: '999px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              ✓ Paid
                            </span>
                          ) : (
                            <span style={{ 
                              color: '#ef4444', 
                              fontWeight: 700, 
                              fontSize: '0.8rem' 
                            }}>
                              ₱{m.remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Single Payment input box for selected member */}
                {selectedMember && selectedMember.remaining > 0.01 && (
                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '10px', 
                    padding: '14px', 
                    marginTop: '4px',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label-sub" style={{ margin: 0, fontWeight: 700, fontSize: '0.8rem' }}>
                        Payment Amount for {selectedMember.name} (₱)
                      </label>
                      <button type="button" className="btn-pay-in-full" onClick={handlePayInFull} style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}>
                        ✓ Pay in Full
                      </button>
                    </div>
                    <input
                      className="form-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (error) setError('');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
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
          </>
        )}

        <div className="modal-footer">
          <button className="btn btn-light" onClick={onClose}>
            {isFullySettled ? 'Close' : 'Cancel'}
          </button>
          {!isFullySettled && (
            <button className="btn btn-dark" onClick={handlePay}>Confirm Payment</button>
          )}
        </div>
      </div>
    </div>
  );
}

