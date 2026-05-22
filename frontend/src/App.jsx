import React, { useState, useEffect } from 'react';
import './index.css';
import Overview from './components/Overview';
import Payments from './components/Payments';
import PeopleGroups from './components/PeopleGroups';
import Options from './components/Options';
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


export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loans, setLoans] = useState([]);
  const [activePersonId, setActivePersonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState(null); // { message: string, type: 'info' | 'error' | 'success' }

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
      }
      setActivePersonId(activeId);

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

  const handleClearAllData = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL entries, payments, groups, and contacts in the database. This action is irreversible. Proceed?')) {
      return;
    }
    setLoading(true);
    try {
      const entriesPage = await entryApi.getAll(0, 1000);
      const entries = entriesPage.content || [];
      for (const entry of entries) {
        await entryApi.delete(entry.id).catch(err => console.error(`Error deleting entry ${entry.id}:`, err));
      }

      const groupsList = await groupApi.getAll();
      for (const group of groupsList) {
        await groupApi.delete(group.id).catch(err => console.error(`Error deleting group ${group.id}:`, err));
      }

      const personsList = await personApi.getAll();
      for (const person of personsList) {
        await personApi.delete(person.id).catch(err => console.error(`Error deleting person ${person.id}:`, err));
      }

      setActivePersonId(null);
      await refreshAllData(null);
      alert('Success: All demo data has been cleared!');
    } catch (err) {
      console.error('Error clearing database data:', err);
      alert('Failed to clear data: ' + err.message);
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

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      let type = 'info';
      const lowercaseMsg = String(message).toLowerCase();
      if (lowercaseMsg.includes('failed') || lowercaseMsg.includes('error') || lowercaseMsg.includes('must') || lowercaseMsg.includes('cannot') || lowercaseMsg.includes('please') || lowercaseMsg.includes('required')) {
        type = 'error';
      } else if (lowercaseMsg.includes('success') || lowercaseMsg.includes('cleared') || lowercaseMsg.includes('saved')) {
        type = 'success';
      }
      setAlertConfig({ message: String(message), type });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const navItems = [
    { label: 'Overview', icon: '📊' },
    { label: 'Payments', icon: '💰' },
    { label: 'People & Groups', icon: '👥' },
    { label: 'Options', icon: '⚙️' },
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
        
        {/* Active Profile Selection Box */}
        <div className="active-profile-box" style={{ 
          padding: '1rem', 
          background: '#f8fafc',
          border: '1px solid #e2e8f0', 
          borderRadius: '12px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <label style={{ 
            fontSize: '0.7rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em', 
            color: '#64748b', 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: 700
          }}>
            👤 Current User (Self)
          </label>
          {contacts.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select 
                value={activePersonId || ''} 
                onChange={(e) => {
                  const val = e.target.value;
                  const parsedVal = /^\d+$/.test(val) ? Number(val) : val;
                  setActivePersonId(parsedVal);
                }}
                style={{ 
                  flex: 1, 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '8px', 
                  background: '#ffffff', 
                  border: '1px solid #cbd5e1', 
                  color: '#0f172a', 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  outline: 'none', 
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'border-color 0.15s ease'
                }}
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem', 
              alignItems: 'center', 
              textAlign: 'center',
              padding: '0.5rem 0'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>No users registered yet</span>
              <button
                onClick={() => setActiveTab('People & Groups')}
                style={{
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)'
                }}
                onMouseOver={(e) => e.target.style.background = '#2563eb'}
                onMouseOut={(e) => e.target.style.background = '#3b82f6'}
              >
                ➕ Create User
              </button>
            </div>
          )}
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
        {contacts.length === 0 && (activeTab === 'Overview' || activeTab === 'Payments') ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <div style={{
              fontSize: '4.5rem',
              marginBottom: '1.5rem',
              animation: 'bounce 2s infinite'
            }}>
              🚀
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '0.75rem'
            }}>
              Welcome to TrackIt!
            </h1>
            <p style={{
              color: '#475569',
              fontSize: '1.05rem',
              maxWidth: '500px',
              lineHeight: '1.6',
              marginBottom: '2rem'
            }}>
              It looks like there are no users in the database yet. To start tracking loans, straight expenses, installments, or shared group bills, you need to create at least one user to act as yourself and others.
            </p>
            
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.5rem 2rem',
              maxWidth: '480px',
              textAlign: 'left',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '700' }}>
                Follow these simple steps:
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li>
                  Go to the <strong style={{ color: '#0f172a' }}>People & Groups</strong> tab.
                </li>
                <li>
                  Click <strong style={{ color: '#3b82f6' }}>+ Add Person</strong> to register yourself and your contacts.
                </li>
                <li>
                  Select your profile under <strong style={{ color: '#0f172a' }}>Current User (Self)</strong> in the sidebar to start creating and managing entries!
                </li>
              </ul>
            </div>

            <button
              onClick={() => setActiveTab('People & Groups')}
              className="btn"
              style={{
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.8rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#2563eb';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#3b82f6';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              👉 Get Started Now
            </button>
            <style dangerouslySetInnerHTML={{ __html: '@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }' }} />
          </div>
        ) : (
          <>
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
            {activeTab === 'Options' && (
              <Options
                handleClearAllData={handleClearAllData}
              />
            )}
          </>
        )}
      </main>

      {alertConfig && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '400px',
            padding: '2rem 1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Type Icon */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: alertConfig.type === 'success' ? '#ecfdf5' : alertConfig.type === 'error' ? '#fef2f2' : '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: '1.25rem',
              border: alertConfig.type === 'success' ? '1px solid #d1fae5' : alertConfig.type === 'error' ? '1px solid #fee2e2' : '1px solid #dbeafe'
            }}>
              {alertConfig.type === 'success' ? '✅' : alertConfig.type === 'error' ? '⚠️' : 'ℹ️'}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 0.5rem 0'
            }}>
              {alertConfig.type === 'success' ? 'Success!' : alertConfig.type === 'error' ? 'Notice' : 'Information'}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '0.925rem',
              color: '#475569',
              lineHeight: '1.5',
              margin: '0 0 1.5rem 0',
              wordBreak: 'break-word'
            }}>
              {alertConfig.message}
            </p>

            {/* Dismiss Button */}
            <button
              onClick={() => setAlertConfig(null)}
              style={{
                width: '100%',
                padding: '0.65rem 1.5rem',
                background: alertConfig.type === 'success' ? '#10b981' : alertConfig.type === 'error' ? '#ef4444' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                boxShadow: alertConfig.type === 'success' ? '0 4px 10px rgba(16, 185, 129, 0.2)' : alertConfig.type === 'error' ? '0 4px 10px rgba(239, 68, 68, 0.2)' : '0 4px 10px rgba(59, 130, 246, 0.2)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = alertConfig.type === 'success' ? '#059669' : alertConfig.type === 'error' ? '#dc2626' : '#2563eb';
              }}
              onMouseOut={(e) => {
                e.target.style.background = alertConfig.type === 'success' ? '#10b981' : alertConfig.type === 'error' ? '#ef4444' : '#3b82f6';
              }}
            >
              OK
            </button>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleUp {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}} />
        </div>
      )}
    </div>
  );
}
