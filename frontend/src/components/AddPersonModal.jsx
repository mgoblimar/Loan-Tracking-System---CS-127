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
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">New Person</div>

        <div className="form-group">
          <input
            className="form-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <input
            className="form-input"
            placeholder="Contact Information"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-dark" onClick={handleSubmit}>Add Contact</button>
        </div>
      </div>
    </div>
  );
}
