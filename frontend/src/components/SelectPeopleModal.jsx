import React, { useState } from 'react';

export default function SelectPeopleModal({ contacts, alreadySelected, onClose, onAdd }) {
  const [selected, setSelected] = useState([...alreadySelected]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    onAdd(selected);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Add People</div>

        {contacts.map((contact) => (
          <div key={contact.id} className="select-person-row">
            <span>
              <span className="contact-name">{contact.name}</span>{' '}
              <span className="contact-phone">({contact.phone})</span>
            </span>
            <div
              className={`person-checkbox ${selected.includes(contact.id) ? 'checked' : ''}`}
              onClick={() => toggle(contact.id)}
            >
              {selected.includes(contact.id) && '✓'}
            </div>
          </div>
        ))}

        {contacts.length === 0 && (
          <div style={{ color: '#aaa', textAlign: 'center', padding: '1rem' }}>
            No contacts available. Add people first.
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={handleAdd}>Add People</button>
        </div>
      </div>
    </div>
  );
}
