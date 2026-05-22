import React from 'react';

export default function Options({ handleClearAllData }) {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Options & Settings</h1>
      </div>

      <div className="section-card">
        <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚙️ General Settings
        </h2>
        <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '0.5rem' }}>
          Welcome to the application settings. Here you can configure system preferences and manage global demo data.
        </p>
      </div>

      <div className="section-card" style={{ borderColor: '#fee2e2' }}>
        <h2 className="section-title" style={{ fontSize: '1.25rem', color: '#dc2626', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠️ Danger Zone
        </h2>
        <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
          Actions in this section are destructive and cannot be undone. Use them with caution.
        </p>

        <div style={{
          background: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <h4 style={{ color: '#991b1b', margin: 0, fontWeight: '700', fontSize: '0.95rem' }}>Reset Application Database</h4>
          <p style={{ color: '#7f1d1d', margin: 0, fontSize: '0.875rem', lineHeight: '1.4' }}>
            This will permanently delete all Straight, Installment, and Group loans, all payment records, allocation splits, and all contacts/groups. You will need to recreate entities or start completely fresh.
          </p>
        </div>

        <button 
          className="btn btn-red" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            borderRadius: '10px', 
            padding: '0.65rem 1.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            transition: 'background-color 0.15s ease'
          }}
          onClick={handleClearAllData}
        >
          🗑️ Clear All Data
        </button>
      </div>
    </div>
  );
}
