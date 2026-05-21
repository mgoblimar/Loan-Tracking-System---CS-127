import React, { useState } from 'react';

export default function EditPersonModal({ person, onClose, onSave, onDelete }) {
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ ...person, name: name.trim(), phone: phone.trim() });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${person.name}? This will remove them from all groups and related splits.`)) {
      onDelete(person.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Contact Details</div>

        <div className="form-group">
          <label className="form-label-sub">Full Name</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
        </div>

        <div className="form-group">
          <label className="form-label-sub">Contact Information (Phone)</label>
          <input
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Contact Information"
          />
        </div>

        <div className="modal-footer-split">
          <button className="btn btn-red" onClick={handleDelete}>Delete Contact</button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-light" onClick={onClose}>Cancel</button>
            <button className="btn btn-dark" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
