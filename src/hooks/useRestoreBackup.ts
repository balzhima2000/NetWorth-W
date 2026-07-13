import { useState } from 'react';
import { parseBackup } from '../services/exportImport';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useNetWorthStore } from '../stores/networthStore';
import { useCardsStore } from '../stores/cardsStore';
import { useRecurringStore } from '../stores/recurringStore';
import { useCategoriesStore } from '../stores/categoriesStore';
import { useToast } from './useToast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Backup = any;

/**
 * Restore-from-backup flow, shared by the Account → Data screen and the
 * William setup ("Restore from a backup instead"). Reads a JSON backup file,
 * previews a summary, and — on confirm — replaces each store's data. Extracted
 * so both entry points apply a backup identically (previously only Data.tsx had
 * the logic; setup bridged to the classic /setup page).
 */
export function useRestoreBackup() {
  const toast = useToast();
  const [pending, setPending] = useState<Backup | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  /** Parse a picked file; on success, stages the backup for confirmation. */
  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { backup, error, summary } = parseBackup(ev.target?.result as string);
      if (error) { toast.error(`Import error: ${error}`); return; }
      setPending(backup);
      setSummary(summary ?? null);
    };
    reader.readAsText(file);
  };

  const cancel = () => { setPending(null); setSummary(null); };

  /** Apply the staged backup to every store, then run `onDone`. */
  const confirm = (onDone?: () => void) => {
    const d = pending;
    if (!d) return;
    if (d.trades) usePortfolioStore.setState({ trades: d.trades });
    if (d.transactions) useTransactionStore.setState({ transactions: d.transactions });
    if (d.budgets) useBudgetStore.setState({ budgets: d.budgets });
    if (d.manualEntries && d.snapshots) useNetWorthStore.setState({ manualEntries: d.manualEntries, snapshots: d.snapshots });
    if (d.cards) useCardsStore.setState({ cards: d.cards });
    if (d.recurringPayments && d.installmentPlans) useRecurringStore.setState({ recurringPayments: d.recurringPayments, installmentPlans: d.installmentPlans });
    if (d.categories) useCategoriesStore.setState({ categories: d.categories, ...(d.incomeCategories ? { incomeCategories: d.incomeCategories } : {}) });
    setPending(null);
    setSummary(null);
    toast.success('Data imported.');
    onDone?.();
  };

  return { pending, summary, parseFile, cancel, confirm };
}
