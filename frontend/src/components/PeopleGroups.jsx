import React, { useState } from 'react';
import AddPersonModal from './AddPersonModal';
import EditPersonModal from './EditPersonModal';
import AddGroupModal from './AddGroupModal';
import EditGroupModal from './EditGroupModal';

export default function PeopleGroups({ contacts, setContacts, groups, setGroups }) {
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editGroup, setEditGroup] = useState(null);

  const handleAddPerson = ({ name, phone }) => {
    setContacts((prev) => [...prev, { id: Date.now(), name, phone }]);
    setShowAddPerson(false);
  };

  const handleSavePerson = (updated) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditPerson(null);
  };

  const handleDeletePerson = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setGroups((prev) =>
      prev.map((g) => ({ ...g, memberIds: g.memberIds.filter((mid) => mid !== id) }))
    );
    setEditPerson(null);
  };

  const handleAddGroup = ({ name, memberIds }) => {
    setGroups((prev) => [...prev, { id: Date.now(), name, memberIds }]);
    setShowAddGroup(false);
  };

  const handleSaveGroup = (updated) => {
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setEditGroup(null);
  };

  const handleDeleteGroup = (id) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setEditGroup(null);
  };

  return (
    <div>
      {/* People Section */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">People</h2>
          <button className="btn btn-light btn-sm" onClick={() => setShowAddPerson(true)}>
            Add People
          </button>
        </div>

        {contacts.map((contact) => (
          <div key={contact.id} className="contact-row">
            <span>
              <span className="contact-name">{contact.name}</span>{' '}
              <span className="contact-phone">({contact.phone})</span>
            </span>
            <button
              className="btn btn-dark btn-sm"
              onClick={() => setEditPerson(contact)}
            >
              Edit
            </button>
          </div>
        ))}

        {contacts.length === 0 && (
          <div style={{ color: '#aaa', textAlign: 'center', padding: '1rem' }}>
            No contacts yet.
          </div>
        )}
      </div>

      {/* Groups Section */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Groups</h2>
          <button className="btn btn-light btn-sm" onClick={() => setShowAddGroup(true)}>
            Add Group
          </button>
        </div>

        {groups.map((group) => (
          <div key={group.id} className="group-row">
            <span>
              <span className="contact-name">{group.name}</span>{' '}
              <span className="contact-phone">({group.memberIds.length} Members)</span>
            </span>
            <button
              className="btn btn-dark btn-sm"
              onClick={() => setEditGroup(group)}
            >
              Edit
            </button>
          </div>
        ))}

        {groups.length === 0 && (
          <div style={{ color: '#aaa', textAlign: 'center', padding: '1rem' }}>
            No groups yet.
          </div>
        )}
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
