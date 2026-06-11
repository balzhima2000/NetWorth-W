import { useState } from 'react';
import { Card, Button, Modal, Field, TextInput, cn } from '../../components/william';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { CARD_COLORS } from '../../utils/constants';
import type { SpendingCategory } from '../../types/index';
import { AccountSubPage } from './AccountSubPage';

const EMOJIS = ['🍕','🍔','🛒','👕','🏠','⚡','🚗','✈️','💊','🏋️','🎮','🎬','📚','💰','💳','📈','🏦','💸','🎁','❤️','🎓','🐶','☕','🍺','🌿','🔧','💼','⭐'];

export function CategoriesPage({ kind }: { kind: 'expense' | 'income' }) {
  const store = useCategoriesStore();
  const list = kind === 'expense' ? store.categories : store.incomeCategories;
  const add = kind === 'expense' ? store.addCategory : store.addIncomeCategory;
  const update = kind === 'expense' ? store.updateCategory : store.updateIncomeCategory;
  const del = kind === 'expense' ? store.deleteCategory : store.deleteIncomeCategory;

  const [editing, setEditing] = useState<SpendingCategory | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍕');
  const [color, setColor] = useState(CARD_COLORS[0]);

  const openAdd = () => { setEditing(null); setName(''); setEmoji('🍕'); setColor(CARD_COLORS[0]); setOpen(true); };
  const openEdit = (c: SpendingCategory) => { setEditing(c); setName(c.name); setEmoji(c.emoji); setColor(c.color); setOpen(true); };
  const save = () => {
    if (!name.trim()) return;
    if (editing) update(editing.id, { name: name.trim(), emoji, color });
    else add({ id: crypto.randomUUID(), name: name.trim(), emoji, color, isDefault: false });
    setOpen(false);
  };

  const title = kind === 'expense' ? 'Expense categories' : 'Income categories';
  return (
    <AccountSubPage title={title} subtitle="Used to tag your transactions.">
      <Card className="flex flex-col p-0 overflow-hidden">
        {list.map((c, i) => (
          <div key={c.id} className={cn('flex items-center justify-between px-5 py-3.5', i < list.length - 1 && 'border-b border-line')}>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[16px]" style={{ background: c.color + '22' }}>{c.emoji}</span>
              <span className="text-[15px] font-medium text-ink">{c.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="xs" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
              {!c.isDefault && <Button size="xs" variant="ghost" onClick={() => del(c.id)}>Delete</Button>}
            </div>
          </div>
        ))}
      </Card>
      <Button size="s" pill variant="secondary" className="w-fit" onClick={openAdd}>+ Add category</Button>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit category' : 'Add category'} footer={
        <>
          <Button pill size="l" variant="secondary" className="flex-1 md:flex-none md:ml-auto" onClick={() => setOpen(false)}>Cancel</Button>
          <Button pill size="l" variant="primary" className="flex-1 md:flex-none" disabled={!name.trim()} onClick={save}>{editing ? 'Save' : 'Add'}</Button>
        </>
      }>
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries" autoFocus /></Field>
        <Field label="Emoji">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)} className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-[18px]', emoji === e ? 'bg-accent-bg ring-2 ring-ink' : 'bg-sunken')}>{e}</button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {CARD_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn('h-7 w-7 rounded-full', color === c && 'ring-2 ring-ink ring-offset-2 ring-offset-surface')} style={{ background: c }} />
            ))}
          </div>
        </Field>
      </Modal>
    </AccountSubPage>
  );
}

export function ExpenseCategories() { return <CategoriesPage kind="expense" />; }
export function IncomeCategories() { return <CategoriesPage kind="income" />; }
