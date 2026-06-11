import { useState } from 'react';
import { Card, Button, Modal, Field, TextInput } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useCardsStore } from '../../stores/cardsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useAllocationStore } from '../../stores/allocationStore';
import { ALL_STORE_KEYS } from '../../utils/syncHelpers';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { AccountSubPage } from './AccountSubPage';

function clearAllStores() {
  usePortfolioStore.setState({ trades: [], currentPrices: {}, lastPriceUpdates: {} });
  useTransactionStore.setState({ transactions: [], lastUsedPaymentMethod: 'cash' });
  useBudgetStore.setState({ budgets: [] });
  useNetWorthStore.setState({ manualEntries: [], snapshots: [] });
  useCardsStore.setState({ cards: [], incomeDestinations: [{ id: 'cash', name: 'Cash', icon: '💵' }] });
  useRecurringStore.setState({ recurringPayments: [], installmentPlans: [] });
  useAllocationStore.setState({ mode: 'none', targets: {} });
  ALL_STORE_KEYS.forEach((k) => localStorage.removeItem(k));
}

export default function Danger() {
  const setHasCompletedSetup = useSettingsStore((s) => s.setHasCompletedSetup);
  const [soft, setSoft] = useState(false);
  const [hard, setHard] = useState(false);
  const [clearText, setClearText] = useState('');

  const doSoft = () => { clearAllStores(); setHasCompletedSetup(false); setSoft(false); window.location.href = '/setup'; };
  const doHard = async () => {
    if (clearText !== 'DELETE') return;
    clearAllStores();
    if (supabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('sync_stores').delete().eq('user_id', user.id);
    }
    setHasCompletedSetup(false); setHard(false); setClearText('');
    window.location.href = '/setup';
  };

  return (
    <AccountSubPage title="Danger zone" subtitle="Irreversible actions. Export a backup first.">
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold text-ink">Reset this device</span>
          <span className="text-[13px] text-secondary">Clears all data on this device and restarts setup. Cloud backup (if signed in) is kept.</span>
          <Button size="s" pill variant="secondary" className="mt-2 w-fit" onClick={() => setSoft(true)}>Reset this device</Button>
        </div>
        <div className="h-px w-full bg-line" />
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold text-negative">Delete everything</span>
          <span className="text-[13px] text-secondary">Permanently deletes all local data and your cloud backup. This cannot be undone.</span>
          <Button size="s" pill variant="secondary" className="mt-2 w-fit !border-negative !text-negative" onClick={() => { setClearText(''); setHard(true); }}>Delete everything</Button>
        </div>
      </Card>

      <Modal open={soft} onClose={() => setSoft(false)} title="Reset this device?" footer={
        <>
          <Button pill size="l" variant="secondary" className="flex-1 md:flex-none md:ml-auto" onClick={() => setSoft(false)}>Cancel</Button>
          <Button pill size="l" variant="primary" className="flex-1 md:flex-none" onClick={doSoft}>Reset</Button>
        </>
      }>
        <p className="text-[14px] text-secondary">All data on this device will be cleared and you’ll return to setup.</p>
      </Modal>

      <Modal open={hard} onClose={() => setHard(false)} title="Delete everything?" footer={
        <>
          <Button pill size="l" variant="secondary" className="flex-1 md:flex-none md:ml-auto" onClick={() => setHard(false)}>Cancel</Button>
          <Button pill size="l" variant="primary" className="flex-1 md:flex-none !bg-negative !text-white" disabled={clearText !== 'DELETE'} onClick={doHard}>Delete everything</Button>
        </>
      }>
        <p className="text-[14px] text-secondary">This permanently deletes local data and your cloud backup. Type <span className="font-semibold text-ink">DELETE</span> to confirm.</p>
        <Field label="Confirmation"><TextInput value={clearText} onChange={(e) => setClearText(e.target.value)} placeholder="DELETE" /></Field>
      </Modal>
    </AccountSubPage>
  );
}
