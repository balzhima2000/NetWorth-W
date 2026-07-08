/**
 * Edit / Add Recurring modal — William. Handles BOTH recurring subscriptions
 * and installment plans (a Subscription/Installment toggle in create mode;
 * fixed to the item's kind when editing).
 *
 * Subscription 1:1 from Figma (Modal / Edit Recurring — Desktop 1176:10240).
 * The installment variant has no dedicated frame yet — it reuses the same
 * Field/Modal patterns; revisit if a design lands.
 */
import { useState } from 'react';
import { Modal, Button, DangerButton, Field, TextInput, SelectInput, SegmentToggle } from '../../components/william';
import { useRecurringStore } from '../../stores/recurringStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTodayISO } from '../../utils/formatters';
import type { RecurringPayment, InstallmentPlan } from '../../types/index';

const isoToDDMM = (iso: string) => { const [y, m, d] = iso.split('-'); return d && m && y ? `${d}.${m}.${y}` : ''; };
const ddmmToISO = (s: string) => { const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };
const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS'];
const FREQUENCIES: RecurringPayment['frequency'][] = ['weekly', 'monthly', 'yearly'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export type RecurringEditing = RecurringPayment | InstallmentPlan | 'new' | null;
const isPlan = (e: RecurringEditing): e is InstallmentPlan => e !== null && e !== 'new' && 'totalInstallments' in e;
const isPayment = (e: RecurringEditing): e is RecurringPayment => e !== null && e !== 'new' && 'frequency' in e;

export function EditRecurringModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: RecurringEditing }) {
  const { addRecurringPayment, updateRecurringPayment, deleteRecurringPayment, addInstallmentPlan, updateInstallmentPlan, deleteInstallmentPlan } = useRecurringStore();
  const expenseCats = useCategoriesStore((s) => s.categories);
  const dflt = useSettingsStore((s) => s.defaultCurrency);

  const payment = isPayment(editing) ? editing : null;
  const plan = isPlan(editing) ? editing : null;
  const isCreate = editing === 'new';
  const isEdit = payment != null || plan != null;

  // 'sub' (recurring payment) or 'inst' (installment plan)
  const [kind, setKind] = useState<'sub' | 'inst'>(plan ? 'inst' : 'sub');

  // shared
  const [name, setName] = useState((payment ?? plan)?.name ?? '');
  const [category, setCategory] = useState((payment ?? plan)?.category ?? expenseCats[0]?.id ?? '');
  const [currency, setCurrency] = useState(payment?.currency || dflt);
  const [date, setDate] = useState(isoToDDMM(payment?.nextDueDate ?? plan?.startDate ?? getTodayISO()));
  // subscription-only
  const [amount, setAmount] = useState(payment != null ? String(payment.amount) : '');
  const [frequency, setFrequency] = useState<RecurringPayment['frequency']>(payment?.frequency ?? 'monthly');
  // installment-only
  const [perMonth, setPerMonth] = useState(plan != null ? String(plan.installmentAmount) : '');
  const [count, setCount] = useState(plan != null ? String(plan.totalInstallments) : '');
  const [paid, setPaid] = useState(plan != null ? String(plan.totalInstallments - plan.remainingInstallments) : '0');

  const validSub = name.trim() !== '' && parseFloat(amount) > 0 && category !== '';
  const validInst = name.trim() !== '' && parseFloat(perMonth) > 0 && parseInt(count) > 0 && category !== '';
  const valid = kind === 'sub' ? validSub : validInst;

  const submit = () => {
    if (!valid) return;
    const iso = ddmmToISO(date) ?? getTodayISO();
    const dayOfMonth = Number(iso.split('-')[2]);
    if (kind === 'sub') {
      const fields = {
        name: name.trim(), amount: parseFloat(amount), currency, category, frequency,
        nextDueDate: iso, dayOfMonth: frequency === 'weekly' ? (payment?.dayOfMonth ?? null) : dayOfMonth,
      };
      if (payment) updateRecurringPayment(payment.id, fields);
      else addRecurringPayment({
        id: crypto.randomUUID(), type: 'expense', dayOfWeek: frequency === 'weekly' ? new Date(iso).getDay() : null,
        startDate: iso, endDate: null, isActive: true, notes: '', ...fields,
      });
    } else {
      const total = parseInt(count);
      const paidN = Math.min(Math.max(parseInt(paid) || 0, 0), total);
      const per = parseFloat(perMonth);
      const fields = {
        name: name.trim(), category, installmentAmount: per, totalInstallments: total,
        remainingInstallments: total - paidN, totalAmount: per * total, dayOfMonth,
        nextPaymentDate: iso, currency,
      };
      if (plan) updateInstallmentPlan(plan.id, fields);
      else addInstallmentPlan({ id: crypto.randomUUID(), startDate: iso, isActive: true, notes: '', ...fields });
    }
    onClose();
  };

  const remove = () => {
    if (payment) deleteRecurringPayment(payment.id);
    else if (plan) deleteInstallmentPlan(plan.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? (plan ? 'Edit installment plan' : 'Edit recurring') : 'Add recurring'}
      footer={
        <>
          {/* Desktop: Delete (left) · Cancel · Save (right) */}
          <div className="hidden w-full items-center gap-2.5 md:flex">
            {isEdit && <DangerButton pill size="l" onClick={remove}>Delete</DangerButton>}
            <div className="ml-auto flex gap-2.5">
              <Button pill size="l" variant="tonal" onClick={onClose}>Cancel</Button>
              <Button pill size="l" variant="primary" disabled={!valid} onClick={submit}>Save</Button>
            </div>
          </div>
          {/* Mobile: full-width Save, ghost Delete stacked below (✕ dismisses) */}
          <div className="flex w-full flex-col gap-1 md:hidden">
            <Button pill size="l" variant="primary" className="w-full" disabled={!valid} onClick={submit}>Save</Button>
            {isEdit && <DangerButton pill size="l" variant="subtle" className="w-full" onClick={remove}>Delete</DangerButton>}
          </div>
        </>
      }
    >
      <p className="-mt-1 text-[13px] text-secondary">
        {isEdit
          ? (plan ? 'Update this installment plan.' : 'Update the details of this recurring payment.')
          : 'Add a subscription or an installment plan.'}
      </p>

      {isCreate && (
        <SegmentToggle
          options={[{ value: 'sub', label: 'Subscription' }, { value: 'inst', label: 'Installment' }]}
          value={kind}
          onChange={(v) => setKind(v as 'sub' | 'inst')}
        />
      )}

      <div className="flex gap-3">
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'sub' ? 'e.g. Netflix' : 'e.g. MacBook Pro'} /></Field>
        <Field label={kind === 'sub' ? 'Amount' : 'Amount / mo'}>
          <div className="flex gap-2">
            <TextInput
              type="number" inputMode="decimal"
              value={kind === 'sub' ? amount : perMonth}
              onChange={(e) => (kind === 'sub' ? setAmount : setPerMonth)(e.target.value)}
              placeholder="0.00" className="flex-1"
            />
            <div className="w-[92px] shrink-0">
              <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {[...new Set([dflt, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectInput>
            </div>
          </div>
        </Field>
      </div>

      <div className="flex gap-3">
        <Field label="Category">
          <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
            {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectInput>
        </Field>
        {kind === 'sub' ? (
          <Field label="Frequency">
            <SelectInput value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringPayment['frequency'])}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{cap(f)}</option>)}
            </SelectInput>
          </Field>
        ) : (
          <Field label="Payments"><TextInput type="number" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 12" /></Field>
        )}
      </div>

      {kind === 'sub' ? (
        <Field label="Next payment"><TextInput value={date} onChange={(e) => setDate(e.target.value)} placeholder="DD.MM.YYYY" /></Field>
      ) : (
        <div className="flex gap-3">
          <Field label="Start date"><TextInput value={date} onChange={(e) => setDate(e.target.value)} placeholder="DD.MM.YYYY" /></Field>
          <Field label="Payments made"><TextInput type="number" inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" /></Field>
        </div>
      )}
    </Modal>
  );
}
