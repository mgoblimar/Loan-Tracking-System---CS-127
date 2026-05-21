import React, { useState } from 'react';
import SelectPeopleModal from './SelectPeopleModal';

export default function EditGroupModal({ group, contacts, onClose, onSave, onDelete }) {
  const [memberIds, setMemberIds] = useState([...group.memberIds]);
  const [showSelectPeople, setShowSelectPeople] = useState(false);

  const getContact = (id) => contacts.find((c) => c.id === id);

  const handleRemove = (id) => {
    setMemberIds((prev) => prev.filter((mid) => mid !== id));
  };

  const handleAddPeople = (selectedIds) => {
    setMemberIds((prev) => [...new Set([...prev, ...selectedIds])]);
    setShowSelectPeople(false);
  };

  const handleSave = () => {
    onSave({ ...group, memberIds });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete group "${group.name}"?`)) {
      onDelete(group.id);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">Edit Group</div>

          <div style={{ marginBottom: '0.75rem' }}>
            <button
              className="btn btn-dark btn-sm"
              onClick={() => setShowSelectPeople(true)}
            >
              Add People +
            </button>
          </div>

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

          {memberIds.length === 0 && (
            <div style={{ color: '#aaa', padding: '0.75rem 0' }}>No members yet.</div>
          )}

          <div className="modal-footer-split">
            <button className="btn btn-red" onClick={handleDelete}>Delete</button>
            <button className="btn btn-dark" onClick={handleSave}>Save</button>
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
