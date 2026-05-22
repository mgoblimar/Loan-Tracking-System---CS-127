import React, { useState, useEffect } from 'react';

const LOAN_TYPES = ['Straight', 'Installment', 'Group'];
const FREQUENCIES = ['Weekly', 'Monthly'];
const SPLIT_METHODS = ['Divide Percent', 'Divide Value'];

export default function AddLoanModal({ onClose, onAdd, contacts, groups, activePersonId }) {
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
    termsPaid: '0',
    groupId: '',
    splitMethod: 'Divide Percent',
    splits: {},
    direction: 'owe',
    notes: '',
    receipt: null,
    receiptPreviewUrl: null,
  });

  const [splitTotals, setSplitTotals] = useState({ current: 0, target: 0, isValid: true });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const activePersonName = contacts.find((c) => String(c.id) === String(activePersonId))?.name || 'Self';

  // Automatically sync lenderId and borrowerId based on selected type and direction
  useEffect(() => {
    if (form.type === 'Group') {
      setForm((f) => ({
        ...f,
        lenderId: f.lenderId || activePersonId || '',
        borrowerId: '',
      }));
    } else {
      if (form.direction === 'owe') {
        setForm((f) => ({
          ...f,
          borrowerId: activePersonId || '',
          lenderId: f.lenderId === activePersonId ? '' : f.lenderId,
        }));
      } else {
        setForm((f) => ({
          ...f,
          lenderId: activePersonId || '',
          borrowerId: f.borrowerId === activePersonId ? '' : f.borrowerId,
        }));
      }
    }
  }, [form.type, form.direction, activePersonId]);

  // Check if selected start date is earlier than today (local time)
  const isStartDateInPast = () => {
    if (!form.startDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(form.startDate);
    return start < today;
  };

  // When group changes, build splits object
  const handleGroupChange = (groupId) => {
    set('groupId', groupId);
    const grp = groups.find((g) => String(g.id) === String(groupId));
    if (grp) {
      const splits = {};
      grp.memberIds.forEach((id) => { splits[id] = ''; });
      setForm((f) => ({ ...f, groupId, splits }));
    } else {
      setForm((f) => ({ ...f, groupId, splits: {} }));
    }
  };

  const handleSplitChange = (memberId, val) => {
    setForm((f) => ({ ...f, splits: { ...f.splits, [memberId]: val } }));
  };

  const getGroupMembers = () => {
    if (!form.groupId) return [];
    const grp = groups.find((g) => String(g.id) === String(form.groupId));
    if (!grp) return [];
    return grp.memberIds.map((id) => contacts.find((c) => String(c.id) === String(id))).filter(Boolean);
  };

  const handleReceipt = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setForm((f) => ({
        ...f,
        receipt: file.name,
        receiptPreviewUrl: previewUrl,
        rawFile: file
      }));
    }
  };

  const handleSplitEqually = () => {
    const members = getGroupMembers();
    if (members.length === 0) return;
    const totalAmount = parseFloat(form.amount) || 0;
    const splits = {};

    if (form.splitMethod === 'Divide Percent') {
      const basePct = Math.floor(100 / members.length);
      const remainder = 100 - basePct * members.length;
      members.forEach((m, i) => {
        splits[m.id] = (basePct + (i < remainder ? 1 : 0)).toString();
      });
    } else {
      const baseValRounded = parseFloat((totalAmount / members.length).toFixed(2));
      members.forEach((m, i) => {
        splits[m.id] = baseValRounded.toString();
      });
    }
    setForm((f) => ({ ...f, splits }));
  };

  const groupMembers = getGroupMembers();

  // Calculate split totals whenever amount, splits, splitMethod, or groupMembers change
  useEffect(() => {
    const amountVal = parseFloat(form.amount) || 0;
    let sum = 0;
    Object.values(form.splits).forEach((v) => {
      sum += parseFloat(v) || 0;
    });

    if (form.splitMethod === 'Divide Percent') {
      setSplitTotals({
        current: sum,
        target: 100,
        isValid: sum === 100
      });
    } else {
      setSplitTotals({
        current: sum,
        target: amountVal,
        isValid: Math.abs(sum - amountVal) < 0.05
      });
    }
  }, [form.amount, form.splits, form.splitMethod, form.groupId]);

  const handleSubmit = () => {
    if (!form.name || !form.amount) return;

    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt < 0) {
      alert('Amount borrowed cannot be negative');
      return;
    }

    // Start Date is required for all loans
    if (!form.startDate) {
      alert('Please select a Start Date');
      return;
    }

    // Due Date is required for Straight and Group loans
    if ((form.type === 'Straight' || form.type === 'Group') && !form.dueDate) {
      alert('Please select a Due Date');
      return;
    }

    // Due Date must not be earlier than Start Date
    if (form.dueDate && form.startDate) {
      const start = new Date(form.startDate);
      const due = new Date(form.dueDate);
      start.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      if (due < start) {
        alert('Due Date cannot be before the Start Date');
        return;
      }
    }

    // For Installments, totalTerms must be a valid positive integer > 0
    if (form.type === 'Installment') {
      const terms = parseInt(form.totalTerms);
      if (isNaN(terms) || terms <= 0) {
        alert('Total Terms must be a number greater than 0');
        return;
      }
    }

    // Standard field validations
    if (form.type !== 'Group') {
      if (form.direction === 'owe' && !form.lenderId) {
        alert('Please select a Lender');
        return;
      }
      if (form.direction === 'owed' && !form.borrowerId) {
        alert('Please select a Borrower');
        return;
      }
    } else {
      if (!form.groupId) {
        alert('Please select a Borrower Group');
        return;
      }
      if (!form.lenderId) {
        alert('Please select a Lender');
        return;
      }
    }

    if (form.type === 'Group' && groupMembers.length > 0) {
      const hasNegativeSplit = Object.values(form.splits).some(v => parseFloat(v) < 0);
      if (hasNegativeSplit) {
        alert('Group splits cannot be negative');
        return;
      }
      if (!splitTotals.isValid) {
        alert(
          form.splitMethod === 'Divide Percent'
            ? `Splits must total exactly 100% (currently ${splitTotals.current}%)`
            : `Splits must total exactly the loan amount ₱${splitTotals.target.toLocaleString()} (currently ₱${splitTotals.current.toLocaleString()})`
        );
        return;
      }
    }

    const loan = {
      name: form.name,
      type: form.type,
      amount: parseFloat(form.amount),
      lenderId: form.lenderId || null,
      borrowerId: form.borrowerId || null,
      direction: form.direction || 'owe',
      startDate: form.startDate,
      dueDate: form.dueDate || null,
      frequency: form.frequency,
      totalTerms: parseInt(form.totalTerms) || 1,
      termsPaid: isStartDateInPast() ? parseInt(form.termsPaid) || 0 : 0,
      groupId: form.groupId || null,
      splits: form.splits,
      splitMethod: form.splitMethod,
      notes: form.notes,
      receipt: form.receiptPreviewUrl || form.receipt,
    };
    onAdd(loan, form.rawFile);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">New Loan Application</div>

        <div className="form-group">
          <input className="form-input" placeholder="Entry Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        
        <div className="form-group">
          <input className="form-input" placeholder="Amount (₱)" type="number" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
        </div>

        {/* Type + Direction row */}
        <div className="type-row">
          <div className="select-wrapper" style={{ flex: 1 }}>
            <select className="form-select type-select" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {form.type !== 'Group' && (
            <div className="select-wrapper" style={{ flex: 1 }}>
              <select className="form-select" value={form.direction} onChange={(e) => set('direction', e.target.value)}>
                <option value="owe">I owe them (Lendee)</option>
                <option value="owed">They owe me (Lender)</option>
              </select>
            </div>
          )}
        </div>

        {/* Straight fields */}
        {form.type === 'Straight' && (
          <>
            <div className="form-row">
              {form.direction === 'owe' ? (
                <>
                  <div className="select-wrapper">
                    <label className="form-label-sub">Lender (Owed by You)</label>
                    <select className="form-select" value={form.lenderId} onChange={(e) => set('lenderId', e.target.value)}>
                      <option value="">Select Lender</option>
                      {contacts.filter(c => String(c.id) !== String(activePersonId)).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="select-wrapper">
                    <label className="form-label-sub">Borrower (Lendee)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={`👤 You (${activePersonName})`} 
                      readOnly 
                      disabled 
                      style={{ background: '#f1f5f9', color: '#475569', border: '1.5px dashed #cbd5e1', cursor: 'not-allowed' }} 
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="select-wrapper">
                    <label className="form-label-sub">Lender</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={`👤 You (${activePersonName})`} 
                      readOnly 
                      disabled 
                      style={{ background: '#f1f5f9', color: '#475569', border: '1.5px dashed #cbd5e1', cursor: 'not-allowed' }} 
                    />
                  </div>
                  <div className="select-wrapper">
                    <label className="form-label-sub">Borrower (Lendee)</label>
                    <select className="form-select" value={form.borrowerId} onChange={(e) => set('borrowerId', e.target.value)}>
                      <option value="">Select Borrower</option>
                      {contacts.filter(c => String(c.id) !== String(activePersonId)).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="form-row-dates">
              <div className="date-field">
                <label className="form-label-sub">Start Date</label>
                <input className="form-input" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
              <div className="date-field">
                <label className="form-label-sub">Due Date</label>
                <input className="form-input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* Installment fields */}
        {form.type === 'Installment' && (
          <>
            <div className="form-row">
              {form.direction === 'owe' ? (
                <>
                  <div className="select-wrapper">
                    <label className="form-label-sub">Lender (Owed by You)</label>
                    <select className="form-select" value={form.lenderId} onChange={(e) => set('lenderId', e.target.value)}>
                      <option value="">Select Lender</option>
                      {contacts.filter(c => String(c.id) !== String(activePersonId)).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="select-wrapper">
                    <label className="form-label-sub">Borrower (Lendee)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={`👤 You (${activePersonName})`} 
                      readOnly 
                      disabled 
                      style={{ background: '#f1f5f9', color: '#475569', border: '1.5px dashed #cbd5e1', cursor: 'not-allowed' }} 
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="select-wrapper">
                    <label className="form-label-sub">Lender</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={`👤 You (${activePersonName})`} 
                      readOnly 
                      disabled 
                      style={{ background: '#f1f5f9', color: '#475569', border: '1.5px dashed #cbd5e1', cursor: 'not-allowed' }} 
                    />
                  </div>
                  <div className="select-wrapper">
                    <label className="form-label-sub">Borrower (Lendee)</label>
                    <select className="form-select" value={form.borrowerId} onChange={(e) => set('borrowerId', e.target.value)}>
                      <option value="">Select Borrower</option>
                      {contacts.filter(c => String(c.id) !== String(activePersonId)).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="form-row-three">
              <div className="select-wrapper">
                <label className="form-label-sub">Payment Terms Frequency</label>
                <select className="form-select" value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-sub">Start Date</label>
                <input className="form-input" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
              <div>
                <label className="form-label-sub">Total Terms</label>
                <input className="form-input" type="number" min="1" placeholder="e.g. 10" value={form.totalTerms} onChange={(e) => set('totalTerms', e.target.value)} />
              </div>
            </div>

            {/* Dynamic Terms Paid: Only shown if start date is earlier than today */}
            {isStartDateInPast() && (
              <div className="form-group dynamic-fade-in">
                <label className="form-label-sub alert-label-sub">📅 Start date is in the past. How many terms have been paid so far?</label>
                <input 
                  className="form-input" 
                  type="number" 
                  min="0" 
                  max={form.totalTerms || 100}
                  placeholder="Terms paid so far" 
                  value={form.termsPaid} 
                  onChange={(e) => set('termsPaid', e.target.value)} 
                />
              </div>
            )}
          </>
        )}

        {/* Group fields */}
        {form.type === 'Group' && (
          <>
            <div className="form-row">
              <div className="select-wrapper">
                <label className="form-label-sub">Lender (Person)</label>
                <select className="form-select" value={form.lenderId} onChange={(e) => set('lenderId', e.target.value)}>
                  <option value="">Select Lender</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {String(c.id) === String(activePersonId) ? `👤 You (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="select-wrapper">
                <label className="form-label-sub">Borrower Group</label>
                <select className="form-select" value={form.groupId} onChange={(e) => handleGroupChange(e.target.value)}>
                  <option value="">Select Group</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label-sub">Split Method</label>
              <div className="select-wrapper">
                <select className="form-select" value={form.splitMethod} onChange={(e) => set('splitMethod', e.target.value)}>
                  {SPLIT_METHODS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {groupMembers.length > 0 && (
              <div className="splits-section-box">
                <div className="splits-section-header">
                  <span>Assign Group splits:</span>
                  <button type="button" className="btn-split-equal" onClick={handleSplitEqually}>
                    ⚖️ Split Equally
                  </button>
                </div>
                
                {groupMembers.map((member) => (
                  <div className="member-split-row" key={member.id}>
                    <span className="member-name-label">{member.name}</span>
                    <div className="split-input-wrap">
                      {form.splitMethod === 'Divide Percent' ? '' : '₱ '}
                      <input
                        className="form-input split-number-input"
                        type="number"
                        min="0"
                        placeholder={form.splitMethod === 'Divide Percent' ? '0' : '0.00'}
                        value={form.splits[member.id] || ''}
                        onChange={(e) => handleSplitChange(member.id, e.target.value)}
                      />
                      {form.splitMethod === 'Divide Percent' ? ' %' : ''}
                    </div>
                  </div>
                ))}

                <div className={`split-validator-card ${splitTotals.isValid ? 'valid' : 'invalid'}`}>
                  <span>Total Split: <strong>{splitTotals.current}</strong> / {form.splitMethod === 'Divide Percent' ? '100%' : `₱${splitTotals.target.toLocaleString()}`}</span>
                  <span className="validator-indicator">{splitTotals.isValid ? '✓ Matches perfectly' : '⚠️ Must match exactly'}</span>
                </div>
              </div>
            )}

            <div className="form-row-dates">
              <div className="date-field">
                <label className="form-label-sub">Start Date</label>
                <input className="form-input" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
              <div className="date-field">
                <label className="form-label-sub">Due Date</label>
                <input className="form-input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="form-group notes-group">
          <textarea className="form-input notes-textarea" placeholder="Add custom notes..." value={form.notes} onChange={(e) => set('notes', e.target.value)} rows="2" />
        </div>

        {/* Receipt Upload with Premium Preview */}
        <div className="receipt-upload-box">
          <label className="btn btn-light btn-sm file-input-label">
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceipt} />
            📸 Add Receipt Image
          </label>
          {form.receiptPreviewUrl ? (
            <div className="receipt-preview-thumbnail-container">
              <img src={form.receiptPreviewUrl} alt="Receipt Upload" className="receipt-preview-thumbnail" />
              <div className="receipt-filename-lbl">📎 {form.receipt}</div>
            </div>
          ) : (
            form.receipt && <div className="receipt-preview">📎 {form.receipt}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={handleSubmit}>Create Loan Entry</button>
        </div>
      </div>
    </div>
  );
}
