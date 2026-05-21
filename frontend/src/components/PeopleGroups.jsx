import React, { useState } from 'react';
import AddPersonModal from './AddPersonModal';
import EditPersonModal from './EditPersonModal';
import AddGroupModal from './AddGroupModal';
import EditGroupModal from './EditGroupModal';
import { personApi, groupApi } from '../api';

export default function PeopleGroups({ contacts, setContacts, groups, setGroups, refreshAllData }) {
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editGroup, setEditGroup] = useState(null);

  const handleAddPerson = async ({ name, phone }) => {
    try {
      await personApi.create({ name, contactInfo: phone });
      setShowAddPerson(false);
      refreshAllData();
    } catch (err) {
      console.error('Error adding person:', err);
      alert('Failed to add contact');
    }
  };

  const handleSavePerson = async (updated) => {
    try {
      await personApi.update(updated.id, { name: updated.name, contactInfo: updated.phone });
      setEditPerson(null);
      refreshAllData();
    } catch (err) {
      console.error('Error updating person:', err);
      alert('Failed to update contact');
    }
  };

  const handleDeletePerson = async (id) => {
    try {
      await personApi.delete(id);
      setEditPerson(null);
      refreshAllData();
    } catch (err) {
      console.error('Error deleting person:', err);
      alert('Failed to delete contact (make sure they have no associated loans first)');
    }
  };

  const handleAddGroup = async ({ name, memberIds }) => {
    try {
      const createdGroup = await groupApi.create({ name });
      await Promise.all(memberIds.map(personId => groupApi.addMember(createdGroup.id, personId)));
      setShowAddGroup(false);
      refreshAllData();
    } catch (err) {
      console.error('Error adding group:', err);
      alert('Failed to add group circle');
    }
  };

  const handleSaveGroup = async (updated) => {
    try {
      await groupApi.update(updated.id, { name: updated.name });
      const currentMembers = await groupApi.getMembers(updated.id);

      const toRemove = currentMembers.filter(
        (m) => !updated.memberIds.includes(m.person.id)
      );
      for (const m of toRemove) {
        await groupApi.removeMember(m.id);
      }

      const currentPersonIds = currentMembers.map((m) => m.person.id);
      const toAdd = updated.memberIds.filter(
        (pid) => !currentPersonIds.includes(pid)
      );
      for (const pid of toAdd) {
        await groupApi.addMember(updated.id, pid);
      }

      setEditGroup(null);
      refreshAllData();
    } catch (err) {
      console.error('Error saving group details:', err);
      alert('Failed to update group circle');
    }
  };

  const handleDeleteGroup = async (id) => {
    try {
      await groupApi.delete(id);
      setEditGroup(null);
      refreshAllData();
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Failed to delete group circle (ensure it has no active loans associated first)');
    }
  };

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Get pastel background color based on name string hash
  const getAvatarBgColor = (name) => {
    if (!name) return '#f1f5f9';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
      'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
      'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
      'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)'
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="people-groups-page-container">
      {/* Intro Header */}
      <div className="section-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.35rem' }}>
          Contacts & Groups Directory
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5', maxWidth: '800px' }}>
          Create and manage your lenders, borrowers, and shared group lists here. Groups are perfect for 
          distributing multi-party straight loans or shared group expenses in a few clicks.
        </p>
      </div>

      <div className="people-groups-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* People Panel */}
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '520px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <h3 className="section-title" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>People Directory</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>Lenders and borrowers list</p>
            </div>
            <button className="btn btn-dark btn-sm" onClick={() => setShowAddPerson(true)}>
              + Add Contact
            </button>
          </div>

          <div className="people-list-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
            {contacts.map((contact) => (
              <div 
                key={contact.id} 
                className="contact-card-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 0.85rem',
                  border: '1px solid #edf2f7',
                  borderRadius: '12px',
                  marginBottom: '0.6rem',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Visual Avatar */}
                <div 
                  className="contact-avatar-badge"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: getAvatarBgColor(contact.name),
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    marginRight: '0.85rem',
                    border: '1.5px solid #fff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                  }}
                >
                  {getInitials(contact.name)}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="contact-name" style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
                    {contact.name}
                  </div>
                  <div className="contact-phone" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                    {contact.phone || 'No phone number'}
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  className="btn btn-light btn-sm"
                  onClick={() => setEditPerson(contact)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Edit
                </button>
              </div>
            ))}

            {contacts.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px', color: '#94a3b8' }}>
                <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👤</span>
                <p style={{ fontSize: '0.85rem' }}>No contacts found.</p>
                <p style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Create a contact to start recording transactions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Groups Panel */}
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '520px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <h3 className="section-title" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>Group Circles</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>Multi-party division circles</p>
            </div>
            <button className="btn btn-dark btn-sm" onClick={() => setShowAddGroup(true)}>
              + Add Group
            </button>
          </div>

          <div className="groups-list-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
            {groups.map((group) => {
              // Get details of some members in this group
              const activeMembers = group.memberIds
                .map((mid) => contacts.find((c) => c.id === mid))
                .filter(Boolean);

              return (
                <div 
                  key={group.id} 
                  className="group-card-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    border: '1px solid #edf2f7',
                    borderRadius: '12px',
                    marginBottom: '0.6rem',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Visual Avatar */}
                  <div 
                    className="group-avatar-badge"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      marginRight: '0.85rem',
                      border: '1.5px solid #fff',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}
                  >
                    👥
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="contact-name" style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
                      {group.name}
                    </div>
                    
                    {/* Tiny overlap avatars for members preview */}
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginRight: '4px' }}>
                        {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''}:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {activeMembers.slice(0, 3).map((m, i) => (
                          <div 
                            key={m.id} 
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: getAvatarBgColor(m.name),
                              border: '1px solid #fff',
                              marginLeft: i > 0 ? '-6px' : '0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.5rem',
                              fontWeight: '800',
                              color: '#1e293b'
                            }}
                            title={m.name}
                          >
                            {getInitials(m.name)[0]}
                          </div>
                        ))}
                        {activeMembers.length > 3 && (
                          <div 
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: '#475569',
                              color: '#fff',
                              border: '1px solid #fff',
                              marginLeft: '-6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.5rem',
                              fontWeight: '800'
                            }}
                            title={`${activeMembers.length - 3} more members`}
                          >
                            +{activeMembers.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    className="btn btn-light btn-sm"
                    onClick={() => setEditGroup(group)}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Edit
                  </button>
                </div>
              );
            })}

            {groups.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px', color: '#94a3b8' }}>
                <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📂</span>
                <p style={{ fontSize: '0.85rem' }}>No groups found.</p>
                <p style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Create a group to distribute obligations evenly.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddPerson && (
        <AddPersonModal onClose={() => setShowAddPerson(false)} onAdd={handleAddPerson} />
      )}
      {editPerson && (
        <EditPersonModal
          person={editPerson}
          onClose={() => setEditPerson(null)}
          onSave={handleSavePerson}
          onDelete={handleDeletePerson}
        />
      )}
      {showAddGroup && (
        <AddGroupModal
          contacts={contacts}
          onClose={() => setShowAddGroup(false)}
          onAdd={handleAddGroup}
        />
      )}
      {editGroup && (
        <EditGroupModal
          group={editGroup}
          contacts={contacts}
          onClose={() => setEditGroup(null)}
          onSave={handleSaveGroup}
          onDelete={handleDeleteGroup}
        />
      )}
    </div>
  );
}

