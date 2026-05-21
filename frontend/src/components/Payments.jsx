import React, { useState } from 'react';
import PayNowModal from './PayNowModal';
import { paymentApi } from '../api';

export default function Payments({ loans, setLoans, contacts, activePersonId, refreshAllData }) {
  const [showPayNow, setShowPayNow] = useState(null);

  const getContact = (id) => contacts.find((c) => c.id === id);

  const youPaid = loans.filter((l) => l.direction === 'owe' && l.paidAmount < l.amount);
  const paidYou = loans.filter((l) => l.direction === 'owed' && l.paidAmount < l.amount);

  const totalDueFromYou = youPaid.reduce((s, l) => s + (l.amount - l.paidAmount), 0);
  const totalDueToYou = paidYou.reduce((s, l) => s + (l.amount - l.paidAmount), 0);

  const fmt = (n) => `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

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

      {/* Two columns */}
      <div className="payments-columns">
        <div className="payments-list-card">
          <div className="payments-list-title">Payments You Have to Make:</div>
          {youPaid.map((loan) => {
            const contact = getContact(loan.borrowerId || loan.lenderId);
            return (
              <div key={loan.id} className="payment-list-item">
                <div className="payment-list-info">
                  <h4>{contact?.name || 'Unknown'}</h4>
                  <p>{loan.name} | Start: {loan.startDate}{loan.dueDate ? ` | Due: ${loan.dueDate}` : ''}</p>
                </div>
                <div className="payment-list-actions-side">
                  <div className="payment-list-amount amount-red">
                    ₱ {(loan.amount - loan.paidAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
            return (
              <div key={loan.id} className="payment-list-item">
                <div className="payment-list-info">
                  <h4>{contact?.name || 'Unknown'}</h4>
                  <p>{loan.name} | Start: {loan.startDate}{loan.dueDate ? ` | Due: ${loan.dueDate}` : ''}</p>
                </div>
                <div className="payment-list-amount amount-green">
                  ₱ {(loan.amount - loan.paidAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
          {paidYou.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>No incoming payments pending.</div>
          )}
        </div>
      </div>

      {showPayNow && (
        <PayNowModal loan={showPayNow} onClose={() => setShowPayNow(null)} onPay={handlePayNow} />
      )}
    </div>
  );
}
