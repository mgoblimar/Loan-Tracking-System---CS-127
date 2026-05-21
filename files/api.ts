import axios from 'axios';
import type {
  Entry,
  PageResponse,
  Person,
  Group,
  GroupMember,
  Payment,
  InstallmentDetail,
  InstallmentStatus,
  PaymentAllocation,
  CreateEntryRequest,
  CreatePaymentRequest,
  CreateInstallmentRequest,
  CreateAllocationRequest,
  DivideByPercentRequest,
  DivideByAmountRequest,
} from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Person ───────────────────────────────────────────────────────────────────
export const personApi = {
  getAll: () => api.get<Person[]>('/person').then(r => r.data),
  getById: (id: string) => api.get<Person>(`/person/${id}`).then(r => r.data),
  create: (person: Omit<Person, 'id'>) => api.post<Person>('/person', person).then(r => r.data),
  update: (id: string, person: Omit<Person, 'id'>) => api.put<Person>(`/person/${id}`, person).then(r => r.data),
  delete: (id: string) => api.delete(`/person/${id}`),
};

// ─── Group ────────────────────────────────────────────────────────────────────
export const groupApi = {
  getAll: () => api.get<Group[]>('/group').then(r => r.data),
  getById: (id: string) => api.get<Group>(`/group/${id}`).then(r => r.data),
  create: (group: { name: string }) => api.post<Group>('/group', group).then(r => r.data),
  update: (id: string, group: { name: string }) => api.put<Group>(`/group/${id}`, group).then(r => r.data),
  delete: (id: string) => api.delete(`/group/${id}`),
  getMembers: (groupId: string) => api.get<GroupMember[]>(`/group/${groupId}/members`).then(r => r.data),
  addMember: (groupId: string, personId: string) => api.post<GroupMember>(`/group/${groupId}/member/${personId}`).then(r => r.data),
  removeMember: (groupMemberId: string) => api.delete(`/group/member/${groupMemberId}`),
};

// ─── Entry ────────────────────────────────────────────────────────────────────
export const entryApi = {
  getAll: (page = 0, size = 10) =>
    api.get<PageResponse<Entry>>('/entry', { params: { page, size } }).then(r => r.data),
  getById: (id: string) => api.get<Entry>(`/entry/${id}`).then(r => r.data),
  create: (entry: CreateEntryRequest) => api.post<Entry>('/entry', entry).then(r => r.data),
  update: (id: string, entry: Partial<CreateEntryRequest>) =>
    api.put<Entry>(`/entry/${id}`, entry).then(r => r.data),
  delete: (id: string) => api.delete(`/entry/${id}`),
  uploadReceipt: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.put<string>(`/entry/${id}/receipt`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  getImageUrl: (filename: string) => `http://localhost:8080/entry/image/${filename}`,
};

// ─── Payment ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  getByEntry: (entryId: string) =>
    api.get<Payment[]>(`/entry/${entryId}/payment`).then(r => r.data),
  getById: (entryId: string, paymentId: string) =>
    api.get<Payment>(`/entry/${entryId}/payment/${paymentId}`).then(r => r.data),
  record: (entryId: string, payment: CreatePaymentRequest) =>
    api.post<Payment>(`/entry/${entryId}/payment`, payment).then(r => r.data),
  delete: (entryId: string, paymentId: string) =>
    api.delete(`/entry/${entryId}/payment/${paymentId}`),
};

// ─── Installment ──────────────────────────────────────────────────────────────
export const installmentApi = {
  getDetail: (entryId: string) =>
    api.get<InstallmentDetail>(`/entry/${entryId}/installment`).then(r => r.data),
  create: (entryId: string, detail: CreateInstallmentRequest) =>
    api.post<InstallmentDetail>(`/entry/${entryId}/installment`, detail).then(r => r.data),
  update: (entryId: string, detail: Partial<CreateInstallmentRequest>) =>
    api.put<InstallmentDetail>(`/entry/${entryId}/installment`, detail).then(r => r.data),
  skipTerm: (entryId: string) =>
    api.post<InstallmentDetail>(`/entry/${entryId}/installment/skip`).then(r => r.data),
  getStatuses: (entryId: string) =>
    api.get<InstallmentStatus[]>(`/entry/${entryId}/installment/statuses`).then(r => r.data),
};

// ─── Payment Allocation ───────────────────────────────────────────────────────
export const allocationApi = {
  getByEntry: (entryId: string) =>
    api.get<PaymentAllocation[]>(`/entry/${entryId}/allocation`).then(r => r.data),
  create: (entryId: string, allocation: CreateAllocationRequest) =>
    api.post<PaymentAllocation>(`/entry/${entryId}/allocation`, allocation).then(r => r.data),
  update: (entryId: string, id: string, allocation: Partial<CreateAllocationRequest>) =>
    api.put<PaymentAllocation>(`/entry/${entryId}/allocation/${id}`, allocation).then(r => r.data),
  delete: (entryId: string, id: string) =>
    api.delete(`/entry/${entryId}/allocation/${id}`),
  divideEqually: (entryId: string) =>
    api.post<PaymentAllocation[]>(`/entry/${entryId}/allocation/divide-equally`).then(r => r.data),
  divideByPercent: (entryId: string, map: DivideByPercentRequest) =>
    api.post<PaymentAllocation[]>(`/entry/${entryId}/allocation/divide-by-percent`, map).then(r => r.data),
  divideByAmount: (entryId: string, map: DivideByAmountRequest) =>
    api.post<PaymentAllocation[]>(`/entry/${entryId}/allocation/divide-by-amount`, map).then(r => r.data),
};

export default api;
