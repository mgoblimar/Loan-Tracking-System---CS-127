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
  const [showPayNow, setShowPayNow] = useState(null); // loan object
  const [sortBy, setSortBy] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
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

  const totalOwe = loans
    .filter((l) => l.direction === 'owe')
    .reduce((s, l) => s + (l.amount - l.paidAmount), 0);
  const totalOwed = loans
    .filter((l) => l.direction === 'owed')
    .reduce((s, l) => s + (l.amount - l.paidAmount), 0);

  const byYouCount = loans.filter((l) => l.direction === 'owe').length;
  const fromYouCount = loans.filter((l) => l.direction === 'owed').length;

  const dueSoonLoan = loans
    .filter((l) => l.direction === 'owe' && l.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  const dueSoonOwe = dueSoonLoan ? (dueSoonLoan.amount - dueSoonLoan.paidAmount) : 0;

  const fmt = (n) => `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const sortedLoans = [...loans].sort((a, b) => {
    if (sortBy === 'date') return new Date(a.startDate) - new Date(b.startDate);
    if (sortBy === 'type') {
      const order = { Straight: 1, Installment: 2, Group: 3 };
      return (order[a.type] || 0) - (order[b.type] || 0);
    }
    return 0;
  });

  const getProgress = (loan) => {
    if (loan.amount === 0) return 100;
    return Math.min(100, Math.round((loan.paidAmount / loan.amount) * 100));
  };

  const getStatus = (loan) => {
    if (loan.paidAmount >= loan.amount) return { label: 'Completed', cls: 'status-completed' };
    if (loan.dueDate && new Date(loan.dueDate) < new Date()) return { label: 'Overdue', cls: 'status-overdue' };
    return { label: 'Active', cls: 'status-active' };
  };

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

      // If installment, create installment details
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

        // If termsPaid > 0, seed individual payments
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

      // If group, divide percent or divide amount
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

      // If receipt file is uploaded, upload it
      if (rawFile) {
        await entryApi.uploadReceipt(createdEntry.id, rawFile);
      }

      setShowAddLoan(false);
      refreshAllData();
    } catch (err) {
      console.error('Error creating loan entry:', err);
      alert('Failed to create loan entry: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePayNow = async (amount, method, loan) => {
    try {
      const payeeId = loan.direction === 'owe' ? loan.lenderId : activePersonId;
      const paymentPayload = {
        paymentAmount: amount,
        payee: { id: payeeId },
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Paid via ${method}`
      };
      await paymentApi.record(loan.id, paymentPayload);
      setShowPayNow(null);
      refreshAllData();
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Loans:</div>
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
          <div className="sort-dropdown-wrap" ref={sortRef}>
            <button className="btn btn-light btn-sm" onClick={() => setShowSortMenu((v) => !v)}>
              Sort By {sortBy ? `(${sortBy === 'date' ? 'Date' : 'Loan Type'})` : ''}
            </button>
            {showSortMenu && (
              <div className="sort-menu">
                <div
                  className={`sort-menu-item ${sortBy === 'date' ? 'selected' : ''}`}
                  onClick={() => { setSortBy('date'); setShowSortMenu(false); }}
                >
                  Date
                </div>
                <div
                  className={`sort-menu-item ${sortBy === 'type' ? 'selected' : ''}`}
                  onClick={() => { setSortBy('type'); setShowSortMenu(false); }}
                >
                  Loan Type (Straight / Installment / Group)
                </div>
                <div
                  className={`sort-menu-item ${!sortBy ? 'selected' : ''}`}
                  onClick={() => { setSortBy(null); setShowSortMenu(false); }}
                >
                  Default
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-dark btn-sm" onClick={() => setShowAddLoan(true)}>
            Add Loan
          </button>
        </div>

        <div className="loan-table-header">
          <span>Person / Details</span>
          <span>Amount & Type</span>
          <span>Progress</span>
          <span style={{ textAlign: 'right' }}>Status</span>
        </div>

        {sortedLoans.map((loan) => {
          const contact = getContact(loan.borrowerId || loan.lenderId);
          const progress = getProgress(loan);
          const status = getStatus(loan);
          const isExpanded = expandedId === loan.id;
          const isFullyPaid = loan.paidAmount >= loan.amount;

          return (
            <div className={`loan-row ${isExpanded ? 'loan-row-open' : ''}`} key={loan.id}>
              <div
                className="loan-row-main"
                onClick={() => setExpandedId(isExpanded ? null : loan.id)}
              >
                <div className="loan-person">
                  <span className={`stat-dot ${loan.direction === 'owe' ? 'dot-red' : 'dot-green'}`} />
                  <div className="loan-person-info">
                    <h4>{contact?.name || 'Unknown'}</h4>
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
                  <div className="progress-bar-track">
                    <div
                      className={`progress-bar-fill ${isFullyPaid ? 'green' : 'red'}`}
                      style={{ width: `${progress}%` }}
                    >
                      {progress}%
                    </div>
                  </div>
                  <div className="progress-label">
                    {loan.type === 'Installment' 
                      ? `${loan.termsPaid || 0}/${loan.totalTerms} terms paid` 
                      : `₱${loan.paidAmount.toLocaleString()} / ₱${loan.amount.toLocaleString()} paid`
                    }
                  </div>
                </div>
                <div className="loan-status-cell">
                  <div className={status.cls}>{status.label}</div>
                  {status.label === 'Active' && loan.type === 'Installment' && (
                    <div className="next-payment">
                      Next: ₱{Math.round(loan.amount / loan.totalTerms).toLocaleString()}
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

                  {/* Payment timeline/grid (Image 2 representation) */}
                  <div className="payment-history-wrap">
                    <span className="expanded-label">Previous Payments:</span>
                    {loan.payments.length > 0 ? (
                      <div className="payments-timeline-table">
                        <div className="timeline-table-header">
                          <span>Date</span>
                          <span>Amount</span>
                          <span>Method</span>
                          <span>Receipt</span>
                        </div>
                        {loan.payments.map((p, i) => (
                          <div className="timeline-table-row" key={i}>
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

        {loans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>
            No loans yet. Click "Add Loan" to get started.
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
        />
      )}
    </div>
  );
}
