// ─── Enums (exact Java enum values) ──────────────────────────────────────────

export type TransactionType =
  | 'STRAIGHT_EXPENSE'
  | 'INSTALLMENT_EXPENSE'
  | 'GROUP_EXPENSE';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export type InstallmentStatus =
  | 'NOT_STARTED'
  | 'UNPAID'
  | 'PAID'
  | 'SKIPPED'
  | 'DELINQUENT';

export type PaymentAllocationStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export type PaymentFrequency = 'MONTHLY' | 'WEEKLY';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Person {
  id: string;           // UUID → string
  name: string;
  contactInfo?: string;
}

export interface GroupMember {
  id: string;
  group?: Group;
  person: Person;
}

export interface Group {
  id: string;
  name: string;
  members?: GroupMember[];
}

export interface Entry {
  id: string;
  name: string;
  description?: string;
  transactionType: TransactionType;
  dateBorrowed?: string;        // LocalDate → ISO string 'YYYY-MM-DD'
  dateFullyPaid?: string;
  borrowerPerson?: Person;
  borrowerGroup?: Group;
  lender?: Person;
  amountBorrowed: number;       // BigDecimal → number
  amountRemaining: number;
  status: PaymentStatus;
  notes?: string;
  paymentNotes?: string;
  receipt?: string;
  referenceId?: string;
  borrowerInitial?: string;
  lenderInitial?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface Payment {
  id: string;
  entry?: Entry;
  paymentDate: string;          // LocalDate → ISO string
  paymentAmount: number;
  payee: Person;
  proof?: string;
  notes?: string;
}

export interface InstallmentDetail {
  id: string;
  entry?: Entry;
  status?: InstallmentStatus;
  startDate: string;            // LocalDate → ISO string
  paymentFrequency: PaymentFrequency;
  paymentTerms: number;
  paymentAmountPerTerm: number;
  notes?: string;
  skippedTerms?: number;
}

export interface PaymentAllocation {
  id: string;
  entry?: Entry;
  description: string;
  payee: Person;
  amount: number;
  notes?: string;
}

// ─── Request Bodies ───────────────────────────────────────────────────────────

export type CreateEntryRequest = Omit<Entry, 'id' | 'referenceId' | 'borrowerInitial' | 'lenderInitial' | 'amountRemaining' | 'status'> & {
  borrowerPerson?: { id: string };
  borrowerGroup?: { id: string };
  lender?: { id: string };
};

export type CreatePaymentRequest = {
  paymentAmount: number;
  paymentDate?: string;
  payee: { id: string };
  proof?: string;
  notes?: string;
};

export type CreateInstallmentRequest = {
  startDate: string;
  paymentFrequency: PaymentFrequency;
  paymentTerms: number;
  notes?: string;
};

export type CreateAllocationRequest = {
  description: string;
  payee: { id: string };
  amount: number;
  notes?: string;
};

export type DivideByPercentRequest = Record<string, number>;
export type DivideByAmountRequest = Record<string, number>;
