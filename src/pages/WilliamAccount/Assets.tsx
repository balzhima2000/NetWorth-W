import { useState } from 'react';
import { Card, Button, Modal, Field, TextInput, SelectInput, SegmentToggle, cn } from '../../components/william';
import { useNetWorthStore } from '../../stores/networthStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { MANUAL_ASSET_CATEGORIES, MANUAL_LIABILITY_CATEGORIES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import type { ManualEntry } from '../../types/index';
import { AccountSubPage } from './AccountSubPage';

export default function Assets() {
  const entries = useNetWorthStore((s) => s.manualEntries);
  const add = useNetWorthStore((s) => s.addManualEntry);
  const update = useNetWorthStore((s) => s.updateManualEntry);
  const del = useNetWorthStore((s) => s.deleteManualEntry);
  const currency = useSettingsStore((s) => s.defaultCurrency);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManualEntry | null>(null);
  const [isLiability, setIsLiability] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState(MANUAL_ASSET_CATEGORIES[0].id);

  const cats = isLiability ? MANUAL_LIABILITY_CATEGORIES : MANUAL_ASSET_CATEGORIES;
  const assets = entries.filter((e) => !e.isLiability);
  const liabilities = entries.filter((e) => e.isLiability);

  const openAdd = () => { setEditing(null); setIsLiability(false); setName(''); setValue(''); setCategory(MANUAL_ASSET_CATEGORIES[0].id); setOpen(true); };
  const openEdit = (e: ManualEntry) => { setEditing(e); setIsLiability(e.isLiability); setName(e.name); setValue(String(e.value)); setCategory(e.assetCategory); setOpen(true); };
  const save = () => {
    const v = parseFloat(value);
    if (!name.trim() || isNaN(v)) return;
    if (editing) update(editing.id, { name: name.trim(), value: v, isLiability, assetCategory: category });
    else add({ id: crypto.randomUUID(), name: name.trim(), value: v, isLiability, assetCategory: category, lastUpdated: new Date().toISOString() });
    setOpen(false);
  };

  const Section = ({ label, items }: { label: string; items: ManualEntry[] }) => (
    <div className="flex flex-col gap-2.5">
      <span className="num text-[12px] font-medium uppercase tracking-[0.05em] text-secondary">{label}</span>
      {items.length === 0 ? (
        <Card className="p-5 text-[14px] text-secondary">None yet.</Card>
      ) : (
        <Card className="flex flex-col p-0 overflow-hidden">
          {items.map((e, i) => (
            <div key={e.id} className={cn('flex items-center justify-between px-5 py-3.5', i < items.length - 1 && 'border-b border-line')}>
              <span className="text-[15px] font-medium text-ink">{e.name}</span>
              <div className="flex items-center gap-2">
                <span className={cn('num text-[15px] font-medium', e.isLiability ? 'text-negative' : 'text-ink')}>{formatCurrency(e.value, currency)}</span>
                <Button size="xs" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>
                <Button size="xs" variant="ghost" onClick={() => del(e.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );

  return (
    <AccountSubPage title="Assets & liabilities" subtitle="Manual holdings counted in your net worth.">
      <Section label="Assets" items={assets} />
      <Section label="Liabilities" items={liabilities} />
      <Button size="s" pill variant="secondary" className="w-fit" onClick={openAdd}>+ Add entry</Button>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit entry' : 'Add entry'} footer={
        <>
          <Button pill size="l" variant="secondary" className="flex-1 md:flex-none md:ml-auto" onClick={() => setOpen(false)}>Cancel</Button>
          <Button pill size="l" variant="primary" className="flex-1 md:flex-none" disabled={!name.trim() || !value} onClick={save}>{editing ? 'Save' : 'Add'}</Button>
        </>
      }>
        <Field label="Type">
          <SegmentToggle
            options={[{ value: 'asset', label: 'Asset' }, { value: 'liability', label: 'Liability' }]}
            value={isLiability ? 'liability' : 'asset'}
            onChange={(v) => { const lia = v === 'liability'; setIsLiability(lia); setCategory((lia ? MANUAL_LIABILITY_CATEGORIES : MANUAL_ASSET_CATEGORIES)[0].id); }}
          />
        </Field>
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apartment" autoFocus /></Field>
        <Field label="Value"><TextInput value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0" /></Field>
        <Field label="Category">
          <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </SelectInput>
        </Field>
      </Modal>
    </AccountSubPage>
  );
}
