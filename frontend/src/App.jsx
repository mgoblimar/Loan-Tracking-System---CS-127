import React, { useState, useEffect } from 'react';
import './index.css';
import Overview from './components/Overview';
import Payments from './components/Payments';
import PeopleGroups from './components/PeopleGroups';
import { personApi, groupApi, entryApi, paymentApi, installmentApi, allocationApi } from './api';

const serializeNotes = (notes, dueDate) => {
  if (!dueDate) return notes || '';
  return `[Due: ${dueDate}] ${notes || ''}`;
};

const deserializeNotes = (serializedNotes) => {
  if (!serializedNotes) return { notes: '', dueDate: null };
  const match = serializedNotes.match(/^\[Due: ([\d-]+)\]\s*(.*)/s);
  if (match) {
    return { dueDate: match[1], notes: match[2] };
  }
  return { notes: serializedNotes, dueDate: null };
};

const seedDB = async () => {
  console.log('Seeding database with default contacts...');
  const p1 = await personApi.create({ name: 'Mark Lexter De Lara', contactInfo: '09912345678' });
  const p2 = await personApi.create({ name: 'Kilo Man', contactInfo: '09912345678' });
  const p3 = await personApi.create({ name: 'Denise Julia', contactInfo: '09987654321' });

  console.log('Seeding database with default groups...');
  const g1 = await groupApi.create({ name: 'The Gang' });
  const g2 = await groupApi.create({ name: 'O-Block' });

  await groupApi.addMember(g1.id, p1.id);
  await groupApi.addMember(g1.id, p2.id);
  await groupApi.addMember(g1.id, p3.id);

  await groupApi.addMember(g2.id, p1.id);
  await groupApi.addMember(g2.id, p2.id);

  return {
    persons: [p1, p2, p3],
    groups: [
      { ...g1, members: [{ person: p1 }, { person: p2 }, { person: p3 }] },
      { ...g2, members: [{ person: p1 }, { person: p2 }] }
    ]
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loans, setLoans] = useState([]);
  const [activePersonId, setActivePersonId] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateLoans = async (entries, activeId, contactsList) => {
    return await Promise.all(
      entries.map(async (entry) => {
        // Fetch payments for this entry
        const paymentsData = await paymentApi.getByEntry(entry.id).catch(() => []);
        const formattedPayments = paymentsData.map((p) => ({
          id: p.id,
          date: new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          amount: parseFloat(p.paymentAmount),
          type: p.proof ? 'credit card' : 'cash',
          receipt: p.proof || null,
        }));

        // Fetch installment details if applicable
        let frequency = 'Weekly';
        let totalTerms = 1;
        let termsPaid = formattedPayments.length;
        let installmentNotes = '';
        let termAmount = 0;
        let nextTermAmount = 0;
        if (entry.transactionType === 'INSTALLMENT_EXPENSE') {
          const inst = await installmentApi.getDetail(entry.id).catch(() => null);
          if (inst) {
            frequency = inst.paymentFrequency === 'MONTHLY' ? 'Monthly' : 'Weekly';
            totalTerms = inst.paymentTerms || 1;
            installmentNotes = inst.notes || '';
            termAmount = parseFloat(inst.paymentAmountPerTerm);
            
            const totalPaid = formattedPayments.reduce((sum, p) => sum + p.amount, 0);
            const k = Math.floor(totalPaid / termAmount);
            termsPaid = k;
            
            if (k < totalTerms) {
              const allocatedToNext = totalPaid - (k * termAmount);
              nextTermAmount = termAmount - allocatedToNext;
            } else {
              nextTermAmount = 0;
            }
          }
        }

        // Fetch allocations if group expense
        let splits = {};
        let splitMethod = 'Divide Percent';
        if (entry.transactionType === 'GROUP_EXPENSE') {
          const allocs = await allocationApi.getAll(entry.id).catch(() => []);
          if (allocs.length > 0) {
            const isPercent = allocs[0].description.includes('%');
            splitMethod = isPercent ? 'Divide Percent' : 'Divide Value';
            allocs.forEach((a) => {
              splits[a.payee.id] = isPercent
                ? a.description.match(/([\d.]+)%/) ? a.description.match(/([\d.]+)%/)[1] : ((a.amount / parseFloat(entry.amountBorrowed)) * 100).toFixed(0)
                : a.amount.toString();
            });
          }
        }

        const { notes, dueDate } = deserializeNotes(entry.notes);

        // Determine direction and borrower/lender relative to activePersonId
        const isLender = entry.lender?.id === activeId;
        const direction = isLender ? 'owed' : 'owe';
        const lenderId = isLender ? null : entry.lender?.id;
        const borrowerId = entry.borrowerPerson ? (isLender ? entry.borrowerPerson.id : null) : null;
        const groupId = entry.borrowerGroup?.id || null;

        return {
          id: entry.id,
          referenceId: entry.referenceId,
          name: entry.name,
          type: entry.transactionType === 'STRAIGHT_EXPENSE' ? 'Straight' : entry.transactionType === 'INSTALLMENT_EXPENSE' ? 'Installment' : 'Group',
          amount: parseFloat(entry.amountBorrowed),
          paidAmount: parseFloat(entry.amountBorrowed) - parseFloat(entry.amountRemaining),
          startDate: entry.dateBorrowed,
          dueDate: dueDate,
          notes: notes || installmentNotes || entry.description || '',
          payments: formattedPayments,
          receipt: entry.receipt || null,
          direction,
          lenderId,
          borrowerId,
          groupId,
          frequency,
          totalTerms,
          termsPaid,
          termAmount,
          nextTermAmount,
          splits,
          splitMethod,
        };
      })
    );
  };

  const refreshAllData = async (currentActiveId = activePersonId) => {
    try {
      let pList = await personApi.getAll();
      let gList = await groupApi.getAll();

      if (pList.length === 0) {
        const seeded = await seedDB();
        pList = seeded.persons;
        gList = seeded.groups;
      }

      const mappedContacts = pList.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.contactInfo || '',
      }));
      setContacts(mappedContacts);

      const mappedGroups = gList.map((g) => ({
        id: g.id,
        name: g.name,
        memberIds: g.members ? g.members.map((m) => m.person.id) : [],
      }));
      setGroups(mappedGroups);

      let activeId = currentActiveId;
      if (!activeId || !mappedContacts.find((c) => c.id === activeId)) {
        activeId = mappedContacts[0]?.id || null;
        setActivePersonId(activeId);
      }

      const entriesPage = await entryApi.getAll(0, 1000);
      const entries = entriesPage.content || [];
      const hydrated = await hydrateLoans(entries, activeId, mappedContacts);
      setLoans(hydrated);
    } catch (err) {
      console.error('Error syncing backend database with frontend', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    if (activePersonId) {
      setLoading(true);
      refreshAllData(activePersonId);
    }
  }, [activePersonId]);

  const navItems = [
    { label: 'Overview', icon: '📊' },
    { label: 'Payments', icon: '💰' },
    { label: 'People & Groups', icon: '👥' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0e1118', color: '#fff', fontFamily: 'system-ui' }}>
        <div className="loading-spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #38bdf8', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Syncing database entries...</p>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  const activePerson = contacts.find((c) => c.id === activePersonId);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">TrackIt</div>
        
        {/* Active Profile Dropdown */}
        <div className="active-profile-box" style={{ padding: '0 1rem 1.5rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', tracking: '0.05em', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Acting As (Self):</label>
          <select 
            value={activePersonId || ''} 
            onChange={(e) => setActivePersonId(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

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
            activePersonId={activePersonId}
            refreshAllData={refreshAllData}
          />
        )}
        {activeTab === 'Payments' && (
          <Payments 
            loans={loans} 
            setLoans={setLoans} 
            contacts={contacts} 
            groups={groups}
            activePersonId={activePersonId}
            refreshAllData={refreshAllData}
          />
        )}
        {activeTab === 'People & Groups' && (
          <PeopleGroups
            contacts={contacts}
            setContacts={setContacts}
            groups={groups}
            setGroups={setGroups}
            refreshAllData={refreshAllData}
          />
        )}
      </main>
    </div>
  );
}
