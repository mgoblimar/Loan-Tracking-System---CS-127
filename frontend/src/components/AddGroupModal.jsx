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
    if (!groupName.trim()) { alert('Group name is required.'); return; }
    if (memberIds.length < 2) { alert('A group must have at least 2 members.'); return; }
    onAdd({ name: groupName.trim(), memberIds });
  };

  const getContact = (id) => contacts.find((c) => c.id === id);

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">New Group</div>
          <p className="modal-subtitle-desc" style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: '#666' }}>
            Groups allow you to easily create shared loan splits among multiple contacts in a single step.
          </p>

          <div className="form-group">
            <label className="form-label-sub">Group Name</label>
            <input
              className="form-input"
              placeholder="e.g. Project Developers, Family"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="splits-section-header" style={{ marginTop: '1.25rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
              Group Members ({memberIds.length})
            </span>
            <button
              className="btn btn-dark btn-sm"
              onClick={() => setShowSelectPeople(true)}
              type="button"
              style={{ padding: '0.3rem 0.85rem', fontSize: '0.75rem' }}
            >
              + Select Members
            </button>
          </div>

          {/* Current members preview card */}
          <div className="group-members-list-preview" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem' }}>
            {memberIds.map((id) => {
              const contact = getContact(id);
              if (!contact) return null;
              return (
                <div 
                  key={id} 
                  className="contact-row" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  <div 
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '0.75rem',
                      marginRight: '0.6rem'
                    }}
                  >
                    {getInitials(contact.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="contact-name" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{contact.name}</span>{' '}
                    <span className="contact-phone" style={{ fontSize: '0.75rem', color: '#64748b' }}>({contact.phone})</span>
                  </div>
                  <button 
                    className="btn btn-red btn-sm" 
                    onClick={() => handleRemove(id)}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            {memberIds.length === 0 && (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.8rem' }}>
                No members added yet. Use the select button to choose members from your directory.
              </div>
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
                <span>A group requires at least <strong>2 members</strong>. Add one more to continue.</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-light" onClick={onClose}>Cancel</button>
            <button className="btn btn-dark" onClick={handleSubmit} disabled={!groupName.trim() || memberIds.length < 2}>
              Add Group
            </button>
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

