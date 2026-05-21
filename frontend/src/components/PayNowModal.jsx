import React, { useState } from 'react';

export default function PayNowModal({ loan, onClose, onPay }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const remaining = loan.amount - loan.paidAmount;

  const handlePay = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    onPay(Math.min(val, remaining), method, loan);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Pay Now</div>

        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fafafa', borderRadius: 10, border: '1px solid #eee' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{loan.name}</div>
          <div style={{ fontSize: '0.85rem', color: '#555' }}>
            Remaining: <strong>₱{remaining.toLocaleString()}</strong>
          </div>
        </div>

        <div className="form-group">
          <input
            className="form-input"
            type="number"
            placeholder="Amount to Pay"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="form-group">
          <div className="select-wrapper">
            <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
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
