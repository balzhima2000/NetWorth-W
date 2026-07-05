/**
 * Edit / Add Recurring modal — William.
 * Built 1:1 from Figma (Modal / Edit Recurring — Desktop 1176:10240 · Mobile 1194:5966).
 * Fields: Name · Amount(+currency) · Category · Frequency · Next payment.
 * Footer: Delete (edit only) · Cancel · Save.
 */
import { useState } from 'react';
import { Modal, Button, Field, TextInput, SelectInput } from '../../components/william';
import { useRecurringStore } from '../../stores/recurringStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTodayISO } from '../../utils/formatters';
import type { RecurringPayment } from '../../types/index';

const isoToDDMM = (iso: string) => { const [y, m, d] = iso.split('-'); return d && m && y ? `${d}.${m}.${y}` : ''; };
const ddmmToISO = (s: string) => { const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };
const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS'];
const FREQUENCIES: RecurringPayment['frequency'][] = ['weekly', 'monthly', 'yearly'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function EditRecurringModal({ open, onClose, payment }: { open: boolean; onClose: () => void; payment: RecurringPayment | null }) {
  const { addRecurringPayment, updateRecurringPayment, deleteRecurringPayment } = useRecurringStore();
  const expenseCats = useCategoriesStore((s) => s.categories);
  const dflt = useSettingsStore((s) => s.defaultCurrency);
  const isEdit = payment != null;

  const [name, setName] = useState(payment?.name ?? '');
  const [amount, setAmount] = useState(payment != null ? String(payment.amount) : '');
  const [currency, setCurrency] = useState(payment?.currency || dflt);
  const [category, setCategory] = useState(payment?.category ?? expenseCats[0]?.id ?? '');
  const [frequency, setFrequency] = useState<RecurringPayment['frequency']>(payment?.frequency ?? 'monthly');
  const [date, setDate] = useState(isoToDDMM(payment?.nextDueDate ?? getTodayISO()));

  const valid = name.trim() !== '' && parseFloat(amount) > 0 && category !== '';

  const submit = () => {
    if (!valid) return;
    const iso = ddmmToISO(date) ?? getTodayISO();
    const dayOfMonth = Number(iso.split('-')[2]);
    if (isEdit) {
      updateRecurringPayment(payment!.id, {
        name: name.trim(), amount: parseFloat(amount), currency, category, frequency,
        nextDueDate: iso, dayOfMonth: frequency === 'weekly' ? payment!.dayOfMonth : dayOfMonth,
      });
    } else {
      addRecurringPayment({
        id: crypto.randomUUID(), name: name.trim(), amount: parseFloat(amount), currency, category,
        type: 'expense', frequency, dayOfMonth: frequency === 'weekly' ? null : dayOfMonth,
        dayOfWeek: frequency === 'weekly' ? new Date(iso).getDay() : null,
        startDate: iso, endDate: null, isActive: true, notes: '', nextDueDate: iso,
      });
    }
    onClose();
  };

  const remove = () => { if (isEdit) { deleteRecurringPayment(payment!.id); onClose(); } };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit recurring' : 'Add recurring'}
      footer={
        <>
          {isEdit && <Button pill size="l" variant="danger" onClick={remove}>Delete</Button>}
          <div className="ml-auto flex gap-2.5">
            <Button pill size="l" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button pill size="l" variant="primary" disabled={!valid} onClick={submit}>Save</Button>
          </div>
        </>
      }
    >
      <p className="-mt-1 text-[13px] text-secondary">
        {isEdit ? 'Update the details of this recurring payment.' : 'Add a subscription or recurring bill.'}
      </p>
      <div className="flex gap-3">
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix" /></Field>
        <Field label="Amount">
          <div className="flex gap-2">
            <TextInput type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="flex-1" />
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
        <Field label="Frequency">
          <SelectInput value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringPayment['frequency'])}>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{cap(f)}</option>)}
          </SelectInput>
        </Field>
      </div>
      <Field label="Next payment"><TextInput value={date} onChange={(e) => setDate(e.target.value)} placeholder="DD.MM.YYYY" /></Field>
    </Modal>
  );
}
