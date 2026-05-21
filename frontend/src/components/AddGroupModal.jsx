import React, { useState } from 'react';
import SelectPeopleModal from './SelectPeopleModal';

export default function AddGroupModal({ contacts, onClose, onAdd }) {
  const [groupName, setGroupName] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [showSelectPeople, setShowSelectPeople] = useState(false);

  const handleAddPeople = (selectedIds) => {
    setMemberIds((prev) => {
      const combined = [...new Set([...prev, ...selectedIds])];
      return combined;
    });
    setShowSelectPeople(false);
  };

  const handleRemove = (id) => {
    setMemberIds((prev) => prev.filter((mid) => mid !== id));
  };

  const handleSubmit = () => {
    if (!groupName.trim()) return;
    onAdd({ name: groupName.trim(), memberIds });
  };

  const getContact = (id) => contacts.find((c) => c.id === id);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">New Group</div>

          <div className="form-group">
            <input
              className="form-input"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Current members */}
          {memberIds.map((id) => {
            const contact = getContact(id);
            if (!contact) return null;
            return (
              <div key={id} className="contact-row">
                <span>
                  <span className="contact-name">{contact.name}</span>{' '}
                  <span className="contact-phone">({contact.phone})</span>
                </span>
                <button className="btn btn-light btn-sm" onClick={() => handleRemove(id)}>
                  Remove
                </button>
              </div>
            );
          })}

          <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
            <button
              className="btn btn-dark btn-sm"
              onClick={() => setShowSelectPeople(true)}
            >
              Add People +
            </button>
          </div>

          <div className="modal-footer">
            <button className="btn btn-light" onClick={onClose}>Cancel</button>
            <button className="btn btn-dark" onClick={handleSubmit}>Add Group</button>
          </div>
        </div>
      </div>

      {showSelectPeople && (
        <SelectPeopleModal
          contacts={contacts}
          alreadySelected={memberIds}
          onClose={() => setShowSelectPeople(false)}
          onAdd={handleAddPeople}
        />
      )}
    </>
  );
}
