import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useCardsStore } from '../../stores/cardsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { parseBackup } from '../../services/exportImport';

interface Step1NameProps {
  onNext: () => void;
  onRestoreFromCloud: () => void;
}

type RestoreStep = 'idle' | 'name' | 'confirming';

export default function Step1Name({ onNext, onRestoreFromCloud }: Step1NameProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normal setup flow
  const [name, setName] = useState('');
  const setUserName = useSettingsStore((s) => s.setUserName);
  const setUserNickname = useSettingsStore((s) => s.setUserNickname);

  // Restore backup flow
  const [restoreStep, setRestoreStep] = useState<RestoreStep>('idle');
  const [restoreName, setRestoreName] = useState('');
  const [backupData, setBackupData] = useState<ReturnType<typeof parseBackup>['backup']>(null);
  const [backupSummary, setBackupSummary] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleContinue = () => {
    if (name.trim()) {
      setUserName(name.trim());
      setUserNickname(name.trim().split(' ')[0]);
      onNext();
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { backup, error, summary } = parseBackup(text);
      if (error || !backup) {
        setRestoreError(error ?? 'Could not read backup file.');
        return;
      }
      setBackupData(backup);
      setBackupSummary(summary);
      setRestoreStep('name');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestoreConfirm = () => {
    if (!backupData || !restoreName.trim()) return;
    setRestoring(true);

    try {
      // Restore all data stores
      if (backupData.trades) usePortfolioStore.setState({ trades: backupData.trades });
      if (backupData.transactions) useTransactionStore.setState({ transactions: backupData.transactions });
      if (backupData.budgets) useBudgetStore.setState({ budgets: backupData.budgets });
      if (backupData.manualEntries && backupData.snapshots) {
        useNetWorthStore.setState({
          manualEntries: backupData.manualEntries,
          snapshots: backupData.snapshots,
        });
      }
      if (backupData.cards) useCardsStore.setState({ cards: backupData.cards });
      if (backupData.recurringPayments && backupData.installmentPlans) {
        useRecurringStore.setState({
          recurringPayments: backupData.recurringPayments,
          installmentPlans: backupData.installmentPlans,
        });
      }
      if (backupData.categories) {
        useCategoriesStore.setState({
          categories: backupData.categories,
          ...(backupData.incomeCategories ? { incomeCategories: backupData.incomeCategories } : {}),
        });
      }

      // Set name from user input (don't restore old name from backup settings)
      const trimmedName = restoreName.trim();
      setUserName(trimmedName);
      setUserNickname(trimmedName.split(' ')[0]);

      // Mark setup as complete and go to dashboard
      useSettingsStore.setState({ hasCompletedSetup: true });
      navigate('/dashboard', { replace: true });
    } catch {
      setRestoreError('Restore failed. The backup file may be corrupted.');
      setRestoring(false);
    }
  };

  const handleRestoreCancel = () => {
    setRestoreStep('idle');
    setBackupData(null);
    setBackupSummary(null);
    setRestoreName('');
    setRestoreError(null);
  };

  // ── Restore flow screens ──────────────────────────────────────────────────

  if (restoreStep === 'name') {
    return (
      <div className="text-center space-y-8">
        <div>
          <div className="text-4xl mb-3">📂</div>
          <h1 className="text-3xl font-bold text-white mb-2">Restore Backup</h1>
          {backupSummary && (
            <p className="text-white/50 text-sm max-w-sm mx-auto">{backupSummary}</p>
          )}
        </div>

        <div className="max-w-sm mx-auto space-y-4 text-left">
          <div>
            <p className="text-white font-semibold mb-2">What's your name?</p>
            <p className="text-white/40 text-xs mb-3">
              Your name isn't stored in the backup — enter it to personalise the app.
            </p>
            <Input
              placeholder="e.g. Eitan Cohen"
              value={restoreName}
              onChange={(e) => setRestoreName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRestoreConfirm(); }}
            />
          </div>

          {restoreError && (
            <p className="text-[#EF4444] text-sm">{restoreError}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Button
            variant="primary"
            size="lg"
            onClick={handleRestoreConfirm}
            disabled={!restoreName.trim() || restoring}
            fullWidth
          >
            {restoring ? 'Restoring…' : 'Restore & Go to Dashboard'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={handleRestoreCancel}
            fullWidth
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Default welcome screen (Step 1) ──────────────────────────────────────

  return (
    <div className="relative text-center space-y-10">
      {/* Restore Backup — top-left */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="success"
          size="sm"
          onClick={handleRestoreClick}
        >
          📂 Restore Backup
        </Button>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileSelected}
        />
        {restoreError && (
          <p className="text-[#EF4444] text-xs mt-1 text-left">{restoreError}</p>
        )}
      </div>

      <div>
        <h1 className="text-5xl font-bold text-white mb-3">Hello there! 👋</h1>
        <p className="text-white/50">Let's get your personal finance tracker set up.</p>
      </div>

      <div className="max-w-sm mx-auto space-y-3">
        <p className="text-2xl font-semibold text-white">What's your name?</p>
        <Input
          placeholder="e.g. Eitan Cohen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}
        />
      </div>

      <Button
        variant="secondary"
        size="md"
        onClick={handleContinue}
        disabled={!name.trim()}
      >
        Continue
      </Button>

      <button
        className="text-white/30 text-sm hover:text-white/60 transition-colors"
        onClick={onRestoreFromCloud}
      >
        Already set up on another device? Restore from cloud →
      </button>
    </div>
  );
}
