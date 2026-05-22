import React, { useState, useRef, useEffect } from 'react';
import AddLoanModal from './AddLoanModal';
import EditLoanModal from './EditLoanModal';
import PayNowModal from './PayNowModal';
import { entryApi, installmentApi, paymentApi, allocationApi } from '../api';

const serializeNotes = (notes, dueDate) => {
  if (!dueDate) return notes || '';
  return `[Due: ${dueDate}] ${notes || ''}`;
};

function InstallmentSchedule({ loan }) {
  const [currentPage, setCurrentPage] = React.useState(0);
  const termsPerPage = 10;
  const totalTerms = loan.termStatuses.length;
  const totalPages = Math.ceil(totalTerms / termsPerPage);

  const startIndex = currentPage * termsPerPage;
  const visibleTerms = loan.termStatuses.slice(startIndex, startIndex + termsPerPage);

  const startDate = loan.startDate ? new Date(loan.startDate) : null;
  const freqWeeks = loan.frequency === 'Monthly' ? null : 1;
  const freqMonths = loan.frequency === 'Monthly' ? 1 : null;

  return (
    <div className="expanded-section-card expanded-installment-section">
      <div className="expanded-section-header">
        <span className="expanded-section-icon">📅</span>
        <span className="expanded-section-title">
          Installment Term Schedule
          <span className="expanded-section-badge">{totalTerms} terms · {loan.frequency}</span>
        </span>

        {totalTerms > termsPerPage && (
          <div className="term-pagination">
            <button
              className="term-pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              title="Previous Page"
            >
              ◀
            </button>
            <span className="term-pagination-info">
              {startIndex + 1} - {Math.min(startIndex + termsPerPage, totalTerms)} of {totalTerms}
            </span>
            <button
              className="term-pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              title="Next Page"
            >
              ▶
            </button>
          </div>
        )}
      </div>

      <div className="term-schedule-grid">
        {visibleTerms.map((termStatus, relativeIdx) => {
          const absoluteIdx = startIndex + relativeIdx;
          const termNum = absoluteIdx + 1;
          let dueDate = null;
          if (startDate) {
            const d = new Date(startDate);
            if (freqMonths) d.setMonth(d.getMonth() + termNum);
            else d.setDate(d.getDate() + termNum * 7);
            dueDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }

          return (
            <div key={absoluteIdx} className={`term-card term-${termStatus.toLowerCase().replace('_', '-')}`}>
              <span className="term-number">Term {termNum}</span>
              <span className={`term-status-badge ts-${termStatus.toLowerCase().replace('_', '-')}`}>
                {termStatus === 'NOT_STARTED' && '⏳ Not Started'}
                {termStatus === 'UNPAID' && '○ Unpaid'}
                {termStatus === 'PAID' && '✓ Paid'}
                {termStatus === 'SKIPPED' && '↷ Skipped'}
                {termStatus === 'DELINQUENT' && '⚠ Delinquent'}
              </span>
              {dueDate && <span className="term-due-date">Due {dueDate}</span>}
              <span className="term-amount">₱{loan.termAmount?.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Overview({ loans, setLoans, contacts, groups, activePersonId, refreshAllData, simulatedDate }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showPayNow, setShowPayNow] = useState(null);
  const [showSkipChoiceModal, setShowSkipChoiceModal] = useState(null);
  const [selectedOption, setSelectedOption] = useState('extend');
  const [submittingSkip, setSubmittingSkip] = useState(false);
  // sortKey: 'default' | 'date' | 'type-straight' | 'type-installment' | 'type-group' | 'progress-asc' | 'progress-desc' | 'completed'
  const [sortKey, setSortKey] = useState('newest');
  const [sortDir, setSortDir] = useState('desc'); // 'desc' = newest first by default
  const [filterType, setFilterType] = useState(null); // null | 'Straight' | 'Installment' | 'Group'
  const [filterDirection, setFilterDirection] = useState(null); // null | 'owe' | 'owed'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [removingPaymentId, setRemovingPaymentId] = useState(null);
  const [deletingLoanId, setDeletingLoanId] = useState(null);
  const [showEditLoan, setShowEditLoan] = useState(null); // loan object being edited
  const [showArchived, setShowArchived] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState(null); // loan object to confirm deletion
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
    const today = simulatedDate ? new Date(simulatedDate) : new Date();
    if (loan.dueDate && new Date(loan.dueDate) < today) return { label: 'Overdue', cls: 'status-overdue' };
    return { label: 'Active', cls: 'status-active' };
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredLoans = loans.filter((l) => {
    const matchesType = !filterType || l.type === filterType;
    const matchesArchive = showArchived ? l.archived : !l.archived;
    const matchesDirection = !filterDirection || l.direction === filterDirection;
    return matchesType && matchesArchive && matchesDirection;
  });

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
        if (!loan.lenderId) {
          alert('Please select a Lender');
          return;
        }
        lender = { id: loan.lenderId };
      }

      const dateBorrowed = loan.startDate || simulatedDate || new Date().toISOString().split('T')[0];

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
      alert('Failed to create loan: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
    }
  };

  const handlePayNow = async (amount, method, loan, memberPayments) => {
    try {
      const activePaymentDate = simulatedDate || new Date().toISOString().split('T')[0];
      if (memberPayments && memberPayments.length > 0) {
        // Group: record one payment per paying member
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
      alert('Failed to record payment: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
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
      alert('Failed to remove payment: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
    } finally {
      setRemovingPaymentId(null);
    }
  };

  const handleDeleteLoan = (loan) => {
    setLoanToDelete(loan);
  };

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return;
    const loan = loanToDelete;
    setDeletingLoanId(loan.id);
    try {
      await entryApi.delete(loan.id);
      setLoanToDelete(null);
      refreshAllData();
    } catch (err) {
      console.error('Error deleting loan:', err);
      alert('Failed to delete loan: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
    } finally {
      setDeletingLoanId(null);
    }
  };

  const handleArchiveLoan = async (loan, isArchive) => {
    try {
      let lender = null;
      let borrowerPerson = null;
      let borrowerGroup = null;

      if (loan.type !== 'Group') {
        if (loan.direction === 'owe') {
          lender = { id: loan.lenderId };
          borrowerPerson = { id: activePersonId };
        } else {
          lender = { id: activePersonId };
          borrowerPerson = { id: loan.borrowerId };
        }
      } else {
        lender = loan.lenderId ? { id: loan.lenderId } : { id: activePersonId };
        borrowerGroup = { id: loan.groupId };
      }

      const transactionType = loan.type === 'Straight'
        ? 'STRAIGHT_EXPENSE'
        : loan.type === 'Installment'
          ? 'INSTALLMENT_EXPENSE'
          : 'GROUP_EXPENSE';

      const updatePayload = {
        name: loan.name,
        description: loan.notes || '',
        notes: serializeNotes(loan.notes, loan.dueDate),
        dateBorrowed: loan.startDate,
        amountBorrowed: loan.amount,
        amountRemaining: Math.max(0, loan.amount - loan.paidAmount),
        transactionType,
        lender,
        borrowerPerson,
        borrowerGroup,
        archived: isArchive,
      };

      await entryApi.update(loan.id, updatePayload);
      alert(isArchive ? 'Success: Loan archived successfully!' : 'Success: Loan unarchived successfully!');
      refreshAllData();
    } catch (err) {
      console.error('Error archiving loan:', err);
      alert('Failed to archive loan: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
    }
  };

  const handleEditLoan = async (updatedFields, rawFile) => {
    const original = showEditLoan;
    try {
      // Reconstruct lender/borrower/group from original (locked — not editable)
      let lender = null;
      let borrowerPerson = null;
      let borrowerGroup = null;

      if (original.type !== 'Group') {
        if (original.direction === 'owe') {
          lender = { id: original.lenderId };
          borrowerPerson = { id: activePersonId };
        } else {
          lender = { id: activePersonId };
          borrowerPerson = { id: original.borrowerId };
        }
      } else {
        lender = original.lenderId ? { id: original.lenderId } : { id: activePersonId };
        borrowerGroup = { id: original.groupId };
      }

      const transactionType = original.type === 'Straight'
        ? 'STRAIGHT_EXPENSE'
        : original.type === 'Installment'
          ? 'INSTALLMENT_EXPENSE'
          : 'GROUP_EXPENSE';

      const updatePayload = {
        name: updatedFields.name,
        description: updatedFields.notes || '',
        notes: serializeNotes(updatedFields.notes, updatedFields.dueDate),
        dateBorrowed: updatedFields.startDate,
        amountBorrowed: updatedFields.amount,
        amountRemaining: Math.max(0, updatedFields.amount - original.paidAmount),
        transactionType,
        lender,
        borrowerPerson,
        borrowerGroup,
        archived: original.archived || false,
      };

      await entryApi.update(original.id, updatePayload);

      // For installment: also update the InstallmentDetail
      if (original.type === 'Installment') {
        const terms = updatedFields.totalTerms || original.totalTerms || 1;
        await installmentApi.updateDetail(original.id, {
          startDate: updatedFields.startDate,
          paymentFrequency: updatedFields.frequency === 'Monthly' ? 'MONTHLY' : 'WEEKLY',
          paymentTerms: terms,
          paymentAmountPerTerm: updatedFields.amount / terms,
          notes: updatedFields.notes || '',
        });
      }

      if (rawFile) {
        await entryApi.uploadReceipt(original.id, rawFile);
      }

      setShowEditLoan(null);
      refreshAllData();
    } catch (err) {
      console.error('Error updating loan:', err);
      alert('Failed to update loan: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
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
          <span className="loan-summary-title">
            {showArchived ? 'Archived Completed Loans' : 'Loan Summary'}
          </span>


          {/* Filter chips */}
          <div className="filter-chips">
            {/* Direction filters */}
            <button
              className={`filter-chip direction-chip owe-chip ${filterDirection === 'owe' ? 'active' : ''}`}
              onClick={() => setFilterDirection(filterDirection === 'owe' ? null : 'owe')}
              title="Show loans you owe to others"
            >
              🔴 You Owe
            </button>
            <button
              className={`filter-chip direction-chip owed-chip ${filterDirection === 'owed' ? 'active' : ''}`}
              onClick={() => setFilterDirection(filterDirection === 'owed' ? null : 'owed')}
              title="Show loans others owe you"
            >
              🟢 Owed to You
            </button>

            {/* Divider */}
            <span className="filter-chip-divider" />

            {/* Type filters */}
            {['Straight', 'Installment', 'Group'].map((t) => (
              <button
                key={t}
                className={`filter-chip ${t.toLowerCase()}-chip ${filterType === t ? 'active' : ''}`}
                onClick={() => setFilterType(filterType === t ? null : t)}
              >
                {t}
              </button>
            ))}

            {/* Divider */}
            <span className="filter-chip-divider" />

            {/* Archived toggle */}
            <button
              className={`filter-chip archived-toggle ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(!showArchived)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: showArchived ? '1.5px solid #38bdf8' : '1.5px solid #e0e0e0',
                background: showArchived ? 'rgba(56, 189, 248, 0.1)' : '#fff',
                color: showArchived ? '#38bdf8' : '#555',
              }}
            >
              📥 {showArchived ? 'Viewing Archived' : 'Show Archived'}
            </button>
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
        {(filterType || filterDirection || showArchived) && (
          <div className="active-filter-bar" style={{
            background: showArchived ? '#f0f9ff' : filterDirection === 'owe' ? '#fff1f2' : filterDirection === 'owed' ? '#f0fdf4' : '#f0f4ff',
            borderColor: showArchived ? '#bae6fd' : filterDirection === 'owe' ? '#fecdd3' : filterDirection === 'owed' ? '#bbf7d0' : '#dbeafe',
            color: showArchived ? '#0369a1' : filterDirection === 'owe' ? '#be123c' : filterDirection === 'owed' ? '#166534' : '#1e40af'
          }}>
            <span>
              Showing{' '}
              {showArchived && <strong>Archived </strong>}
              {filterDirection === 'owe' && <strong>🔴 You Owe </strong>}
              {filterDirection === 'owed' && <strong>🟢 Owed to You </strong>}
              {filterType ? <strong>{filterType} </strong> : ''}
              loans
            </span>
            <button className="clear-filter-btn" onClick={() => { setFilterType(null); setFilterDirection(null); setShowArchived(false); }}>✕ Clear All</button>
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

          const displayName = isGroup
            ? (groups.find((g) => String(g.id) === String(loan.groupId))?.name || 'Unknown Group')
            : (contact?.name || 'Unknown');

          const progressTrack = (
            <div className="progress-bar-track">
              <div
                className={`progress-bar-fill ${isFullyPaid ? 'green' : 'red'}`}
                style={{ width: `${progress}%` }}
              >
                {progress}%
              </div>
            </div>
          );

          const progressLabel = loan.type === 'Installment'
            ? `${loan.termsPaid || 0}/${loan.totalTerms} terms paid`
            : `₱${loan.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₱${loan.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} paid`;

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
                </div>
                <div className="loan-amount-cell">
                  <strong>₱ {loan.amount.toLocaleString()}</strong>
                  <div style={{ marginTop: '4.5px' }}>
                    <span className={`pp-type-badge pp-type-${loan.type.toLowerCase()}`} style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {loan.type === 'Installment' ? `${loan.frequency} Installment` : loan.type}
                    </span>
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
                  {/* Payment Status badge */}
                  {loan.paymentStatus && (
                    <div className={`payment-status-badge ps-${loan.paymentStatus.toLowerCase().replace('_', '-')}`}>
                      {loan.paymentStatus === 'UNPAID' && '○ Unpaid'}
                      {loan.paymentStatus === 'PARTIALLY_PAID' && '◑ Partial'}
                      {loan.paymentStatus === 'PAID' && '● Paid'}
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="loan-row-expanded">

                  {/* ── Top Meta Strip: Transaction Details ── */}
                  <div className="expanded-section-card expanded-ref-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px', padding: '18px', background: '#fafbfc', border: '1px solid #edf2f7', borderRadius: '12px', marginBottom: '16px' }}>
                    <div>
                      <div className="expanded-section-header" style={{ marginBottom: '6px' }}>
                        <span className="expanded-section-icon">⚡</span>
                        <span className="expanded-section-title" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Transaction Type</span>
                      </div>
                      <span className={`pp-type-badge pp-type-${loan.type.toLowerCase()}`} style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {loan.type === 'Installment' ? `${loan.frequency} Installment` : loan.type}
                      </span>
                    </div>

                    <div>
                      <div className="expanded-section-header" style={{ marginBottom: '6px' }}>
                        <span className="expanded-section-icon">🔄</span>
                        <span className="expanded-section-title" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Repayment Role</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 800, 
                        color: loan.direction === 'owe' ? '#ef4444' : '#22c55e', 
                        background: loan.direction === 'owe' ? '#fef2f2' : '#f0fdf4',
                        border: loan.direction === 'owe' ? '1px solid #fee2e2' : '1px solid #dcfce7',
                        borderRadius: '999px',
                        padding: '3px 10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        display: 'inline-block'
                      }}>
                        {loan.direction === 'owe' ? '🔴 You Owe' : '🟢 Owed to You'}
                      </span>
                    </div>

                    {loan.referenceId && (
                      <div>
                        <div className="expanded-section-header" style={{ marginBottom: '6px' }}>
                          <span className="expanded-section-icon">🔖</span>
                          <span className="expanded-section-title" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Reference ID</span>
                        </div>
                        <code className="ref-id-badge" style={{ margin: 0, padding: '3px 10px', display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '6px' }}>
                          {loan.referenceId}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* ── Notes Section ── */}
                  {loan.notes && (
                    <div className="expanded-section-card expanded-notes-section">
                      <div className="expanded-section-header">
                        <span className="expanded-section-icon">📝</span>
                        <span className="expanded-section-title">Notes</span>
                      </div>
                      <p className="expanded-notes-text">{loan.notes}</p>
                    </div>
                  )}

                  {/* ── Group Splits Section ── */}
                  {loan.type === 'Group' && loan.splits && Object.keys(loan.splits).length > 0 && (
                    <div className="expanded-section-card expanded-splits-section">
                      <div className="expanded-section-header">
                        <span className="expanded-section-icon">👥</span>
                        <span className="expanded-section-title">
                          Group Split Details
                          <span className="expanded-section-badge">{loan.splitMethod === 'Divide Percent' ? 'By Percentage' : 'By Value'}</span>
                        </span>
                      </div>
                      <div className="splits-grid">
                        {Object.entries(loan.splits).map(([memId, splitVal]) => {
                          const memContact = getContact(memId);
                          const isPercent = loan.splitMethod === 'Divide Percent';
                          const allocatedAmount = isPercent
                            ? (parseFloat(splitVal || 0) / 100) * loan.amount
                            : parseFloat(splitVal || 0);
                          const amountPaid = loan.payments
                            .filter(p => String(p.payeeId) === String(memId))
                            .reduce((sum, p) => sum + p.amount, 0);
                          
                          let allocStatus = 'UNPAID';
                          if (amountPaid >= allocatedAmount) {
                            allocStatus = 'PAID';
                          } else if (amountPaid > 0) {
                            allocStatus = 'PARTIALLY_PAID';
                          }

                          return (
                            <div className="split-member-card" key={memId}>
                              <div className="split-member-info">
                                <span className="split-member-name">{memContact?.name || `Contact #${memId}`}</span>
                                <div className="split-member-status-row">
                                  <span className={`payment-allocation-status-badge pas-${allocStatus.toLowerCase().replace('_', '-')}`}>
                                    {allocStatus === 'UNPAID' && '○ Unpaid'}
                                    {allocStatus === 'PARTIALLY_PAID' && '◑ Partial'}
                                    {allocStatus === 'PAID' && '● Paid'}
                                  </span>
                                  <span className="split-member-paid-progress">
                                    ₱{amountPaid.toLocaleString()} / ₱{allocatedAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <span className="split-member-value">
                                {isPercent ? `${splitVal}%` : `₱${parseFloat(splitVal || 0).toLocaleString()}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Installment Term Schedule ── */}
                  {loan.type === 'Installment' && loan.termStatuses && loan.termStatuses.length > 0 && (
                    <InstallmentSchedule loan={loan} />
                  )}

                  {/* ── Previous Payments Section ── */}
                  <div className="expanded-section-card expanded-payments-section">
                    <div className="expanded-section-header">
                      <span className="expanded-section-icon">💳</span>
                      <span className="expanded-section-title">
                        Previous Payments
                        <span className="expanded-section-badge">{loan.payments.length} record{loan.payments.length !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
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
                            <span className={`payment-method-badge ${p.type.toLowerCase().replace(/\s+/g, '-')}`}>{p.type}</span>
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

                  {/* ── Overall Loan Receipt Section ── */}
                  <div className="expanded-section-card expanded-receipt-section">
                    <div className="expanded-section-header">
                      <span className="expanded-section-icon">🖼️</span>
                      <span className="expanded-section-title">Overall Loan Receipt</span>
                    </div>
                    {loan.receipt ? (
                      <div
                        className="receipt-preview-btn"
                        onClick={(e) => { e.stopPropagation(); setLightboxImage(loan.receipt); }}
                      >
                        <span className="receipt-preview-icon">📄</span>
                        <div className="receipt-preview-info">
                          <span className="receipt-preview-name">Receipt Image on File</span>
                          <span className="receipt-preview-sub">Click to view full image</span>
                        </div>
                        <span className="receipt-preview-arrow">→</span>
                      </div>
                    ) : (
                      <label className="receipt-upload-label">
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
                        <span className="receipt-upload-icon">📎</span>
                        <span className="receipt-upload-text">Click to upload receipt image</span>
                      </label>
                    )}
                  </div>

                  {/* ── Action Buttons ── */}
                  <div className="expanded-actions">
                    <button
                      className="btn btn-danger-outline btn-sm"
                      disabled={deletingLoanId === loan.id}
                      onClick={(e) => { e.stopPropagation(); handleDeleteLoan(loan); }}
                      title="Permanently delete this loan entry"
                    >
                      {deletingLoanId === loan.id ? 'Deleting…' : '🗑 Delete Loan'}
                    </button>
                    {!loan.archived && (
                      <button
                        className="btn btn-light btn-sm"
                        onClick={(e) => { e.stopPropagation(); setShowEditLoan(loan); }}
                        title="Edit this loan entry"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    {isFullyPaid && (
                      <button
                        className="btn btn-sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleArchiveLoan(loan, !loan.archived);
                        }}
                        title={loan.archived ? "Unarchive this loan" : "Archive this loan"}
                        style={{
                          background: loan.archived ? 'rgba(234, 179, 8, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                          color: loan.archived ? '#eab308' : '#38bdf8',
                          border: loan.archived ? '1px solid rgba(234, 179, 8, 0.2)' : '1px solid rgba(56, 189, 248, 0.2)',
                          borderRadius: '8px',
                          padding: '0.4rem 0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {loan.archived ? '📤 Unarchive Loan' : '📥 Archive Loan'}
                      </button>
                    )}
                    {!loan.archived && loan.type === 'Installment' && (
                      <button
                        className="btn btn-light btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOption('extend');
                          setSubmittingSkip(false);
                          setShowSkipChoiceModal(loan);
                        }}
                      >
                        Skip Term
                      </button>
                    )}
                    {!loan.archived && !isFullyPaid && (
                      <button
                        className="btn btn-dark btn-sm"
                        onClick={(e) => { e.stopPropagation(); setShowPayNow(loan); }}
                      >
                        Pay Now
                      </button>
                    )}
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
              {lightboxImage.startsWith('blob:') || lightboxImage.startsWith('data:') || lightboxImage.startsWith('http') || lightboxImage.startsWith('/') ? (
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
          activePersonId={activePersonId}
        />
      )}

      {showEditLoan && (
        <EditLoanModal
          loan={showEditLoan}
          onClose={() => setShowEditLoan(null)}
          onEdit={handleEditLoan}
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

      {loanToDelete && (
        <div className="modal-overlay" onClick={() => setLoanToDelete(null)}>
          <div 
            className="modal" 
            style={{ maxWidth: '480px', width: '90%', padding: '24px', borderRadius: '14px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-title" style={{ color: '#e11d48', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 800, borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
              <span>⚠️</span> Permanent Deletion Alert
            </div>

            {/* Main Question */}
            <p style={{ margin: '0 0 16px 0', fontSize: '0.96rem', color: '#334155', lineHeight: '1.5' }}>
              Are you sure you want to delete the loan entry <strong style={{ color: '#0f172a', wordBreak: 'break-word' }}>"{loanToDelete.name}"</strong>?
            </p>

            {/* Warning Callout Box */}
            <div style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '10px',
              padding: '14px 16px',
              color: '#9f1239',
              fontSize: '0.84rem',
              lineHeight: '1.45',
              marginBottom: '20px'
            }}>
              <strong style={{ display: 'block', color: '#be123c', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>🚨 Critical Accounting Warning</strong>
              This action will permanently purge this entry and <strong style={{ color: '#e11d48', fontWeight: 800 }}>ALL associated payments and splits</strong> from the database. This ledger adjustment cannot be restored.
            </div>

            {/* Footer Buttons */}
            <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', gap: '8px', display: 'flex', justifyContent: 'flex-end', margin: 0 }}>
              <button 
                className="btn btn-light" 
                onClick={() => setLoanToDelete(null)}
                style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 600, border: '1px solid #cbd5e1' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-dark" 
                style={{ 
                  backgroundColor: '#e11d48', 
                  borderColor: '#e11d48', 
                  color: '#fff', 
                  fontWeight: '700',
                  padding: '8px 20px', 
                  fontSize: '0.85rem', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(225,29,72,0.2)' 
                }}
                onClick={confirmDeleteLoan}
                disabled={deletingLoanId !== null}
              >
                {deletingLoanId ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSkipChoiceModal && (() => {
        const loan = showSkipChoiceModal;
        const amountRemaining = loan.amount - loan.paidAmount;
        const paidTerms = loan.termsPaid;
        const skippedTerms = loan.skippedTerms || 0;
        
        // Option A: Extend Maturity
        const extendTotalTerms = loan.totalTerms + 1;
        const extendPerTermAmount = loan.termAmount;
        
        // Option B: Recalculate
        const recalcSkippedTerms = skippedTerms + 1;
        const recalcRemainingActive = loan.totalTerms - (paidTerms + recalcSkippedTerms);
        const recalcDisabled = recalcRemainingActive <= 0;
        const recalcPerTermAmount = recalcDisabled ? 0 : (amountRemaining / recalcRemainingActive);

        return (
          <div className="modal-overlay" onClick={() => setShowSkipChoiceModal(null)}>
            <div 
              className="modal" 
              style={{ 
                maxWidth: '540px', 
                width: '90%', 
                padding: '28px', 
                borderRadius: '16px', 
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
                background: '#ffffff',
                border: '1px solid rgba(226, 232, 240, 0.8)'
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>↷</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Skip Installment Term</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Choose how to allocate the skipped term for <strong>{loan.name}</strong></p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSkipChoiceModal(null)}
                  style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
                >
                  ✕
                </button>
              </div>

              {/* Summary Stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px', 
                padding: '12px 16px', 
                background: '#f8fafc', 
                borderRadius: '10px', 
                marginBottom: '20px',
                fontSize: '0.85rem'
              }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Remaining Balance</span>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>₱{amountRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Current Per-Term Rate</span>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>₱{loan.termAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* Option A (Extend Maturity) Card */}
              <div 
                onClick={() => setSelectedOption('extend')}
                style={{
                  border: `2px solid ${selectedOption === 'extend' ? '#0f172a' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  marginBottom: '14px',
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedOption === 'extend' ? '#fafafa' : '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input 
                    type="radio" 
                    name="skipOption" 
                    checked={selectedOption === 'extend'}
                    onChange={() => setSelectedOption('extend')}
                    style={{ marginTop: '4px', accentColor: '#0f172a' }}
                  />
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem' }}>Option A: Extend Maturity (Recommended)</strong>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.82rem', marginTop: '4px', lineHeight: '1.4' }}>
                      Appends a new term at the end of the schedule. This keeps the installment schedule alive longer without altering your monthly bill.
                    </span>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#475569' }}>
                      <span>New Total Terms: <strong>{extendTotalTerms}</strong> (was {loan.totalTerms})</span>
                      <span>Payment Rate: <strong>₱{extendPerTermAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option B (Recalculate Rate) Card */}
              <div 
                onClick={() => {
                  if (!recalcDisabled) setSelectedOption('recalculate');
                }}
                style={{
                  border: `2px solid ${selectedOption === 'recalculate' ? '#0f172a' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: recalcDisabled ? 'not-allowed' : 'pointer',
                  opacity: recalcDisabled ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedOption === 'recalculate' ? '#fafafa' : '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input 
                    type="radio" 
                    name="skipOption" 
                    disabled={recalcDisabled}
                    checked={selectedOption === 'recalculate'}
                    onChange={() => setSelectedOption('recalculate')}
                    style={{ marginTop: '4px', accentColor: '#0f172a' }}
                  />
                  <div>
                    <strong style={{ display: 'block', color: recalcDisabled ? '#94a3b8' : '#0f172a', fontSize: '0.95rem' }}>
                      Option B: Recalculate Rate
                    </strong>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.82rem', marginTop: '4px', lineHeight: '1.4' }}>
                      Maintains the original maturity date but redistributes the remaining balance across your active future terms.
                    </span>
                    {recalcDisabled ? (
                      <div style={{ marginTop: '10px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                        ⚠️ Disabled: No remaining active terms to redistribute the balance. You must choose Option A.
                      </div>
                    ) : (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#475569' }}>
                        <span>Remaining Active Terms: <strong>{recalcRemainingActive}</strong></span>
                        <span>New Payment Rate: <strong style={{ color: '#0f172a' }}>₱{recalcPerTermAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '20px' }}>
                <button 
                  className="btn btn-light" 
                  onClick={() => setShowSkipChoiceModal(null)}
                  style={{ borderRadius: '8px', padding: '8px 18px', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-dark" 
                  disabled={submittingSkip}
                  onClick={async () => {
                    setSubmittingSkip(true);
                    try {
                      await installmentApi.skipTerm(loan.id, selectedOption);
                      refreshAllData();
                      setShowSkipChoiceModal(null);
                    } catch (err) {
                      console.error('Error skipping installment term:', err);
                    } finally {
                      setSubmittingSkip(false);
                    }
                  }}
                  style={{ borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  {submittingSkip ? 'Processing...' : 'Confirm Skip'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
