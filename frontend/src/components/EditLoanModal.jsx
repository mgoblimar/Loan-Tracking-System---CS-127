import React, { useState } from 'react';

const FREQUENCIES = ['Weekly', 'Monthly'];

export default function EditLoanModal({ loan, onClose, onEdit, contacts, groups }) {
  const hasPayments = loan.paidAmount > 0;
  const hasTermsPaid = (loan.termsPaid || 0) > 0;

  const [form, setForm] = useState({
    name:              loan.name || '',
    amount:            loan.amount?.toString() || '',
    startDate:         loan.startDate || '',
    dueDate:           loan.dueDate || '',
    notes:             loan.notes || '',
    frequency:         loan.frequency || 'Weekly',
    totalTerms:        loan.totalTerms?.toString() || '',
    receipt:           loan.receipt || null,
    receiptPreviewUrl: null,
    rawFile:           null,
  });

  const [saving, setSaving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotate, setRotate] = useState(0);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // ── Derived display labels ──────────────────────────────────────────────────
  const lenderName = (() => {
    if (loan.direction === 'owed') return 'You';
    return contacts.find((c) => String(c.id) === String(loan.lenderId))?.name || '—';
  })();

  const borrowerName = (() => {
    if (loan.type === 'Group') {
      return groups.find((g) => String(g.id) === String(loan.groupId))?.name || '—';
    }
    if (loan.direction === 'owe') return 'You';
    return contacts.find((c) => String(c.id) === String(loan.borrowerId))?.name || '—';
  })();

  // ── Validation ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) { alert('Name is required'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { alert('Amount must be greater than zero'); return; }
    if (!form.startDate) { alert('Start Date is required'); return; }

    if ((loan.type === 'Straight' || loan.type === 'Group') && !form.dueDate) {
      alert('Due Date is required for this loan type'); return;
    }

    if (form.dueDate && form.startDate && new Date(form.dueDate) < new Date(form.startDate)) {
      alert('Due Date cannot be before Start Date'); return;
    }

    if (loan.type === 'Installment') {
      const terms = parseInt(form.totalTerms);
      if (isNaN(terms) || terms <= 0) { alert('Total Terms must be greater than 0'); return; }
      if (hasTermsPaid && terms < (loan.termsPaid || 0)) {
        alert(`Cannot set Total Terms below terms already paid (${loan.termsPaid})`); return;
      }
    }

    if (hasPayments && parseFloat(form.amount) < loan.paidAmount) {
      alert(`Amount cannot be less than what's already been paid (₱${loan.paidAmount.toLocaleString()})`); return;
    }

    setSaving(true);
    try {
      await onEdit({
        name:       form.name,
        amount:     parseFloat(form.amount),
        startDate:  form.startDate,
        dueDate:    form.dueDate || null,
        notes:      form.notes,
        frequency:  form.frequency,
        totalTerms: parseInt(form.totalTerms) || loan.totalTerms,
      }, form.rawFile);
    } finally {
      setSaving(false);
    }
  };

  const handleReceipt = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm((f) => ({
      ...f,
      receipt: file.name,
      receiptPreviewUrl: URL.createObjectURL(file),
      rawFile: file,
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '1080px', 
          width: '95%', 
          maxHeight: '92vh', 
          overflowY: 'auto',
          padding: '24px'
        }}
      >
        {/* Header */}
        <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, background: 'linear-gradient(135deg, #1e293b, #0f172a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Edit Loan Ledger Entry
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Modify loan fields and view the attached receipt.</span>
          </div>
          {loan.referenceId && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#0369a1',
              background: '#e0f2fe',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '4px 10px',
              letterSpacing: '0.05em',
            }}>
              ID: {loan.referenceId}
            </span>
          )}
        </div>

        {/* Locked transaction metadata banner */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          fontSize: '0.84rem',
          color: '#334155',
        }}>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>Transaction Type</span>
            <span className={`pp-type-badge pp-type-${loan.type.toLowerCase()}`} style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block' }}>
              {loan.type === 'Installment' ? `${loan.frequency} Installment` : loan.type}
            </span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Lender (Source)</span>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>👤 {lenderName}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Borrower (Destination)</span>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>👤 {borrowerName}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Repayment Flow</span>
            <strong style={{ fontSize: '0.9rem', color: loan.direction === 'owe' ? '#dc2626' : '#16a34a' }}>
              {loan.direction === 'owe' ? '🔴 You Owe Lender' : '🟢 Borrower Owes You'}
            </strong>
          </div>
        </div>

        {/* Two-Column Responsive Grid Layout */}
        <div className="edit-loan-modal-container">
          
          {/* LEFT COLUMN: Input Fields with detailed context guides */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* 1. Loan Name */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label-sub" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                🏷️ Loan Title / Description Name
              </label>
              <input
                className="form-input"
                placeholder="e.g. Laptop purchase, Tuition help"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                style={{ padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px' }}
              />
            </div>

            {/* 2. Total Principal Amount */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label-sub" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                💰 Total Loan Principal Amount
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600 }}>₱</span>
                <input
                  className="form-input"
                  placeholder="0.00"
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  style={{ padding: '10px 12px 10px 28px', fontSize: '0.95rem', borderRadius: '8px', fontWeight: 600 }}
                />
              </div>
              
              {hasPayments && (
                <div style={{ color: '#d97706', fontWeight: 600, fontSize: '0.75rem', marginTop: '6px', background: '#fffbeb', border: '1px solid #fef3c7', padding: '8px 12px', borderRadius: '6px' }}>
                  ⚠️ Account Constraint: ₱{loan.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} has already been settled. You cannot decrease the principal below this amount.
                </div>
              )}
            </div>

            {/* 3. Date Configurations */}
            <div className="form-row-dates" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', margin: 0 }}>
              
              {/* Start Date */}
              <div className="date-field">
                <label className="form-label-sub" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                  📅 Start Date (Initiation)
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  style={{ padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px' }}
                />
              </div>

              {/* Due Date (Straight / Group Only) */}
              {loan.type !== 'Installment' && (
                <div className="date-field">
                  <label className="form-label-sub" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                    ⌛ Due Date (Deadline)
                  </label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => set('dueDate', e.target.value)}
                    style={{ padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px' }}
                  />
                </div>
              )}
            </div>

            {/* 4. Installment Configuration (Only when type is Installment) */}
            {loan.type === 'Installment' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px solid #bbf7d0', margin: 0 }}>
                
                {/* Cycle frequency */}
                <div className="select-wrapper">
                  <label className="form-label-sub" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#166534' }}>
                    🔄 Billing Cycle Frequency
                  </label>
                  <select
                    className="form-select"
                    value={form.frequency}
                    onChange={(e) => set('frequency', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px', background: '#fff' }}
                  >
                    {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>

                {/* Total Terms */}
                <div>
                  <label className="form-label-sub" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#166534' }}>
                    🔢 Total Number of Terms
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min={loan.termsPaid || 1}
                    placeholder="e.g. 10"
                    value={form.totalTerms}
                    onChange={(e) => set('totalTerms', e.target.value)}
                    style={{ padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px' }}
                  />
                  
                  {/* Validation rules and Dynamic mathematical projection */}
                  <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '4px', lineHeight: '1.3' }}>
                    {hasTermsPaid ? (
                      <span style={{ color: '#b45309', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                        ⚠️ Minimum: {loan.termsPaid} terms (already settled).
                      </span>
                    ) : (
                      <span style={{ display: 'block', color: '#16a34a', marginBottom: '2px' }}>✓ Settling schedule adjustable.</span>
                    )}

                    {form.amount && form.totalTerms && parseInt(form.totalTerms) > 0 && (
                      <span style={{ display: 'block', color: '#15803d', fontWeight: 700, marginTop: '2px', background: '#dcfce7', padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                        💸 Projected: ₱{((parseFloat(form.amount) || 0) / (parseInt(form.totalTerms) || 1)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {form.frequency === 'Weekly' ? 'Week' : 'Month'}.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. Internal Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label-sub" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                📝 Internal Notes & Context
              </label>
              <textarea
                className="form-input notes-textarea"
                placeholder="Optional payment terms, contact details, bank/GCash references..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                style={{ padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px', resize: 'vertical' }}
              />

            </div>

          </div>

          {/* RIGHT COLUMN: Large, uncropped receipt preview and field validation guides */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Receipt Attachment Showcase Panel */}
            <div className="receipt-upload-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span className="form-label-sub" style={{ fontWeight: 800, margin: 0, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🖼️ Receipt Attachment Slip
                </span>
                <label className="btn btn-light btn-sm file-input-label" style={{ margin: 0, cursor: 'pointer', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 600 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceipt} />
                  📸 {form.receipt ? 'Replace File' : 'Attach Receipt'}
                </label>
              </div>

              {/* Responsive showcase preview */}
              {form.receiptPreviewUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#0284c7', fontWeight: 700 }}>📎 Newly Uploaded Slip Preview:</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.receipt}</span>
                  </div>
                  
                  {/* Canvas frame */}
                  <div 
                    onClick={() => setLightboxOpen(true)}
                    style={{
                      background: '#0f172a',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1.5px dashed #0284c7',
                      height: '350px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 20px rgba(2,132,199,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <img 
                      src={form.receiptPreviewUrl} 
                      alt="New Receipt Preview" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain',
                        borderRadius: '6px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
                      }} 
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(2,132,199,0.35)',
                      backdropFilter: 'blur(3px)',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      gap: '6px'
                    }}
                    className="hover-overlay"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                    >
                      <span style={{ fontSize: '1.8rem' }}>🔍</span>
                      <span>Click to Inspect Fullscreen</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={() => setLightboxOpen(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px', border: '1px solid #0284c7', color: '#0284c7', background: '#f0f9ff', fontWeight: 600 }}
                  >
                    🔎 Open in High-Res Inspector
                  </button>
                </div>
              ) : form.receipt ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 700 }}>📎 Current Receipt Image on File:</span>
                  </div>
                  
                  {/* Canvas frame */}
                  <div 
                    onClick={() => {
                      if (form.receipt.startsWith('blob:') || form.receipt.startsWith('data:') || form.receipt.startsWith('http') || form.receipt.startsWith('/')) {
                        setLightboxOpen(true);
                      }
                    }}
                    style={{
                      background: '#0f172a',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid #cbd5e1',
                      height: '350px',
                      position: 'relative',
                      cursor: form.receipt.startsWith('blob:') || form.receipt.startsWith('data:') || form.receipt.startsWith('http') || form.receipt.startsWith('/') ? 'pointer' : 'default',
                      transition: 'all 0.2s ease-in-out',
                    }}
                    onMouseEnter={(e) => {
                      if (form.receipt.startsWith('blob:') || form.receipt.startsWith('data:') || form.receipt.startsWith('http') || form.receipt.startsWith('/')) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {form.receipt.startsWith('blob:') || form.receipt.startsWith('data:') || form.receipt.startsWith('http') || form.receipt.startsWith('/') ? (
                      <>
                        <img 
                          src={form.receipt} 
                          alt="Current Receipt" 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain',
                            borderRadius: '6px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
                          }} 
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.4)',
                          backdropFilter: 'blur(3px)',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          gap: '6px'
                        }}
                        className="hover-overlay"
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                        >
                          <span style={{ fontSize: '1.8rem' }}>🔍</span>
                          <span>Click to Inspect Fullscreen</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '30px',
                        color: '#94a3b8',
                        gap: '12px',
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: '4rem' }}>📄</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>{form.receipt}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: '260px' }}>
                          Simulated reference code. Attach a new PNG/JPG file using the button above to upload a real image.
                        </span>
                      </div>
                    )}
                  </div>
                  {(form.receipt.startsWith('blob:') || form.receipt.startsWith('data:') || form.receipt.startsWith('http') || form.receipt.startsWith('/')) && (
                    <button 
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setLightboxOpen(true)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px', border: '1px solid #64748b', color: '#334155', background: '#f8fafc', fontWeight: 600 }}
                    >
                      🔎 Open in High-Res Inspector
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  color: '#94a3b8',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  height: '350px',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '3rem' }}>📸</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>No Receipt Document Attached</span>
                  <span style={{ fontSize: '0.72rem', maxWidth: '240px', lineHeight: '1.4' }}>
                    Click the "Attach Receipt" button at the top-right to upload a GCash/Maya slip, bank transfer screenshot, or signed agreement.
                  </span>
                </div>
              )}
            </div>



          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px' }}>
          <button className="btn btn-light" onClick={onClose} style={{ padding: '8px 18px', fontSize: '0.9rem', borderRadius: '8px' }}>
            Cancel
          </button>
          <button 
            className="btn btn-dark" 
            onClick={handleSubmit} 
            disabled={saving}
            style={{ 
              padding: '8px 24px', 
              fontSize: '0.9rem', 
              borderRadius: '8px', 
              background: '#0f172a', 
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 10px rgba(15,23,42,0.2)'
            }}
          >
            {saving ? 'Saving Entries…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX INSPECTOR */}
      {lightboxOpen && (form.receiptPreviewUrl || (form.receipt && (form.receipt.startsWith('blob:') || form.receipt.startsWith('data:') || form.receipt.startsWith('http') || form.receipt.startsWith('/')))) && (
        <div 
          className="lightbox-overlay" 
          onClick={() => { setLightboxOpen(false); setZoomLevel(1); setRotate(0); }}
          style={{ zIndex: 3000, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)' }}
        >
          <div 
            className="lightbox-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '92vw', 
              maxHeight: '92vh', 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.8)',
              color: '#f8fafc'
            }}
          >
            {/* Lightbox Header / Control Center */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.3rem' }}>🔍</span> Receipt Image Inspector
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {form.receiptPreviewUrl ? `Viewing newly uploaded file: ${form.receipt}` : `Viewing database record file`}
                </p>
              </div>

              {/* Inspector Navigation / Manipulation controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  ➖ Zoom Out
                </button>
                
                <span style={{ fontSize: '0.8rem', minWidth: '55px', textAlign: 'center', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                
                <button 
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setZoomLevel(z => Math.min(4, z + 0.25))}
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  ➕ Zoom In
                </button>
                
                <button 
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setRotate(r => (r + 90) % 360)}
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  🔄 Rotate
                </button>
                
                <button 
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => { setZoomLevel(1); setRotate(0); }}
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  Reset
                </button>
                
                <button 
                  type="button"
                  className="lightbox-close" 
                  onClick={() => { setLightboxOpen(false); setZoomLevel(1); setRotate(0); }}
                  style={{ position: 'static', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', marginLeft: '12px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Inspector Canvas Board */}
            <div style={{
              flex: 1,
              background: '#020617',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.04)',
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              position: 'relative'
            }}>
              <img 
                src={form.receiptPreviewUrl || form.receipt} 
                alt="Receipt Fullscreen High-Res" 
                style={{ 
                  maxWidth: '95%', 
                  maxHeight: '95%', 
                  transform: `scale(${zoomLevel}) rotate(${rotate}deg)`,
                  transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  objectFit: 'contain',
                  boxShadow: '0 15px 50px rgba(0,0,0,0.9)'
                }} 
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.74rem', color: '#64748b' }}>
              <span>💡 Tip: Click outside this panel or press '✕' to return. Use Rotate to review sideways uploads.</span>
              <span>Zoom Factor: {zoomLevel.toFixed(2)}x</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
