import React, { useState } from 'react';

const LOAN_TYPES = ['Straight', 'Installment', 'Group'];
const FREQUENCIES = ['Weekly', 'Bi-Weekly', 'Monthly'];
const SPLIT_METHODS = ['Divide Percent', 'Divide Value'];

export default function AddLoanModal({ onClose, onAdd, contacts, groups }) {
  const [form, setForm] = useState({
    name: '',
    amount: '',
    type: 'Straight',
    lenderId: '',
    borrowerId: '',
    frequency: 'Weekly',
    startDate: '',
    dueDate: '',
    totalTerms: '',
    termsPaid: '',
    groupId: '',
    splitMethod: 'Divide Percent',
    splits: {},
    direction: 'owe',
    notes: '',
    receipt: null,
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // When group changes, build splits object
  const handleGroupChange = (groupId) => {
    set('groupId', groupId);
    const grp = groups.find((g) => g.id === parseInt(groupId));
    if (grp) {
      const splits = {};
      grp.memberIds.forEach((id) => { splits[id] = ''; });
      setForm((f) => ({ ...f, groupId, splits }));
    }
  };

  const handleSplitChange = (memberId, val) => {
    setForm((f) => ({ ...f, splits: { ...f.splits, [memberId]: val } }));
  };

  const getGroupMembers = () => {
    if (!form.groupId) return [];
    const grp = groups.find((g) => g.id === parseInt(form.groupId));
    if (!grp) return [];
    return grp.memberIds.map((id) => contacts.find((c) => c.id === id)).filter(Boolean);
  };

  const handleReceipt = (e) => {
    const file = e.target.files[0];
    if (file) set('receipt', file.name);
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount) return;
    const loan = {
      name: form.name,
      type: form.type,
      amount: parseFloat(form.amount),
      lenderId: form.lenderId ? parseInt(form.lenderId) : null,
      borrowerId: form.borrowerId ? parseInt(form.borrowerId) : null,
      direction: form.direction || 'owe',
      startDate: form.startDate,
      dueDate: form.dueDate || null,
      frequency: form.frequency,
      totalTerms: parseInt(form.totalTerms) || 1,
      termsPaid: parseInt(form.termsPaid) || 0,
      groupId: form.groupId ? parseInt(form.groupId) : null,
      splits: form.splits,
      splitMethod: form.splitMethod,
      notes: form.notes,
      receipt: form.receipt,
    };
    onAdd(loan);
  };

  const groupMembers = getGroupMembers();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">New Loan</div>

        <div className="form-group">
          <input className="form-input" placeholder="Entry Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="form-group">
          <input className="form-input" placeholder="Amount" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
        </div>

        {/* Type + Direction row */}
        <div className="type-row">
          <div className="select-wrapper" style={{ flex: 1 }}>
            <select className="form-select type-select" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="select-wrapper" style={{ flex: 1 }}>
            <select className="form-select" value={form.direction} onChange={(e) => set('direction', e.target.value)}>
              <option value="owe">I owe them</option>
              <option value="owed">They owe me</option>
            </select>
          </div>
        </div>

        {/* Straight fields */}
        {form.type === 'Straight' && (
          <>
            <div className="form-group">
              <div className="select-wrapper">
                <select className="form-select" value={form.lenderId} onChange={(e) => set('lenderId', e.target.value)}>
                  <option value="">Lender</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <div className="select-wrapper">
                <select className="form-select" value={form.borrowerId} onChange={(e) => set('borrowerId', e.target.value)}>
                  <option value="">Borrower</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <input className="form-input" type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              <input className="form-input" type="date" placeholder="Due Date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
          </>
        )}

        {/* Installment fields */}
        {form.type === 'Installment' && (
          <>
            <div className="form-group">
              <div className="select-wrapper">
                <select className="form-select" value={form.lenderId} onChange={(e) => set('lenderId', e.target.value)}>
                  <option value="">Lender</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <div className="select-wrapper">
                <select className="form-select" value={form.borrowerId} onChange={(e) => set('borrowerId', e.target.value)}>
                  <option value="">Borrower</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <div className="select-wrapper">
                <select className="form-select" value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <input className="form-input" type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              <input className="form-input" type="number" placeholder="Terms Paid" value={form.termsPaid} onChange={(e) => set('termsPaid', e.target.value)} />
            </div>
            <div className="form-group">
              <input className="form-input" type="number" placeholder="Total Terms" value={form.totalTerms} onChange={(e) => set('totalTerms', e.target.value)} />
            </div>
          </>
        )}

        {/* Group fields */}
        {form.type === 'Group' && (
          <>
            <div className="type-row">
              <div className="select-wrapper" style={{ flex: 1 }}>
                <select className="form-select" value={form.groupId} onChange={(e) => handleGroupChange(e.target.value)}>
                  <option value="">Group Select</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="select-wrapper" style={{ flex: 1 }}>
                <select className="form-select" value={form.splitMethod} onChange={(e) => set('splitMethod', e.target.value)}>
                  {SPLIT_METHODS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {groupMembers.map((member) => (
              <div className="member-split-row" key={member.id}>
                <input className="form-input" value={member.name} readOnly />
                <input
                  className="form-input"
                  placeholder={form.splitMethod === 'Divide Percent' ? '0%' : '₱0'}
                  value={form.splits[member.id] || ''}
                  onChange={(e) => handleSplitChange(member.id, e.target.value)}
                />
              </div>
            ))}

            <div className="form-row">
              <input className="form-input" type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              <input className="form-input" type="date" placeholder="Due Date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
          </>
        )}

        {/* Receipt */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceipt} />
            <span className="receipt-btn">Add Receipt +</span>
          </label>
          {form.receipt && <div className="receipt-preview">📎 {form.receipt}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={handleSubmit}>Add Loan</button>
        </div>
      </div>
    </div>
  );
}
