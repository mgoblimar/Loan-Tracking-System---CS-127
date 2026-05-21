import React, { useState, useEffect, useCallback } from 'react';
import { paymentApi, groupApi, entryApi } from './api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(amount) {
  return '₱' + parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function StatusBadge({ status }) {
  const colors = { UNPAID: '#ef4444', PARTIALLY_PAID: '#f59e0b', PAID: '#22c55e' };
  return (
    <span style={{
      background: colors[status] || '#6b7280',
      color: '#fff',
      borderRadius: '9999px',
      padding: '2px 10px',
      fontSize: '0.75rem',
      fontWeight: 600,
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Add Payment Form ─────────────────────────────────────────────────────────
function AddPaymentForm({ entry, groupMembers, onSave, onClose }) {
  const isGroup = entry.transactionType === 'GROUP_EXPENSE';

  // Default payee: borrowerPerson for non-group, empty for group
  const defaultPayeeId = !isGroup && entry.borrowerPerson ? entry.borrowerPerson.id : '';

  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: '',
    payeeId: defaultPayeeId,
    proof: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.paymentAmount || parseFloat(form.paymentAmount) <= 0) {
      setError('Payment amount must be greater than zero'); return;
    }
    if (!form.payeeId) { setError('Payee is required'); return; }

    const payload = {
      paymentDate: form.paymentDate,
      paymentAmount: parseFloat(form.paymentAmount),
      payee: { id: form.payeeId },
      proof: form.proof || null,
      notes: form.notes || null,
    };

    setLoading(true);
    try {
      await paymentApi.record(entry.id, payload);
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  // Build payee options
  const payeeOptions = isGroup
    ? groupMembers.map(m => ({ id: m.person.id, name: m.person.name }))
    : entry.borrowerPerson
      ? [{ id: entry.borrowerPerson.id, name: entry.borrowerPerson.name }]
      : [];

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <label>Payment Date *</label>
      <input
        className="form-input"
        type="date"
        value={form.paymentDate}
        onChange={e => set('paymentDate', e.target.value)}
      />

      <label>Payment Amount *</label>
      <input
        className="form-input"
        type="number"
        step="0.01"
        min="0.01"
        value={form.paymentAmount}
        onChange={e => set('paymentAmount', e.target.value)}
        placeholder={`Remaining: ${fmt(entry.amountRemaining)}`}
      />

      <label>Payee *</label>
      {payeeOptions.length === 1 && !isGroup ? (
        <input
          className="form-input"
          value={payeeOptions[0]?.name || ''}
          readOnly
          style={{ opacity: 0.7, cursor: 'not-allowed' }}
        />
      ) : (
        <select
          className="form-input"
          value={form.payeeId}
          onChange={e => set('payeeId', e.target.value)}
        >
          <option value="">— Select payee —</option>
          {payeeOptions.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <label>Proof (optional)</label>
      <input
        className="form-input"
        value={form.proof}
        onChange={e => set('proof', e.target.value)}
        placeholder="e.g. GCash screenshot URL or reference #"
      />

      <label>Notes (optional)</label>
      <textarea
        className="form-input"
        value={form.notes}
        onChange={e => set('notes', e.target.value)}
        placeholder="Any additional notes"
        rows={3}
      />

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}

// ─── Entry Detail ─────────────────────────────────────────────────────────────
export default function EntryDetail({ entry: initialEntry, onClose, onEntryUpdated }) {
  const [entry, setEntry] = useState(initialEntry);
  const [payments, setPayments] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await paymentApi.getByEntry(entry.id);
      setPayments(data);
    } finally {
      setLoading(false);
    }
  }, [entry.id]);

  // Fetch group members if GROUP_EXPENSE
  useEffect(() => {
    fetchPayments();
    if (entry.transactionType === 'GROUP_EXPENSE' && entry.borrowerGroup?.id) {
      groupApi.getMembers(entry.borrowerGroup.id).then(setGroupMembers).catch(() => {});
    }
  }, [entry, fetchPayments]);

  const handlePaymentSaved = async () => {
    // Re-fetch entry to get updated amountRemaining & status
    try {
      const updated = await entryApi.getById(entry.id);
      setEntry(updated);
      onEntryUpdated(updated);
    } catch { /* silent */ }
    fetchPayments();
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Delete this payment? The amount will be restored to the entry.')) return;
    try {
      await paymentApi.delete(entry.id, paymentId);
      handlePaymentSaved();
    } catch {
      alert('Failed to delete payment');
    }
  };

  const paidSoFar = parseFloat(entry.amountBorrowed || 0) - parseFloat(entry.amountRemaining || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box entry-detail-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>{entry.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{entry.referenceId}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Entry Info */}
        <div className="entry-info-grid">
          <div className="info-item">
            <span className="info-label">Type</span>
            <span>{entry.transactionType?.replace(/_/g, ' ')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Status</span>
            <StatusBadge status={entry.status} />
          </div>
          <div className="info-item">
            <span className="info-label">Lender</span>
            <span>{entry.lender?.name ?? '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Borrower</span>
            <span>{entry.borrowerPerson?.name ?? entry.borrowerGroup?.name ?? '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Date Borrowed</span>
            <span>{entry.dateBorrowed ?? '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Date Fully Paid</span>
            <span>{entry.dateFullyPaid ?? '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Amount Borrowed</span>
            <span style={{ color: '#34d399', fontWeight: 600 }}>{fmt(entry.amountBorrowed)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Paid So Far</span>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{fmt(paidSoFar)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Remaining</span>
            <span style={{ color: parseFloat(entry.amountRemaining) > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
              {fmt(entry.amountRemaining)}
            </span>
          </div>
          {entry.notes && (
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <span className="info-label">Notes</span>
              <span>{entry.notes}</span>
            </div>
          )}
        </div>

        {/* Payments Section */}
        <div className="payments-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Payments ({payments.length})
            </h4>
            {entry.status !== 'PAID' && (
              <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={() => setShowPaymentForm(true)}>
                + Record Payment
              </button>
            )}
          </div>

          {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading payments…</p>}

          {!loading && payments.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No payments recorded yet.</p>
          )}

          {payments.length > 0 && (
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payee</th>
                  <th>Amount</th>
                  <th>Proof</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.paymentDate}</td>
                    <td>{p.payee?.name ?? '—'}</td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>{fmt(p.paymentAmount)}</td>
                    <td>{p.proof ? <span title={p.proof} style={{ fontSize: '0.8rem' }}>📎 {p.proof.length > 20 ? p.proof.slice(0, 20) + '…' : p.proof}</span> : '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.notes ?? '—'}</td>
                    <td>
                      <button className="btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleDeletePayment(p.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Payment Modal */}
        {showPaymentForm && (
          <div className="modal-overlay" onClick={() => setShowPaymentForm(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Record Payment</h3>
                <button className="modal-close" onClick={() => setShowPaymentForm(false)}>✕</button>
              </div>
              <div className="modal-body">
                <AddPaymentForm
                  entry={entry}
                  groupMembers={groupMembers}
                  onSave={handlePaymentSaved}
                  onClose={() => setShowPaymentForm(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
