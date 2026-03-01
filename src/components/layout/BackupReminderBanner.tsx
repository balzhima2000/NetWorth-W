import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useCardsStore } from '../../stores/cardsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { exportFullBackup } from '../../services/exportImport';
import { useToast } from '../../hooks/useToast';

const BACKUP_INTERVAL_DAYS = 30;

export function BackupReminderBanner() {
  const [dismissed, setDismissed] = useState(false);

  const lastBackupDate  = useSettingsStore((s) => s.lastBackupDate);
  const setLastBackupDate = useSettingsStore((s) => s.setLastBackupDate);

  // All data needed for the export
  const trades            = usePortfolioStore((s) => s.trades);
  const transactions      = useTransactionStore((s) => s.transactions);
  const budgets           = useBudgetStore((s) => s.budgets);
  const manualEntries     = useNetWorthStore((s) => s.manualEntries);
  const snapshots         = useNetWorthStore((s) => s.snapshots);
  const cards             = useCardsStore((s) => s.cards);
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const installmentPlans  = useRecurringStore((s) => s.installmentPlans);
  const categories        = useCategoriesStore((s) => s.categories);
  const incomeCategories  = useCategoriesStore((s) => s.incomeCategories);

  const toast = useToast();

  // Calculate days since last backup
  const daysSince = lastBackupDate
    ? Math.floor((Date.now() - new Date(lastBackupDate).getTime()) / 86_400_000)
    : null;

  const isDue = daysSince === null || daysSince >= BACKUP_INTERVAL_DAYS;

  if (!isDue || dismissed) return null;

  const message = daysSince === null
    ? "You haven't backed up your data yet. Don't risk losing it!"
    : `Your last backup was ${daysSince} day${daysSince !== 1 ? 's' : ''} ago. Consider exporting a fresh backup.`;

  const handleBackupNow = () => {
    exportFullBackup({
      trades, transactions, budgets,
      manualEntries, snapshots, cards,
      recurringPayments, installmentPlans,
      categories, incomeCategories, settings: {},
    });
    setLastBackupDate(new Date().toISOString());
    toast.success('Backup downloaded. Your data is safe!');
    setDismissed(true);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-amber-400 flex-shrink-0">💾</span>
        <p className="text-amber-200/80 text-sm truncate">{message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleBackupNow}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors whitespace-nowrap"
        >
          Back up now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400/50 hover:text-amber-300 transition-colors p-1"
          aria-label="Dismiss backup reminder"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
