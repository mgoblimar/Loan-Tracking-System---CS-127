import React, { useState } from 'react';
import './index.css';
import Overview from './components/Overview';
import Payments from './components/Payments';
import PeopleGroups from './components/PeopleGroups';

const INITIAL_CONTACTS = [
  { id: 1, name: 'Mark Lexter De Lara', phone: '09912345678' },
  { id: 2, name: 'Kilo Man', phone: '09912345678' },
  { id: 3, name: 'Denise Julia', phone: '09987654321' },
];

const INITIAL_GROUPS = [
  { id: 1, name: 'The Gang', memberIds: [1, 2, 3] },
  { id: 2, name: 'O-Block', memberIds: [1, 2] },
];

const INITIAL_LOANS = [
  {
    id: 1,
    name: 'Food',
    type: 'Installment',
    lenderId: null,
    borrowerId: 1,
    direction: 'owe', // 'owe' = you owe them, 'owed' = they owe you
    amount: 50000,
    paidAmount: 20000,
    startDate: '2026-08-04',
    dueDate: null,
    frequency: 'Monthly',
    totalTerms: 10,
    termsPaid: 6,
    notes: 'Nasarapan masiyado sa jollibee ymbugrer!',
    payments: [
      { date: 'January 5', amount: 100, type: 'cash' },
      { date: 'January 10', amount: 50, type: 'cash' },
      { date: 'January 15', amount: 250, type: 'gcash' },
      { date: 'January 20', amount: 100, type: 'bank transfer' },
    ],
    receipt: null,
  },
  {
    id: 2,
    name: 'Dinner',
    type: 'Straight',
    lenderId: null,
    borrowerId: 3,
    direction: 'owed',
    amount: 50000,
    paidAmount: 50000,
    startDate: '2026-08-04',
    dueDate: '2026-12-31',
    notes: '',
    payments: [],
    receipt: null,
  },
  {
    id: 3,
    name: 'KangKong Chips',
    type: 'Straight',
    lenderId: null,
    borrowerId: 1,
    direction: 'owe',
    amount: 50000,
    paidAmount: 35000,
    startDate: '2026-09-04',
    dueDate: '2027-01-01',
    notes: '',
    payments: [],
    receipt: null,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [loans, setLoans] = useState(INITIAL_LOANS);

  const navItems = [
    { label: 'Overview', icon: '📊' },
    { label: 'Payments', icon: '💰' },
    { label: 'People & Groups', icon: '👥' },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">TrackIt</div>
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`nav-item ${activeTab === item.label ? 'active' : ''}`}
            onClick={() => setActiveTab(item.label)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </aside>

      <main className="main-content">
        {activeTab === 'Overview' && (
          <Overview
            loans={loans}
            setLoans={setLoans}
            contacts={contacts}
            groups={groups}
          />
        )}
        {activeTab === 'Payments' && (
          <Payments loans={loans} setLoans={setLoans} contacts={contacts} />
        )}
        {activeTab === 'People & Groups' && (
          <PeopleGroups
            contacts={contacts}
            setContacts={setContacts}
            groups={groups}
            setGroups={setGroups}
          />
        )}
      </main>
    </div>
  );
}
