import React, { useState } from 'react';
import './index.css';
import './App.css'; // Will be empty

function App() {
  const [loans] = useState([
    { id: 1, name: 'Alice Smith', amount: '$5,000', status: 'Active', date: '2026-05-20' },
    { id: 2, name: 'Bob Jones', amount: '$2,300', status: 'Paid', date: '2026-05-18' },
    { id: 3, name: 'Charlie Davis', amount: '$10,000', status: 'Active', date: '2026-05-15' },
  ]);

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Loan Tracker Pro</h1>
        <button className="btn-primary">+ New Loan</button>
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
        <h2>Recent Activity</h2>
        <ul className="activity-list">
          {loans.map((loan) => (
            <li key={loan.id} className="activity-item">
              <div className="activity-info">
                <h4>{loan.name}</h4>
                <p>Status: {loan.status} • {loan.date}</p>
              </div>
              <div className="activity-amount">{loan.amount}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
