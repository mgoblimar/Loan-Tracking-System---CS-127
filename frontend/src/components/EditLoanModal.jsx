import React, { useState } from 'react';

const FREQUENCIES = ['Weekly', 'Monthly'];

export default function EditLoanModal({ loan, onClose, onEdit, contacts, groups }) {
  const hasPayments = loan.paidAmount > 0;
  const hasTermsPaid = (loan.termsPaid || 0) > 0;

  const [form, setForm] = useState({
    name:        loan.name        || '',
    amount:      loan.amount?.toString() || '',
    startDate:   loan.startDate   || '',
    dueDate:     loan.dueDate     || '',
    notes:       loan.notes       || '',
    frequency:   loan.frequency   || 'Weekly',
    totalTerms:  loan.totalTerms?.toString() || '',
    receipt:     null,
    receiptPreviewUrl: null,
  });

  const [saving, setSaving] = useState(false);

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
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-title" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span>Edit Loan Entry</span>
          {loan.referenceId && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 500,
              color: '#64748b',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '2px 8px',
              alignSelf: 'flex-start',
              letterSpacing: '0.04em',
            }}>
              {loan.referenceId}
            </span>
          )}
        </div>

        {/* Locked info — type, direction, lender, borrower */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 16px',
          fontSize: '0.82rem',
          color: '#475569',
        }}>
          <div><span style={{ color: '#94a3b8' }}>Type: </span><strong>{loan.type}</strong></div>
          <div><span style={{ color: '#94a3b8' }}>Direction: </span><strong>{loan.direction === 'owe' ? 'You owe' : 'Owes you'}</strong></div>
          <div><span style={{ color: '#94a3b8' }}>Lender: </span><strong>{lenderName}</strong></div>
          <div><span style={{ color: '#94a3b8' }}>{loan.type === 'Group' ? 'Group' : 'Borrower'}: </span><strong>{borrowerName}</strong></div>
          {hasPayments && (
            <div style={{ gridColumn: '1 / -1', color: '#f59e0b', fontSize: '0.78rem', marginTop: '2px' }}>
              ⚠ ₱{loan.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} already paid — amount cannot go below this.
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className="form-group">
          <input
            className="form-input"
            placeholder="Entry Name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>

        <div className="form-group">
          <input
            className="form-input"
            placeholder="Amount (₱)"
            type="number"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </div>

        <div className="form-row-dates">
          <div className="date-field">
            <label className="form-label-sub">Start Date</label>
            <input
              className="form-input"
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </div>
          {loan.type !== 'Installment' && (
            <div className="date-field">
              <label className="form-label-sub">Due Date</label>
              <input
                className="form-input"
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Installment-specific editable fields */}
        {loan.type === 'Installment' && (
          <div className="form-row-three">
            <div className="select-wrapper">
              <label className="form-label-sub">Frequency</label>
              <select
                className="form-select"
                value={form.frequency}
                onChange={(e) => set('frequency', e.target.value)}
              >
                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label-sub">Total Terms</label>
              <input
                className="form-input"
                type="number"
                min={loan.termsPaid || 1}
                placeholder="e.g. 10"
                value={form.totalTerms}
                onChange={(e) => set('totalTerms', e.target.value)}
              />
              {hasTermsPaid && (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Min: {loan.termsPaid} (terms already paid)
                </span>
              )}
            </div>
          </div>
        )}

        <div className="form-group notes-group">
          <textarea
            className="form-input notes-textarea"
            placeholder="Notes..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
          />
        </div>

        {/* Receipt */}
        <div className="receipt-upload-box">
          <label className="btn btn-light btn-sm file-input-label">
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceipt} />
            📸 {loan.receipt ? 'Replace Receipt' : 'Add Receipt Image'}
          </label>
          {form.receiptPreviewUrl ? (
            <div className="receipt-preview-thumbnail-container">
              <img src={form.receiptPreviewUrl} alt="Receipt" className="receipt-preview-thumbnail" />
              <div className="receipt-filename-lbl">📎 {form.receipt}</div>
            </div>
          ) : loan.receipt && (
            <div className="receipt-preview">📎 Current receipt on file</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
