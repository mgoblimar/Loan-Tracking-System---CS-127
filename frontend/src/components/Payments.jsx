import React, { useState } from 'react';
import PayNowModal from './PayNowModal';

export default function Payments({ loans, setLoans, contacts }) {
  const [showPayNow, setShowPayNow] = useState(null);

  const getContact = (id) => contacts.find((c) => c.id === id);

  const youPaid = loans.filter((l) => l.direction === 'owe');
  const paidYou = loans.filter((l) => l.direction === 'owed');

  const totalDueFromYou = youPaid.reduce((s, l) => s + (l.amount - l.paidAmount), 0);
  const totalDueToYou = paidYou.reduce((s, l) => s + (l.amount - l.paidAmount), 0);

  const fmt = (n) => `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

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
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <button className="btn btn-light btn-sm" onClick={() => setShowPayNow(youPaid[0] || null)}>
          Pay Now
        </button>
      </div>

      {/* Summary cards */}
      <div className="payments-summary-grid">
        <div className="payment-summary-card">
          <div className="payment-summary-label">
            <span className="stat-dot dot-red" /> Due from you
          </div>
          <div className="payment-summary-amount amount-red">{fmt(totalDueFromYou)}</div>
          <div className="payment-summary-sub">You owe {youPaid.length} people</div>
        </div>
        <div className="payment-summary-card">
          <div className="payment-summary-label">
            <span className="stat-dot dot-green" /> Due to you
          </div>
          <div className="payment-summary-amount amount-green">{fmt(totalDueToYou)}</div>
          <div className="payment-summary-sub">{paidYou.length} people owe you</div>
        </div>
      </div>

      {/* Two columns */}
      <div className="payments-columns">
        <div className="payments-list-card">
          <div className="payments-list-title">You Paid:</div>
          {youPaid.map((loan) => {
            const contact = getContact(loan.borrowerId || loan.lenderId);
            return (
              <div key={loan.id} className="payment-list-item">
                <div className="payment-list-info">
                  <h4>{contact?.name || 'Unknown'}</h4>
                  <p>{loan.name} | {loan.startDate}</p>
                </div>
                <div className="payment-list-amount amount-red">
                  ₱ {(loan.amount - loan.paidAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
          {youPaid.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '1rem' }}>Nothing due</div>
          )}
        </div>

        <div className="payments-list-card">
          <div className="payments-list-title">Paid You:</div>
          {paidYou.map((loan) => {
            const contact = getContact(loan.borrowerId || loan.lenderId);
            return (
              <div key={loan.id} className="payment-list-item">
                <div className="payment-list-info">
                  <h4>{contact?.name || 'Unknown'}</h4>
                  <p>{loan.name} | {loan.startDate}</p>
                </div>
                <div className="payment-list-amount amount-green">
                  ₱ {(loan.amount - loan.paidAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
          {paidYou.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '1rem' }}>Nothing owed to you</div>
          )}
        </div>
      </div>

      {showPayNow && (
        <PayNowModal loan={showPayNow} onClose={() => setShowPayNow(null)} onPay={handlePayNow} />
      )}
    </div>
  );
}
