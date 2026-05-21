import React, { useState, useRef, useEffect } from 'react';
import AddLoanModal from './AddLoanModal';
import PayNowModal from './PayNowModal';
import { entryApi, installmentApi, paymentApi, allocationApi } from '../api';

const serializeNotes = (notes, dueDate) => {
  if (!dueDate) return notes || '';
  return `[Due: ${dueDate}] ${notes || ''}`;
};

export default function Overview({ loans, setLoans, contacts, groups, activePersonId, refreshAllData }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showPayNow, setShowPayNow] = useState(null);
  // sortKey: 'default' | 'date' | 'type-straight' | 'type-installment' | 'type-group' | 'progress-asc' | 'progress-desc' | 'completed'
  const [sortKey, setSortKey] = useState('newest');
  const [sortDir, setSortDir] = useState('desc'); // 'desc' = newest first by default
  const [filterType, setFilterType] = useState(null); // null | 'Straight' | 'Installment' | 'Group'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [removingPaymentId, setRemovingPaymentId] = useState(null);
  const [deletingLoanId, setDeletingLoanId] = useState(null);
  const sortRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  const totalOwe = loans
    .filter((l) => l.direction === 'owe')
    .reduce((s, l) => s + getLoanBalance(l, activePersonId).remaining, 0);
  const totalOwed = loans
    .filter((l) => l.direction === 'owed')
    .reduce((s, l) => s + getLoanBalance(l, activePersonId).remaining, 0);

  // "Current Loans" counts exclude fully-paid entries
  const byYouCount = loans.filter((l) => {
    const bal = getLoanBalance(l, activePersonId);
    return l.direction === 'owe' && bal.remaining > 0;
  }).length;
  const fromYouCount = loans.filter((l) => {
    const bal = getLoanBalance(l, activePersonId);
    return l.direction === 'owed' && bal.remaining > 0;
  }).length;

  const dueSoonLoan = loans
    .filter((l) => {
      const bal = getLoanBalance(l, activePersonId);
      return l.direction === 'owe' && l.dueDate && bal.remaining > 0;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  const dueSoonOwe = dueSoonLoan ? getLoanBalance(dueSoonLoan, activePersonId).remaining : 0;

  const fmt = (n) => `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getProgress = (loan) => {
    const bal = getLoanBalance(loan, activePersonId);
    if (bal.total === 0) return 100;
    return Math.min(100, Math.round((bal.paid / bal.total) * 100));
  };

  const getStatus = (loan) => {
    const bal = getLoanBalance(loan, activePersonId);
    if (bal.remaining <= 0) return { label: 'Completed', cls: 'status-completed' };
    if (loan.dueDate && new Date(loan.dueDate) < new Date()) return { label: 'Overdue', cls: 'status-overdue' };
    return { label: 'Active', cls: 'status-active' };
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredLoans = filterType ? loans.filter((l) => l.type === filterType) : loans;

  // ── Sorting ────────────────────────────────────────────────────────────────
  const typeOrder = { Straight: 0, Installment: 1, Group: 2 };

  const sortedLoans = [...filteredLoans].sort((a, b) => {
    const progA = getProgress(a);
    const progB = getProgress(b);
    const statusA = getStatus(a);
    const statusB = getStatus(b);
    const remainA = getLoanBalance(a, activePersonId).remaining;
    const remainB = getLoanBalance(b, activePersonId).remaining;

    let cmp = 0;
    if (sortKey === 'newest') {
      cmp = new Date(b.startDate) - new Date(a.startDate);
    } else if (sortKey === 'progress') {
      cmp = progA - progB; // asc = farthest first; desc = closest first
    } else if (sortKey === 'completed') {
      const aD = progA === 100 ? 0 : 1;
      const bD = progB === 100 ? 0 : 1;
      cmp = aD - bD;
      if (cmp === 0) cmp = progB - progA;
    } else if (sortKey === 'overdue') {
      const aO = statusA.label === 'Overdue' ? 0 : 1;
      const bO = statusB.label === 'Overdue' ? 0 : 1;
      cmp = aO - bO;
    } else if (sortKey === 'price') {
      cmp = remainA - remainB; // asc = lowest; desc = highest
    } else {
      // default: newest first
      cmp = new Date(b.startDate) - new Date(a.startDate);
      return cmp;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SORT_OPTIONS = [
    {
      key: 'newest',
      label: 'Newest',
      descLabel: 'Newest → Oldest',
      ascLabel:  'Oldest → Newest',
    },
    {
      key: 'progress',
      label: 'Progress',
      descLabel: 'Closest to Completion',
      ascLabel:  'Farthest from Completion',
    },
    {
      key: 'completed',
      label: 'Completed',
      descLabel: 'Completed First',
      ascLabel:  'Incomplete First',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      descLabel: 'Overdue First',
      ascLabel:  'Non-Overdue First',
    },
    {
      key: 'price',
      label: 'Price',
      descLabel: 'Highest Remaining First',
      ascLabel:  'Lowest Remaining First',
    },
  ];

  const activeOpt = SORT_OPTIONS.find((o) => o.key === sortKey);
  const activeDirLabel = activeOpt
    ? (sortDir === 'desc' ? activeOpt.descLabel : activeOpt.ascLabel)
    : 'Newest → Oldest';

  const toggleDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  // initialise sortKey to 'newest'
  // (useState default is already 'default', but we want 'newest' — reset once)

  const handleAddLoan = async (loan, rawFile) => {
    try {
      const transactionType = loan.type === 'Straight'
        ? 'STRAIGHT_EXPENSE'
        : loan.type === 'Installment'
          ? 'INSTALLMENT_EXPENSE'
          : 'GROUP_EXPENSE';

      let lender = null;
      let borrowerPerson = null;
      let borrowerGroup = null;

      if (loan.type !== 'Group') {
        if (loan.direction === 'owe') {
          if (!loan.lenderId) {
            alert('Please select a Lender');
            return;
          }
          lender = { id: loan.lenderId };
          borrowerPerson = { id: activePersonId };
        } else {
          if (!loan.borrowerId) {
            alert('Please select a Borrower');
            return;
          }
          lender = { id: activePersonId };
          borrowerPerson = { id: loan.borrowerId };
        }
      } else {
        if (!loan.groupId) {
          alert('Please select a Group');
          return;
        }
        borrowerGroup = { id: loan.groupId };
        if (loan.direction === 'owe') {
          if (!loan.lenderId) {
            alert('Please select a Lender');
            return;
          }
          lender = { id: loan.lenderId };
        } else {
          lender = { id: activePersonId };
        }
      }

      const dateBorrowed = loan.startDate || new Date().toISOString().split('T')[0];

      const entryPayload = {
        name: loan.name,
        description: loan.notes || '',
        transactionType,
        dateBorrowed,
        amountBorrowed: loan.amount,
        amountRemaining: loan.amount,
        notes: serializeNotes(loan.notes, loan.dueDate),
        lender,
        borrowerPerson,
        borrowerGroup
      };

      const createdEntry = await entryApi.create(entryPayload);

      if (loan.type === 'Installment') {
        const installmentPayload = {
          startDate: dateBorrowed,
          paymentFrequency: loan.frequency === 'Monthly' ? 'MONTHLY' : 'WEEKLY',
          paymentTerms: loan.totalTerms || 1,
          paymentAmountPerTerm: loan.amount / (loan.totalTerms || 1),
          notes: loan.notes || '',
          skippedTerms: 0
        };
        await installmentApi.createDetail(createdEntry.id, installmentPayload);

        if (loan.termsPaid > 0) {
          const singleTermAmount = loan.amount / (loan.totalTerms || 1);
          for (let i = 0; i < loan.termsPaid; i++) {
            await paymentApi.record(createdEntry.id, {
              paymentAmount: singleTermAmount,
              payee: lender,
              paymentDate: dateBorrowed,
              notes: 'Pre-recorded payment during setup'
            });
          }
        }
      }

      if (loan.type === 'Group') {
        if (loan.splitMethod === 'Divide Percent') {
          const percentMap = {};
          Object.entries(loan.splits).forEach(([memId, val]) => {
            percentMap[memId] = parseFloat(val) || 0;
          });
          await allocationApi.divideByPercent(createdEntry.id, percentMap);
        } else {
          const amountMap = {};
          Object.entries(loan.splits).forEach(([memId, val]) => {
            amountMap[memId] = parseFloat(val) || 0;
          });
          await allocationApi.divideByAmount(createdEntry.id, amountMap);
        }
      }

      if (rawFile) {
        await entryApi.uploadReceipt(createdEntry.id, rawFile);
      }

      setShowAddLoan(false);
      refreshAllData();
    } catch (err) {
      console.error('Error creating loan:', err);
      alert('Failed to create loan: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePayNow = async (amount, method, loan, memberPayments) => {
    try {
      if (memberPayments && memberPayments.length > 0) {
        // Group: record one payment per paying member
        for (const mp of memberPayments) {
          await paymentApi.record(loan.id, {
            paymentAmount: mp.amount,
            payee: { id: mp.memberId },
            paymentDate: new Date().toISOString().split('T')[0],
            notes: `Paid via ${method}`
          });
        }
      } else {
        const payeeId = loan.direction === 'owe' ? loan.lenderId : activePersonId;
        await paymentApi.record(loan.id, {
          paymentAmount: amount,
          payee: { id: payeeId },
          paymentDate: new Date().toISOString().split('T')[0],
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

  const handleRemovePayment = async (loan, payment) => {
    if (!window.confirm(`Remove payment of ₱${payment.amount.toLocaleString()} from ${payment.date}? This will revert the loan balance.`)) return;
    setRemovingPaymentId(payment.id);
    try {
      await paymentApi.delete(loan.id, payment.id);
      refreshAllData();
    } catch (err) {
      console.error('Error removing payment:', err);
      alert('Failed to remove payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setRemovingPaymentId(null);
    }
  };

  const handleDeleteLoan = async (loan) => {
    if (!window.confirm(`Delete "${loan.name}"? This will permanently remove the loan entry and ALL associated payments. This cannot be undone.`)) return;
    setDeletingLoanId(loan.id);
    try {
      await entryApi.delete(loan.id);
      refreshAllData();
    } catch (err) {
      console.error('Error deleting loan:', err);
      alert('Failed to delete loan: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingLoanId(null);
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Current Loans:</div>
          <div className="stat-row">
            <span className="stat-dot dot-red" />
            <span className="stat-value">{byYouCount}</span>
            <span className="stat-sub">By You</span>
          </div>
          <div className="stat-row">
            <span className="stat-dot dot-green" />
            <span className="stat-value">{fromYouCount}</span>
            <span className="stat-sub">From You</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Due:</div>
          <div className="stat-row">
            <span className="stat-dot dot-red" />
            <span className="stat-value" style={{ fontSize: '1.2rem' }}>{fmt(totalOwe)}</span>
            <span className="stat-sub">By You</span>
          </div>
          <div className="stat-row">
            <span className="stat-dot dot-green" />
            <span className="stat-value" style={{ fontSize: '1.2rem' }}>{fmt(totalOwed)}</span>
            <span className="stat-sub">From You</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Due Soon:</div>
          {dueSoonLoan ? (
            <>
              <div className="stat-row">
                <span className="stat-dot dot-red" />
                <span className="stat-value" style={{ fontSize: '1.2rem' }}>{fmt(dueSoonOwe)}</span>
                <span className="stat-sub">On {dueSoonLoan.dueDate}</span>
              </div>
            </>
          ) : (
            <div className="stat-row"><span className="stat-sub">No upcoming due dates</span></div>
          )}
        </div>
      </div>

      {/* Loan Summary */}
      <div className="loan-summary-card">
        <div className="loan-summary-header">
          <span className="loan-summary-title">Loan Summary</span>
          <span className="legend"><span className="stat-dot dot-red" /> You owe</span>
          <span className="legend"><span className="stat-dot dot-green" /> Owes you</span>

          {/* Filter chips */}
          <div className="filter-chips">
            {['Straight', 'Installment', 'Group'].map((t) => (
              <button
                key={t}
                className={`filter-chip ${filterType === t ? 'active' : ''}`}
                onClick={() => setFilterType(filterType === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="sort-dropdown-wrap" ref={sortRef}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                className="btn btn-light btn-sm"
                onClick={() => setShowSortMenu((v) => !v)}
                title="Sort options"
              >
                {activeOpt ? `${activeOpt.label} ↕` : 'Sort'}
              </button>
              {activeOpt && (
                <button
                  className="btn btn-light btn-sm sort-dir-btn"
                  onClick={toggleDir}
                  title={activeDirLabel}
                >
                  {sortDir === 'desc' ? '↓' : '↑'}
                </button>
              )}
            </div>
            {showSortMenu && (
              <div className="sort-menu">
                <div className="sort-menu-section-label">Sort By</div>
                {SORT_OPTIONS.map((opt) => (
                  <div
                    key={opt.key}
                    className={`sort-menu-item ${sortKey === opt.key ? 'selected' : ''}`}
                    onClick={() => { setSortKey(opt.key); if (sortKey !== opt.key) setSortDir('desc'); setShowSortMenu(false); }}
                  >
                    <span>{opt.label}</span>
                    {sortKey === opt.key && (
                      <span className="sort-menu-dir"> · {activeDirLabel}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-dark btn-sm" onClick={() => setShowAddLoan(true)}>
            Add Loan
          </button>
        </div>

        {/* Active filter indicator */}
        {filterType && (
          <div className="active-filter-bar">
            Showing only <strong>{filterType}</strong> loans
            <button className="clear-filter-btn" onClick={() => setFilterType(null)}>✕ Clear</button>
          </div>
        )}

        <div className="loan-table-header">
          <span>Person / Details</span>
          <span>Amount &amp; Type</span>
          <span>Progress</span>
          <span style={{ textAlign: 'right' }}>Status</span>
        </div>

        {sortedLoans.map((loan) => {
          const contact = getContact(loan.borrowerId || loan.lenderId);
          const progress = getProgress(loan);
          const status = getStatus(loan);
          const isExpanded = expandedId === loan.id;
          const isFullyPaid = getLoanBalance(loan, activePersonId).remaining === 0;

          const isGroup = loan.type === 'Group';
          let hasUserShare = false;
          let userSharePercent = 0;
          let userShareAmount = 0;
          if (isGroup && loan.splits) {
            const userSplitVal = loan.splits[activePersonId];
            if (userSplitVal !== undefined) {
              hasUserShare = true;
              const rawSplit = parseFloat(userSplitVal) || 0;
              if (loan.splitMethod === 'Divide Percent') {
                userSharePercent = rawSplit;
                userShareAmount = (rawSplit / 100) * loan.amount;
              } else {
                userShareAmount = rawSplit;
                userSharePercent = loan.amount > 0 ? (rawSplit / loan.amount) * 100 : 0;
              }
            }
          }

          const displayName = isGroup
            ? (groups.find((g) => String(g.id) === String(loan.groupId))?.name || 'Unknown Group')
            : (contact?.name || 'Unknown');

          const progressTrack = (() => {
            if (isGroup && hasUserShare) {
              const othersPaidPercent = loan.amount > 0 ? (loan.paidAmount / loan.amount) * 100 : 0;
              return (
                <div className="progress-bar-track multi-segment">
                  <div
                    className="progress-bar-fill yellow"
                    style={{ width: `${userSharePercent}%` }}
                    title={`Your Share: ₱${userShareAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  >
                    Your Share
                  </div>
                  {othersPaidPercent > 0 && (
                    <div
                      className={`progress-bar-fill ${isFullyPaid ? 'green' : 'red'}`}
                      style={{ width: `${othersPaidPercent}%` }}
                      title={`Others Paid: ₱${loan.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    >
                      {Math.round(othersPaidPercent)}%
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div className="progress-bar-track">
                <div
                  className={`progress-bar-fill ${isFullyPaid ? 'green' : 'red'}`}
                  style={{ width: `${progress}%` }}
                >
                  {progress}%
                </div>
              </div>
            );
          })();

          const progressLabel = (() => {
            if (loan.type === 'Installment') {
              return `${loan.termsPaid || 0}/${loan.totalTerms} terms paid`;
            }
            if (isGroup && hasUserShare) {
              const displayTotal = loan.amount - userShareAmount;
              return `₱${loan.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₱${displayTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid`;
            }
            return `₱${loan.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₱${loan.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid`;
          })();

          return (
            <div className={`loan-row ${isExpanded ? 'loan-row-open' : ''}`} key={loan.id}>
              <div
                className="loan-row-main"
                onClick={() => setExpandedId(isExpanded ? null : loan.id)}
              >
                <div className="loan-person">
                  <span className={`stat-dot ${loan.direction === 'owe' ? 'dot-red' : 'dot-green'}`} />
                  <div className="loan-person-info">
                    <h4>{displayName}</h4>
                    <p>{loan.name} | Start: {loan.startDate}{loan.dueDate ? ` | Due: ${loan.dueDate}` : ''}</p>
                  </div>
                </div>
                <div className="loan-amount-cell">
                  <strong>₱ {loan.amount.toLocaleString()}</strong>
                  <div className="loan-type-sub">
                    {loan.type === 'Installment' ? `${loan.frequency} Installment` : loan.type}
                  </div>
                </div>
                <div className="progress-wrap">
                  {progressTrack}
                  <div className="progress-label">
                    {progressLabel}
                  </div>
                </div>
                <div className="loan-status-cell">
                  <div className={status.cls}>{status.label}</div>
                  {status.label === 'Active' && loan.type === 'Installment' && (
                    <div className="next-payment">
                      Next: ₱{(loan.nextTermAmount !== undefined ? loan.nextTermAmount : Math.round(loan.amount / loan.totalTerms)).toLocaleString()}{loan.dueDate ? ` on ${loan.dueDate}` : ''}
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="loan-row-expanded">
                  {loan.notes && (
                    <div className="expanded-notes-block">
                      <span className="expanded-label">Notes:</span>
                      <p className="expanded-notes">{loan.notes}</p>
                    </div>
                  )}

                  {/* Splits view for Group Loan */}
                  {loan.type === 'Group' && loan.splits && Object.keys(loan.splits).length > 0 && (
                    <div className="group-splits-detail">
                      <span className="expanded-label">Group Split Details ({loan.splitMethod === 'Divide Percent' ? 'Percentages' : 'Values'}):</span>
                      <div className="splits-grid">
                        {Object.entries(loan.splits).map(([memId, splitVal]) => {
                          const memContact = getContact(memId);
                          return (
                            <div className="split-member-card" key={memId}>
                              <span className="split-member-name">{memContact?.name || `Contact #${memId}`}</span>
                              <span className="split-member-value">
                                {loan.splitMethod === 'Divide Percent' ? `${splitVal}%` : `₱${parseFloat(splitVal || 0).toLocaleString()}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Payment history */}
                  <div className="payment-history-wrap">
                    <span className="expanded-label">Previous Payments:</span>
                    {loan.payments.length > 0 ? (
                      <div className="payments-timeline-table">
                        <div className="timeline-table-header">
                          <span>Date</span>
                          <span>Amount</span>
                          <span>Method</span>
                          <span>Receipt</span>
                          <span style={{ textAlign: 'right' }}>Action</span>
                        </div>
                        {loan.payments.map((p, i) => (
                          <div className="timeline-table-row" key={p.id || i}>
                            <span className="payment-date">{p.date}</span>
                            <span className="payment-amount">₱{p.amount.toLocaleString()}</span>
                            <span className="payment-method-badge">{p.type}</span>
                            <span>
                              {p.receipt ? (
                                <button
                                  className="btn-view-receipt-inline"
                                  onClick={(e) => { e.stopPropagation(); setLightboxImage(p.receipt); }}
                                >
                                  📎 View Receipt
                                </button>
                              ) : (
                                <label className="btn-upload-receipt-inline">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        setLoans(prev => prev.map(l => {
                                          if (l.id === loan.id) {
                                            const updatedPayments = [...l.payments];
                                            updatedPayments[i] = { ...updatedPayments[i], receipt: URL.createObjectURL(file) || file.name };
                                            return { ...l, payments: updatedPayments };
                                          }
                                          return l;
                                        }));
                                      }
                                    }}
                                  />
                                  + Add Receipt
                                </label>
                              )}
                            </span>
                            <span style={{ textAlign: 'right' }}>
                              <button
                                className="btn-remove-payment"
                                disabled={removingPaymentId === p.id}
                                onClick={(e) => { e.stopPropagation(); handleRemovePayment(loan, p); }}
                                title="Revert this payment"
                              >
                                {removingPaymentId === p.id ? '...' : '↩ Revert'}
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-payments-msg">No payments recorded towards this loan yet.</div>
                    )}
                  </div>

                  {/* Overall Loan Receipt Attachment */}
                  <div className="loan-receipt-attachment">
                    <span className="expanded-label">Overall Loan Receipt:</span>
                    {loan.receipt ? (
                      <div
                        className="receipt-thumbnail-container"
                        onClick={(e) => { e.stopPropagation(); setLightboxImage(loan.receipt); }}
                      >
                        <div className="receipt-thumbnail-card">
                          <span className="receipt-icon">🖼️</span>
                          <div className="receipt-info">
                            <span className="receipt-filename">Receipt Image</span>
                            <span className="receipt-subtitle">Click to expand</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="receipt-upload-prompt">
                        <label className="btn btn-light btn-sm">
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                try {
                                  await entryApi.uploadReceipt(loan.id, file);
                                  refreshAllData();
                                } catch (err) {
                                  console.error('Error uploading receipt:', err);
                                  alert('Failed to upload receipt');
                                }
                              }
                            }}
                          />
                          📎 Upload Receipt Image
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="expanded-actions">
                    <button
                      className="btn btn-danger-outline btn-sm"
                      disabled={deletingLoanId === loan.id}
                      onClick={(e) => { e.stopPropagation(); handleDeleteLoan(loan); }}
                      title="Permanently delete this loan entry"
                    >
                      {deletingLoanId === loan.id ? 'Deleting…' : '🗑 Delete Loan'}
                    </button>
                    <div style={{ flex: 1 }} />
                    {loan.type === 'Installment' && (
                      <button
                        className="btn btn-light btn-sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await installmentApi.skipTerm(loan.id);
                            refreshAllData();
                          } catch (err) {
                            console.error('Error skipping installment term:', err);
                          }
                        }}
                      >
                        Skip Term
                      </button>
                    )}
                    <button
                      className="btn btn-dark btn-sm"
                      onClick={(e) => { e.stopPropagation(); setShowPayNow(loan); }}
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedLoans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>
            {filterType
              ? `No ${filterType} loans found. Try a different filter or add a new loan.`
              : 'No loans yet. Click "Add Loan" to get started.'}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxImage(null)}>✕</button>
            <h3>Receipt Attachment</h3>
            <div className="lightbox-image-box">
              {lightboxImage.startsWith('blob:') || lightboxImage.startsWith('data:') ? (
                <img src={lightboxImage} alt="Receipt Preview" className="lightbox-img" />
              ) : (
                <div className="fallback-receipt-img">
                  <span>📄</span>
                  <p>{lightboxImage}</p>
                  <p style={{ fontSize: '0.8rem', color: '#888' }}>(Simulated Local File Attachment)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddLoan && (
        <AddLoanModal
          onClose={() => setShowAddLoan(false)}
          onAdd={handleAddLoan}
          contacts={contacts}
          groups={groups}
        />
      )}

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
