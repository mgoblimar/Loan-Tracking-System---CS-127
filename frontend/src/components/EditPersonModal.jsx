import React, { useState } from 'react';

export default function EditPersonModal({ person, onClose, onSave, onDelete }) {
  const [phone, setPhone] = useState(person.phone);

  const handleSave = () => {
    onSave({ ...person, phone: phone.trim() });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete ${person.name}?`)) {
      onDelete(person.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Person</div>

        <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem' }}>
          {person.name}
        </div>

        <div className="form-group">
          <input
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Contact Information"
          />
        </div>

        <div className="modal-footer-split">
          <button className="btn btn-red" onClick={handleDelete}>Delete</button>
          <button className="btn btn-dark" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
