import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Person ───────────────────────────────────────────────────────────────────
export const personApi = {
  getAll: () => api.get('/person').then(r => r.data),
  getById: (id) => api.get(`/person/${id}`).then(r => r.data),
  create: (person) => api.post('/person', person).then(r => r.data),
  update: (id, person) => api.put(`/person/${id}`, person).then(r => r.data),
  delete: (id) => api.delete(`/person/${id}`),
};

// ─── Group ────────────────────────────────────────────────────────────────────
export const groupApi = {
  getAll: () => api.get('/group').then(r => r.data),
  getById: (id) => api.get(`/group/${id}`).then(r => r.data),
  create: (group) => api.post('/group', group).then(r => r.data),
  update: (id, group) => api.put(`/group/${id}`, group).then(r => r.data),
  delete: (id) => api.delete(`/group/${id}`),
  getMembers: (groupId) => api.get(`/group/${groupId}/members`).then(r => r.data),
  addMember: (groupId, personId) => api.post(`/group/${groupId}/member/${personId}`).then(r => r.data),
  removeMember: (groupMemberId) => api.delete(`/group/member/${groupMemberId}`),
};

// ─── Entry ────────────────────────────────────────────────────────────────────
export const entryApi = {
  getAll: (page = 0, size = 1000) =>
    api.get('/entry', { params: { page, size } }).then(r => r.data),
  getById: (id) => api.get(`/entry/${id}`).then(r => r.data),
  create: (entry) => api.post('/entry', entry).then(r => r.data),
  update: (id, entry) => api.put(`/entry/${id}`, entry).then(r => r.data),
  delete: (id) => api.delete(`/entry/${id}`),
  uploadReceipt: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.put(`/entry/${id}/receipt`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

// ─── Payment ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  getByEntry: (entryId) => api.get(`/entry/${entryId}/payment`).then(r => r.data),
  record: (entryId, payment) => api.post(`/entry/${entryId}/payment`, payment).then(r => r.data),
  delete: (entryId, paymentId) => api.delete(`/entry/${entryId}/payment/${paymentId}`),
};

// ─── Installment ──────────────────────────────────────────────────────────────
export const installmentApi = {
  getDetail: (entryId) => api.get(`/entry/${entryId}/installment`).then(r => r.data),
  createDetail: (entryId, detail) => api.post(`/entry/${entryId}/installment`, detail).then(r => r.data),
  updateDetail: (entryId, detail) => api.put(`/entry/${entryId}/installment`, detail).then(r => r.data),
  skipTerm: (entryId) => api.post(`/entry/${entryId}/installment/skip`).then(r => r.data),
  getStatuses: (entryId) => api.get(`/entry/${entryId}/installment/statuses`).then(r => r.data),
};

// ─── Payment Allocation (Group Splits) ─────────────────────────────────────────
export const allocationApi = {
  getAll: (entryId) => api.get(`/entry/${entryId}/allocation`).then(r => r.data),
  create: (entryId, allocation) => api.post(`/entry/${entryId}/allocation`, allocation).then(r => r.data),
  update: (entryId, id, allocation) => api.put(`/entry/${entryId}/allocation/${id}`, allocation).then(r => r.data),
  delete: (entryId, id) => api.delete(`/entry/${entryId}/allocation/${id}`),
  divideEqually: (entryId) => api.post(`/entry/${entryId}/allocation/divide-equally`).then(r => r.data),
  divideByPercent: (entryId, percentMap) => api.post(`/entry/${entryId}/allocation/divide-by-percent`, percentMap).then(r => r.data),
  divideByAmount: (entryId, amountMap) => api.post(`/entry/${entryId}/allocation/divide-by-amount`, amountMap).then(r => r.data),
};
