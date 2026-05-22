import React, { useState } from 'react';
import SelectPeopleModal from './SelectPeopleModal';

export default function EditGroupModal({ group, contacts, onClose, onSave, onDelete }) {
  const [name, setName] = useState(group.name);
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
    if (!name.trim()) { alert('Group name is required.'); return; }
    if (memberIds.length < 2) { alert('A group must have at least 2 members.'); return; }
    onSave({ ...group, name: name.trim(), memberIds });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete group "${group.name}"?`)) {
      onDelete(group.id);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">Edit Group Details</div>

          <div className="form-group">
            <label className="form-label-sub">Group Name</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group Name"
            />
          </div>

          <div className="splits-section-header" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <span>Group Members ({memberIds.length}):</span>
            <button
              className="btn btn-dark btn-sm"
              onClick={() => setShowSelectPeople(true)}
            >
              + Add Members
            </button>
          </div>

          <div className="group-members-list-preview" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
            {memberIds.map((id) => {
              const contact = getContact(id);
              if (!contact) return null;
              return (
                <div key={id} className="contact-row" style={{ padding: '0.5rem 0' }}>
                  <span>
                    <span className="contact-name">{contact.name}</span>{' '}
                    <span className="contact-phone">({contact.phone})</span>
                  </span>
                  <button 
                    className="btn btn-red btn-sm" 
                    onClick={() => handleRemove(id)}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            {memberIds.length === 0 && (
              <div style={{ color: '#aaa', padding: '0.75rem 0', textAlign: 'center' }}>No members in this group yet.</div>
            )}

            {memberIds.length === 1 && (
              <div style={{
                marginTop: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '0.55rem 0.85rem',
                fontSize: '0.78rem',
                color: '#92400e',
                fontWeight: 600,
              }}>
                <span>⚠️</span>
                <span>A group requires at least <strong>2 members</strong>. Add one more to save.</span>
              </div>
            )}
          </div>

          <div className="modal-footer-split" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-red" onClick={handleDelete}>Delete Group</button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-light" onClick={onClose}>Cancel</button>
              <button className="btn btn-dark" onClick={handleSave} disabled={!name.trim() || memberIds.length < 2}>Save Group</button>
            </div>
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
