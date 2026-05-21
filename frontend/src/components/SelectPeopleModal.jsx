import React, { useState } from 'react';

export default function SelectPeopleModal({ contacts, alreadySelected, onClose, onAdd }) {
  const [selected, setSelected] = useState([...alreadySelected]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    onAdd(selected);
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Select Group Members</div>
        <p className="modal-subtitle-desc" style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#666' }}>
          Select which contacts belong in this group from your contact directory.
        </p>

        {/* Search bar */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <input
            className="form-input"
            type="text"
            placeholder="🔍 Search contacts by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '0.9rem', padding: '0.55rem 0.85rem' }}
          />
        </div>

        <div className="checklist-container" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px', margin: '0.5rem 0 1.5rem' }}>
          {filteredContacts.map((contact) => {
            const isChecked = selected.includes(contact.id);
            return (
              <div 
                key={contact.id} 
                className={`select-person-row ${isChecked ? 'active-row' : ''}`}
                onClick={() => toggle(contact.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.65rem 0.5rem',
                  borderBottom: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  marginBottom: '2px'
                }}
              >
                {/* Avatar Initials */}
                <div 
                  className="contact-avatar-initials"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isChecked ? 'linear-gradient(135deg, #475569 0%, #1e293b 100%)' : '#e2e8f0',
                    color: isChecked ? '#fff' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    marginRight: '0.75rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {getInitials(contact.name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="contact-name" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>{contact.name}</div>
                  <div className="contact-phone" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{contact.phone || 'No phone number'}</div>
                </div>

                <div
                  className={`person-checkbox ${isChecked ? 'checked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(contact.id);
                  }}
                >
                  {isChecked && '✓'}
                </div>
              </div>
            );
          })}

          {filteredContacts.length === 0 && (
            <div style={{ color: '#888', textAlign: 'center', padding: '2rem 1rem', fontSize: '0.85rem' }}>
              {contacts.length === 0 ? 'No contacts available. Add contacts first!' : 'No matching contacts found.'}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-dark" 
            onClick={handleAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>Apply Selected ({selected.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

