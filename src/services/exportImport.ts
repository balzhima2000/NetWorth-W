import type {
  StockTrade,
  Transaction,
  MonthlyBudget,
  ManualEntry,
  NetWorthSnapshot,
  Card,
  RecurringPayment,
  InstallmentPlan,
  SpendingCategory,
} from '../types/index';
import { getTodayISO } from '../utils/formatters';

export interface FullBackup {
  version: 1;
  exportDate: string;
  trades: StockTrade[];
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  manualEntries: ManualEntry[];
  snapshots: NetWorthSnapshot[];
  cards: Card[];
  recurringPayments: RecurringPayment[];
  installmentPlans: InstallmentPlan[];
  categories: SpendingCategory[];
  settings: Record<string, unknown>;
}

export function exportFullBackup(data: Omit<FullBackup, 'version' | 'exportDate'>): void {
  const backup: FullBackup = {
    version: 1,
    exportDate: new Date().toISOString(),
    ...data,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `networth-backup-${getTodayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(transactions: Transaction[]): void {
  const headers = [
    'Date', 'Amount', 'Currency', 'Converted Amount', 'Category',
    'Type', 'Payment Method', 'Notes', 'Is Recurring', 'Installment Info',
  ];

  const rows = transactions.map((tx) => [
    tx.date,
    tx.amount.toFixed(2),
    tx.currency,
    tx.convertedAmount.toFixed(2),
    tx.category,
    tx.type,
    tx.paymentMethod,
    tx.notes,
    tx.isAutoAdded ? 'Yes' : 'No',
    tx.installmentPlanId
      ? `Payment ${tx.installmentNumber} of ${tx.installmentTotal}`
      : '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${getTodayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseBackup(jsonString: string): {
  backup: FullBackup | null;
  error: string | null;
  summary: string | null;
} {
  try {
    const data = JSON.parse(jsonString) as FullBackup;

    if (data.version !== 1) {
      return { backup: null, error: 'Unsupported backup version', summary: null };
    }

    const summary = [
      data.transactions?.length ? `${data.transactions.length} transactions` : null,
      data.trades?.length ? `${data.trades.length} trades` : null,
      data.recurringPayments?.length ? `${data.recurringPayments.length} recurring payments` : null,
      data.cards?.length ? `${data.cards.length} cards` : null,
      data.manualEntries?.length ? `${data.manualEntries.length} assets/liabilities` : null,
    ]
      .filter(Boolean)
      .join(', ');

    return { backup: data, error: null, summary: `This backup contains: ${summary}.` };
  } catch {
    return { backup: null, error: 'Invalid JSON file', summary: null };
  }
}
