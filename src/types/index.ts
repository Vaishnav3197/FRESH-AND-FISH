export interface UserProfile {
  uid: string;
  email: string;
  role: 'owner' | 'employee';
  name: string;
}

export interface Customer {
  customerId: string;
  name: string;
  phone: string | null;
  totalDue: number;
  createdAt: number; // Stored as Long (Epoch milliseconds) in Firestore
  updatedAt: number; // Stored as Long (Epoch milliseconds) in Firestore
  isActive: boolean;
  active?: boolean; // Maps to Android serialized Firestore field
  addedBy: string; // 'Owner' | 'Employee'
}

export interface Credit {
  id: string; // Document ID
  customerId: string;
  customerName: string;
  items: string;
  amount: number;
  paidAmount: number;
  purchaseDate: any; // Firestore Timestamp (purchaseDate.toDate() on client)
  status: 'outstanding' | 'received';
  receivedDate: any | null; // Firestore Timestamp or null
  addedBy: string; // 'Owner' | 'Employee'
  notes: string | null;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | null;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  addedByUserId: string;
  addedByName: string;
  addedByRole: string; // 'Owner' | 'Employee'
  updatedByUserId: string | null;
}

export interface Expense {
  expenseId: string; // Document ID
  title: string;
  category: 'Ice' | 'Fuel' | 'Transport' | 'Electricity' | 'Salary' | 'Packaging' | 'Miscellaneous' | string;
  amount: number;
  date: any; // Firestore Timestamp
  notes: string | null;
  createdAt: any; // Firestore Timestamp
  createdBy: string; // UID of user who created
}

export interface TopCustomerItem {
  customerName: string;
  totalPurchases: number;
  outstandingAmount: number;
}

export interface RecentActivityItem {
  title: string;
  description: string;
  timestamp: any; // Firestore Timestamp or Date
  type: 'credit_added' | 'payment_received' | 'expense_added' | 'customer_added';
}

export interface DashboardUiState {
  todaySales: number;
  todayCredit: number;
  todayCollection: number;
  todayExpenses: number;
  outstandingAmount: number;
}

export interface BusinessAnalyticsState {
  netIncome: number;
  totalCustomersCount: number;
  outstandingCustomersCount: number;
  totalTransactionsTodayCount: number;
  salesThisWeek: number;
  salesThisMonth: number;
  expensesThisWeek: number;
  expensesThisMonth: number;
  topCustomersByPurchases: TopCustomerItem[];
  topCustomersByOutstanding: TopCustomerItem[];
  recentActivities: RecentActivityItem[];
}
