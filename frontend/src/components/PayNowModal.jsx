import React, { useState } from 'react';

export default function PayNowModal({ loan, onClose, onPay }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [error, setError] = useState('');
  const remaining = loan.amount - loan.paidAmount;

  const handlePay = () => {
    if (!amount.trim()) {
      setError('Please enter a payment amount.');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (val > remaining) {
      setError(`Payment amount cannot exceed the remaining balance of ₱${remaining.toLocaleString()}.`);
      return;
    }

    setError('');
    onPay(val, method, loan);
  };

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Record Payment / Pay Now</div>

        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fafafa', borderRadius: 10, border: '1px solid #eee' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{loan.name}</div>
          <div style={{ fontSize: '0.85rem', color: '#555' }}>
            Remaining Balance: <strong>₱{remaining.toLocaleString()}</strong>
          </div>
        </div>

        {error && (
          <div className="alert-label-sub dynamic-fade-in" style={{ fontSize: '0.8rem', marginBottom: '1rem', padding: '0.5rem 0.75rem' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label-sub">Amount to Pay (₱)</label>
          <input
            className="form-input"
            type="number"
            placeholder="Amount to Pay"
            value={amount}
            onChange={handleAmountChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label-sub">Select Payment Method</label>
          <div className="select-wrapper">
            <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
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
