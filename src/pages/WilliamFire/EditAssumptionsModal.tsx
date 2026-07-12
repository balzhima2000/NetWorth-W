/**
 * Edit Assumptions modal — the inputs behind the FIRE number (annual expenses,
 * savings, withdrawal/return rates, ages). Extracted from the FIRE page so it can
 * also be opened from the dashboard "Set your FIRE goal" finish-setup card.
 */
import { useState } from 'react';
import { Modal, Button, Field, TextInput } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';

export function EditAssumptionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettingsStore();
  const setFireProfile = useSettingsStore((st) => st.setFireProfile);

  const [expenses, setExpenses] = useState('');
  const [withdrawal, setWithdrawal] = useState('');
  const [ret, setRet] = useState('');
  const [savings, setSavings] = useState('');
  const [age, setAge] = useState('');
  const [targetAge, setTargetAge] = useState('');
  const cur = s.defaultCurrency;
  // Currencies offered by the money-field selector: common set + the user's own.
  const currencies = Array.from(
    new Set(['USD', 'EUR', 'GBP', 'ILS', 'CAD', 'AUD', 'JPY', 'CHF', s.defaultCurrency, ...s.exchangeRates.map((r) => r.currency)]),
  );

  // Seed fields each time the modal opens.
  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setExpenses(s.fireAnnualExpenses != null ? String(s.fireAnnualExpenses) : '');
    setWithdrawal(String(s.fireWithdrawalRate));
    setRet(String(s.fireExpectedReturn));
    setSavings(s.fireMonthlyContribution != null ? String(s.fireMonthlyContribution * 12) : '');
    setAge(s.fireCurrentAge != null ? String(s.fireCurrentAge) : '');
    setTargetAge(s.fireTargetAge != null ? String(s.fireTargetAge) : '');
    setSeeded(true);
  }
  if (!open && seeded) setSeeded(false);

  const save = () => {
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    const savingsNum = num(savings);
    setFireProfile({
      annualExpenses: num(expenses),
      withdrawalRate: withdrawal.trim() === '' ? s.fireWithdrawalRate : Number(withdrawal),
      expectedReturn: ret.trim() === '' ? s.fireExpectedReturn : Number(ret),
      monthlyContribution: savingsNum != null ? savingsNum / 12 : null,
      currentAge: num(age),
      targetAge: num(targetAge),
    });
    onClose();
  };

  // Money input with a trailing currency selector (matches the Figma field accessory).
  // State stores raw digits; the field displays them with comma thousands.
  const MoneyField = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => {
    const digits = value.replace(/[^\d]/g, '');
    const display = digits ? Number(digits).toLocaleString('en-US') : '';
    return (
    <Field label={label}>
      <div className="relative">
        <TextInput inputMode="numeric" className="pr-[68px]" placeholder={placeholder} value={display} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))} />
        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <select
            aria-label="Currency"
            value={cur}
            onChange={(e) => s.setDefaultCurrency(e.target.value)}
            className="num-mono cursor-pointer appearance-none bg-transparent text-[14px] font-medium text-secondary focus:outline-none"
          >
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <svg width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden="true" className="pointer-events-none text-secondary">
            <path d="M1 1.5 5.5 6 10 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Field>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit assumptions"
      maxWidth={480}
      footer={
        <>
          <Button variant="tonal" size="l" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="l" className="flex-1" onClick={save}>Save changes</Button>
        </>
      }
    >
      <p className="-mt-1 ty-body text-secondary">These inputs drive your FI number and projected date.</p>
      <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2">
        <MoneyField label="Annual expenses" placeholder="50,000" value={expenses} onChange={setExpenses} />
        <MoneyField label="Annual savings" placeholder="30,000" value={savings} onChange={setSavings} />
        <Field label="Withdrawal rate (%)">
          <TextInput inputMode="decimal" placeholder="4" value={withdrawal} onChange={(e) => setWithdrawal(e.target.value)} />
        </Field>
        <Field label="Expected return · real (%)">
          <TextInput inputMode="decimal" placeholder="7" value={ret} onChange={(e) => setRet(e.target.value)} />
        </Field>
        <Field label="Current age">
          <TextInput inputMode="numeric" placeholder="32" value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
        <Field label="Target FI age">
          <TextInput inputMode="numeric" placeholder="47" value={targetAge} onChange={(e) => setTargetAge(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
