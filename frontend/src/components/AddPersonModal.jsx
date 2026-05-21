import React, { useState } from 'react';

export default function AddPersonModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">New Contact</div>
        <p className="modal-subtitle-desc" style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: '#666' }}>
          Create a new contact entry to be selected as lender, borrower, or added to group splits.
        </p>

        <div className="form-group">
          <label className="form-label-sub">Full Name</label>
          <input
            className="form-input"
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label-sub">Contact Information (Phone Number)</label>
          <input
            className="form-input"
            placeholder="e.g. +63 912 345 6789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={handleSubmit} disabled={!name.trim()}>
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}

