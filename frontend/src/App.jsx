import React, { useState } from 'react';
import './index.css';

function App() {
  const [loans] = useState([
    { id: 1, name: 'Alice Smith', amount: '$5,000', status: 'Active', date: '2026-05-20' },
    { id: 2, name: 'Bob Jones', amount: '$2,300', status: 'Paid', date: '2026-05-18' },
    { id: 3, name: 'Charlie Davis', amount: '$10,000', status: 'Active', date: '2026-05-15' },
    { id: 4, name: 'Diana Prince', amount: '$1,500', status: 'Pending', date: '2026-05-21' },
  ]);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <h2>Loan Tracker Pro</h2>
        <ul className="nav-menu">
          <li className="nav-item active">Dashboard</li>
          <li className="nav-item">Manage Loans</li>
          <li className="nav-item">Payments</li>
          <li className="nav-item">Borrowers</li>
          <li className="nav-item">Reports</li>
        </ul>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="dashboard-container">
          <header className="header">
            <h1>Dashboard Overview</h1>
            <button className="btn-primary">+ New Loan Application</button>
          </header>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-title">Total Active Loans</div>
              <div className="stat-value">$17,300</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Payments Today</div>
              <div className="stat-value">$1,250</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Pending Approvals</div>
              <div className="stat-value">4</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">System Health</div>
              <div className="stat-value" style={{ color: '#34d399' }}>100%</div>
            </div>
          </section>

          <section className="recent-activity">
            <h2>Recent Loan Activity</h2>
            <ul className="activity-list">
              {loans.map((loan) => (
                <li key={loan.id} className="activity-item">
                  <div className="activity-info">
                    <h4>{loan.name}</h4>
                    <p>Status: {loan.status} • Application Date: {loan.date}</p>
                  </div>
                  <div className="activity-amount">{loan.amount}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
