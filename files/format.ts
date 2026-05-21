import type { TransactionType, PaymentStatus, InstallmentStatus, PaymentFrequency } from '../types';

export const fmt = {
  currency: (n: number) =>
    '₱ ' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

  date: (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  initials: (name: string) =>
    name.trim().split(/\s+/).map(p => p[0] || '').join('').toUpperCase().slice(0, 2),

  paidPercent: (remaining: number, borrowed: number) =>
    borrowed > 0 ? Math.round((1 - remaining / borrowed) * 100) : 0,
};

export const labels = {
  transactionType: (t: TransactionType): string => ({
    STRAIGHT_EXPENSE: 'Straight',
    INSTALLMENT_EXPENSE: 'Installment',
    GROUP_EXPENSE: 'Group',
  }[t] ?? t),

  paymentStatus: (s: PaymentStatus): string => ({
    UNPAID: 'Unpaid',
    PARTIALLY_PAID: 'Partial',
    PAID: 'Paid',
  }[s] ?? s),

  installmentStatus: (s: InstallmentStatus): string =>
    s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),

  paymentFrequency: (f: PaymentFrequency): string => ({
    MONTHLY: 'Monthly',
    WEEKLY: 'Weekly',
  }[f] ?? f),
};

export const AVATAR_COLORS = [
  { bg: '#ede9fe', text: '#4f46e5' },
  { bg: '#d1fae5', text: '#059669' },
  { bg: '#fee2e2', text: '#b91c1c' },
  { bg: '#ccfbf1', text: '#0f766e' },
  { bg: '#fef3c7', text: '#d97706' },
  { bg: '#dbeafe', text: '#2563eb' },
];

export function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
