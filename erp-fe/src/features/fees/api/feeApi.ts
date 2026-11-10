import api from '@/lib/api';

export interface FeeHead {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  category: 'TUITION' | 'ADMISSION' | 'EXAM' | 'LAB' | 'TRANSPORT' | 'ACTIVITY' | 'LIBRARY' | 'HOSTEL' | 'FINE' | 'OTHER';
  isOptional: boolean;
  isRefundable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureItem {
  id?: string;
  feeStructureId?: string;
  feeHeadId: string;
  amount: number;
  isMandatory: boolean;
  notes?: string | null;
  feeHead?: FeeHead;
}

export interface FeeStructure {
  id: string;
  name: string;
  academicYearId: string;
  classroomId?: string | null;
  quota: 'GENERAL' | 'STAFF_CHILD' | 'SCHOLARSHIP' | 'SIBLING_DISCOUNT' | 'RTE' | 'OTHER';
  frequency: 'MONTHLY' | 'QUARTERLY' | 'TERMLY' | 'HALF_YEARLY' | 'ANNUALLY' | 'ONE_TIME';
  totalAmount: number;
  dueDayOfMonth: number;
  lateFineAmount: number;
  lateFineGraceDays: number;
  isActive: boolean;
  academicYear?: { id: string; name: string; code: string; isCurrent: boolean };
  classroom?: { id: string; name: string; grade: number; section: string };
  items?: FeeStructureItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentInvoiceItem {
  id: string;
  invoiceId: string;
  feeHeadId: string;
  title: string;
  amount: number;
  discountAmount: number;
  netAmount: number;
  notes?: string | null;
  feeHead?: FeeHead;
}

export interface FeePayment {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'DEMAND_DRAFT' | 'OTHER';
  paymentDate: string;
  transactionReference?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  bankName?: string | null;
  notes?: string | null;
  collectedBy?: { id: string; firstName: string; lastName: string; email?: string };
  invoice?: StudentInvoice;
  createdAt: string;
}

export interface StudentInvoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  classroomId?: string | null;
  academicYearId: string;
  feeStructureId?: string | null;
  title: string;
  description?: string | null;
  dueDate: string;
  subtotalAmount: number;
  discountAmount: number;
  fineAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  issuedDate: string;
  notes?: string | null;
  student?: {
    id: string;
    admissionNumber: string;
    rollNumber: string;
    user?: { id: string; firstName: string; lastName: string; email: string; avatar?: string };
  };
  classroom?: { id: string; name: string; grade: number; section: string };
  academicYear?: { id: string; name: string; code: string; isCurrent: boolean };
  items?: StudentInvoiceItem[];
  payments?: FeePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface FeeSummaryStats {
  totals: {
    totalBilled: string | number;
    totalCollected: string | number;
    totalPending: string | number;
  };
  today: {
    todayTotal: string | number;
    todayCash: string | number;
    todayUpi: string | number;
    todayBankTransfer: string | number;
  };
  statusBreakdown: Array<{ status: string; count: string | number }>;
}

export interface StudentLedgerData {
  student: {
    id: string;
    admissionNumber: string;
    rollNumber: string;
    user?: { firstName: string; lastName: string; email: string; phone?: string; avatar?: string };
    classroom?: { id: string; name: string; grade: number; section: string };
  };
  summary: {
    totalBilled: number;
    totalPaid: number;
    outstandingBalance: number;
    invoicesCount: number;
    paymentsCount: number;
  };
  invoices: StudentInvoice[];
  payments: FeePayment[];
}

export const feeApi = {
  // Summary
  getSummaryStats: async (): Promise<FeeSummaryStats> => {
    const res = await api.get('/fees/summary');
    return res.data.data;
  },

  // Fee Heads
  getFeeHeads: async (params?: { isActive?: boolean; category?: string }): Promise<FeeHead[]> => {
    const res = await api.get('/fees/heads', { params });
    return res.data.data;
  },

  createFeeHead: async (payload: Partial<FeeHead>): Promise<FeeHead> => {
    const res = await api.post('/fees/heads', payload);
    return res.data.data;
  },

  updateFeeHead: async (id: string, payload: Partial<FeeHead>): Promise<FeeHead> => {
    const res = await api.put(`/fees/heads/${id}`, payload);
    return res.data.data;
  },

  deleteFeeHead: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/fees/heads/${id}`);
    return res.data.data;
  },

  // Fee Structures
  getFeeStructures: async (params?: { academicYearId?: string; classroomId?: string; quota?: string; isActive?: boolean }): Promise<FeeStructure[]> => {
    const res = await api.get('/fees/structures', { params });
    return res.data.data;
  },

  getFeeStructureById: async (id: string): Promise<FeeStructure> => {
    const res = await api.get(`/fees/structures/${id}`);
    return res.data.data;
  },

  createFeeStructure: async (payload: {
    name: string;
    academicYearId: string;
    classroomId?: string | null;
    quota?: string;
    frequency?: string;
    dueDayOfMonth?: number;
    lateFineAmount?: number;
    lateFineGraceDays?: number;
    isActive?: boolean;
    items: Array<{ feeHeadId: string; amount: number; isMandatory?: boolean; notes?: string }>;
  }): Promise<FeeStructure> => {
    const res = await api.post('/fees/structures', payload);
    return res.data.data;
  },

  updateFeeStructure: async (id: string, payload: Partial<FeeStructure>): Promise<FeeStructure> => {
    const res = await api.put(`/fees/structures/${id}`, payload);
    return res.data.data;
  },

  // Invoices
  getInvoices: async (params?: {
    studentId?: string;
    classroomId?: string;
    academicYearId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: StudentInvoice[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await api.get('/fees/invoices', { params });
    return {
      items: res.data.data || [],
      pagination: res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  getInvoiceById: async (id: string): Promise<StudentInvoice> => {
    const res = await api.get(`/fees/invoices/${id}`);
    return res.data.data;
  },

  generateSingleInvoice: async (payload: {
    studentId: string;
    academicYearId: string;
    feeStructureId?: string | null;
    title: string;
    description?: string;
    dueDate: string;
    discountAmount?: number;
    fineAmount?: number;
    notes?: string;
    items: Array<{ feeHeadId: string; title: string; amount: number; discountAmount?: number; notes?: string }>;
  }): Promise<StudentInvoice> => {
    const res = await api.post('/fees/invoices/single', payload);
    return res.data.data;
  },

  generateBulkClassInvoices: async (payload: {
    classroomId: string;
    academicYearId: string;
    feeStructureId: string;
    title: string;
    description?: string;
    dueDate: string;
    notes?: string;
  }): Promise<{ message: string; count: number; invoiceIds: string[] }> => {
    const res = await api.post('/fees/invoices/bulk-class', payload);
    return res.data.data;
  },

  // Payments
  collectPayment: async (payload: {
    invoiceId: string;
    amount: number;
    paymentMode: string;
    paymentDate?: string;
    transactionReference?: string;
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    notes?: string;
  }): Promise<FeePayment> => {
    const res = await api.post('/fees/payments/collect', payload);
    return res.data.data;
  },

  getReceiptById: async (id: string): Promise<FeePayment> => {
    const res = await api.get(`/fees/receipts/${id}`);
    return res.data.data;
  },

  // Ledger
  getStudentFeeLedger: async (studentId: string): Promise<StudentLedgerData> => {
    const res = await api.get(`/fees/ledger/${studentId}`);
    return res.data.data;
  },
};

export default feeApi;
