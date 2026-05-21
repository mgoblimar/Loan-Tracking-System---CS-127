import React, { useState, useRef, useEffect } from 'react';
import AddLoanModal from './AddLoanModal';
import PayNowModal from './PayNowModal';

export default function Overview({ loans, setLoans, contacts, groups }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showPayNow, setShowPayNow] = useState(null); // loan object
  const [sortBy, setSortBy] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
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
    if (sortBy === 'type') return a.type.localeCompare(b.type);
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

  const handleAddLoan = (loan) => {
    setLoans((prev) => [...prev, { ...loan, id: Date.now(), paidAmount: 0, payments: [] }]);
    setShowAddLoan(false);
  };

  const handlePayNow = (amount, method, loan) => {
    setLoans((prev) =>
      prev.map((l) =>
        l.id === loan.id
          ? {
              ...l,
              paidAmount: Math.min(l.amount, l.paidAmount + amount),
              payments: [
                ...l.payments,
                { date: new Date().toLocaleDateString(), amount, type: method },
              ],
            }
          : l
      )
    );
    setShowPayNow(null);
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
              Sort By {sortBy ? `(${sortBy})` : ''}
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
          <span>Person</span>
          <span>Amount</span>
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
            <div className="loan-row" key={loan.id}>
              <div
                className="loan-row-main"
                onClick={() => setExpandedId(isExpanded ? null : loan.id)}
              >
                <div className="loan-person">
                  <span className={`stat-dot ${loan.direction === 'owe' ? 'dot-red' : 'dot-green'}`} />
                  <div className="loan-person-info">
                    <h4>{contact?.name || 'Unknown'}</h4>
                    <p>{loan.name} | {loan.startDate}</p>
                  </div>
                </div>
                <div className="loan-amount-cell">
                  ₱ {loan.amount.toLocaleString()}
                  {loan.type === 'Installment' ? ` / ${loan.totalTerms} mos` : ` / ${loan.type}`}
                </div>
                <div className="progress-wrap">
                  <div className="progress-bar-track">
                    <div
                      className={`progress-bar-fill ${isFullyPaid ? 'green' : 'red'}`}
                      style={{ width: `${progress}%` }}
                    >
                      {isFullyPaid
                        ? 'Fully Paid!'
                        : `₱${loan.paidAmount.toLocaleString()} / ₱${loan.amount.toLocaleString()} Paid`}
                    </div>
                  </div>
                  <div className="progress-label">
                    {loan.type === 'Installment' ? `${loan.termsPaid}/${loan.totalTerms} terms paid` : `${progress}% paid`}
                  </div>
                </div>
                <div className="loan-status-cell">
                  <div className={status.cls}>{status.label}</div>
                  {status.label === 'Active' && loan.type === 'Installment' && (
                    <div className="next-payment">
                      Next Payment: ₱{Math.round(loan.amount / loan.totalTerms).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="loan-row-expanded">
                  {loan.notes && <p className="expanded-notes">Notes: {loan.notes}</p>}
                  {loan.payments.length > 0 && (
                    <table className="payment-history-table">
                      <thead>
                        <tr>
                          <th>Previous Dates</th>
                          {loan.payments.map((p, i) => <th key={i}>{p.date}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Amount</strong></td>
                          {loan.payments.map((p, i) => <td key={i}>{p.amount}</td>)}
                        </tr>
                        <tr>
                          <td><strong>Payment Type</strong></td>
                          {loan.payments.map((p, i) => <td key={i}>{p.type}</td>)}
                        </tr>
                      </tbody>
                    </table>
                  )}
                  <div className="expanded-actions">
                    {loan.type === 'Installment' && (
                      <button
                        className="btn btn-light btn-sm"
                        onClick={() =>
                          setLoans((prev) =>
                            prev.map((l) =>
                              l.id === loan.id ? { ...l, termsPaid: l.termsPaid + 1 } : l
                            )
                          )
                        }
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
