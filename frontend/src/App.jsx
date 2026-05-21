import React, { useState } from 'react';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('Homepage');

  // Dummy data based on PDF specifications
  const [entries] = useState([
    { id: 'DJP-DJP-1', name: 'Lunch Expense', type: 'Group Expense', amount: 500, status: 'UNPAID', date: '2026-05-21' },
    { id: 'ALC-DJP-2', name: 'Car Loan', type: 'Installment Expense', amount: 25000, status: 'PARTIALLY PAID', date: '2026-05-15' },
    { id: 'BOB-DJP-3', name: 'Dinner', type: 'Straight Expense', amount: 1500, status: 'PAID', date: '2026-05-10' },
  ]);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <h2>Loan Tracker</h2>
        <ul className="nav-menu">
          <li 
            className={`nav-item ${activeTab === 'Homepage' ? 'active' : ''}`}
            onClick={() => setActiveTab('Homepage')}
          >
            Homepage
          </li>
          <li 
            className={`nav-item ${activeTab === 'Records' ? 'active' : ''}`}
            onClick={() => setActiveTab('Records')}
          >
            All Payments Record
          </li>
          <li 
            className={`nav-item ${activeTab === 'People' ? 'active' : ''}`}
            onClick={() => setActiveTab('People')}
          >
            People & Groups
          </li>
        </ul>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="dashboard-container">
          <header className="header">
            <h1>{activeTab === 'Homepage' ? 'System Overview' : activeTab === 'Records' ? 'Financial Records' : 'Contacts & Groups'}</h1>
            {activeTab === 'Homepage' && <button className="btn-primary">+ Create New Entry</button>}
          </header>

          {activeTab === 'Homepage' && (
            <>
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-title">Total Active Entries</div>
                  <div className="stat-value">12</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Unpaid Amount</div>
                  <div className="stat-value">₱25,500</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Pending Installments</div>
                  <div className="stat-value">4</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Groups Managed</div>
                  <div className="stat-value">3</div>
                </div>
              </section>

              <section className="recent-activity">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                  <h2>Recent Entries</h2>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button className="btn-primary" style={{padding: '0.5rem 1rem', fontSize: '0.875rem'}}>View</button>
                    <button className="btn-primary" style={{padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'transparent', border: '1px solid var(--primary)'}}>Modify</button>
                  </div>
                </div>
                <ul className="activity-list">
                  {entries.map((entry) => (
                    <li key={entry.id} className="activity-item">
                      <div className="activity-info">
                        <h4>{entry.name} ({entry.id})</h4>
                        <p>Type: {entry.type} • Status: {entry.status} • {entry.date}</p>
                      </div>
                      <div className="activity-amount">₱{entry.amount.toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {activeTab === 'Records' && (
            <section className="recent-activity">
              <h2>All Financial Records</h2>
              <p style={{color: 'var(--text-muted)'}}>A comprehensive list of all entries, payments, and installment allocations will be displayed here.</p>
            </section>
          )}

          {activeTab === 'People' && (
            <section className="recent-activity">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h2>People & Groups</h2>
                <button className="btn-primary" style={{padding: '0.5rem 1rem', fontSize: '0.875rem'}}>+ Add Contact/Group</button>
              </div>
              <p style={{color: 'var(--text-muted)'}}>Manage contacts, group members, and organizational structures here.</p>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
