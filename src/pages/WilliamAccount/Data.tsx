import { useRef, useState } from 'react';
import { Card, Button, Modal } from '../../components/william';
import { useToast } from '../../hooks/useToast';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useCardsStore } from '../../stores/cardsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { exportFullBackup, exportTransactionsCSV, parseBackup } from '../../services/exportImport';
import { formatDate } from '../../utils/formatters';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Backup = any;
import { AccountSubPage } from './AccountSubPage';

export default function Data() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const lastBackupDate = useSettingsStore((s) => s.lastBackupDate);
  const setLastBackupDate = useSettingsStore((s) => s.setLastBackupDate);
  const [importData, setImportData] = useState<Backup | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const exportJSON = () => {
    const st = useSettingsStore.getState();
    exportFullBackup({
      trades: usePortfolioStore.getState().trades,
      transactions: useTransactionStore.getState().transactions,
      budgets: useBudgetStore.getState().budgets,
      manualEntries: useNetWorthStore.getState().manualEntries,
      snapshots: useNetWorthStore.getState().snapshots,
      cards: useCardsStore.getState().cards,
      recurringPayments: useRecurringStore.getState().recurringPayments,
      installmentPlans: useRecurringStore.getState().installmentPlans,
      categories: useCategoriesStore.getState().categories,
      incomeCategories: useCategoriesStore.getState().incomeCategories,
      settings: {},
    });
    setLastBackupDate(new Date().toISOString());
    void st;
    toast.success('Full backup downloaded.');
  };

  const exportCSV = () => {
    exportTransactionsCSV(useTransactionStore.getState().transactions, useCardsStore.getState().cards);
    toast.success('Transactions CSV downloaded.');
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { backup, error, summary } = parseBackup(ev.target?.result as string);
      if (error) { toast.error(`Import error: ${error}`); return; }
      setImportData(backup); setSummary(summary ?? null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = () => {
    const d = importData; if (!d) return;
    if (d.trades) usePortfolioStore.setState({ trades: d.trades });
    if (d.transactions) useTransactionStore.setState({ transactions: d.transactions });
    if (d.budgets) useBudgetStore.setState({ budgets: d.budgets });
    if (d.manualEntries && d.snapshots) useNetWorthStore.setState({ manualEntries: d.manualEntries, snapshots: d.snapshots });
    if (d.cards) useCardsStore.setState({ cards: d.cards });
    if (d.recurringPayments && d.installmentPlans) useRecurringStore.setState({ recurringPayments: d.recurringPayments, installmentPlans: d.installmentPlans });
    if (d.categories) useCategoriesStore.setState({ categories: d.categories, ...(d.incomeCategories ? { incomeCategories: d.incomeCategories } : {}) });
    setImportData(null); setSummary(null);
    toast.success('Data imported.');
  };

  return (
    <AccountSubPage title="Data management" subtitle="Export a backup or restore from one.">
      <Card className="flex flex-col gap-3 p-5">
        <Button size="m" pill variant="secondary" onClick={exportJSON}>⬇ Export full backup (JSON)</Button>
        <Button size="m" pill variant="secondary" onClick={exportCSV}>📊 Export transactions (CSV)</Button>
        <Button size="m" pill variant="ghost" onClick={() => fileRef.current?.click()}>⬆ Import backup (JSON)</Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} />
        <span className="text-[13px] text-muted">{lastBackupDate ? `Last backup: ${formatDate(lastBackupDate)}` : 'No backup yet.'}</span>
      </Card>

      <Modal open={!!importData} onClose={() => setImportData(null)} title="Import & replace?" footer={
        <>
          <Button pill size="l" variant="secondary" className="flex-1 md:flex-none md:ml-auto" onClick={() => setImportData(null)}>Cancel</Button>
          <Button pill size="l" variant="primary" className="flex-1 md:flex-none" onClick={confirmImport}>Import & replace</Button>
        </>
      }>
        <p className="text-[14px] text-secondary">{summary || 'This will replace your current data with the backup contents.'}</p>
      </Modal>
    </AccountSubPage>
  );
}
