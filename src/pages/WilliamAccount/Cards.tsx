import { useState } from 'react';
import { Card, Button, Modal, Field, TextInput, cn } from '../../components/william';
import { useCardsStore } from '../../stores/cardsStore';
import { CARD_COLORS } from '../../utils/constants';
import type { Card as TCard } from '../../types/index';
import { AccountSubPage } from './AccountSubPage';

export default function Cards() {
  const cards = useCardsStore((s) => s.cards);
  const addCard = useCardsStore((s) => s.addCard);
  const updateCard = useCardsStore((s) => s.updateCard);
  const deleteCard = useCardsStore((s) => s.deleteCard);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TCard | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CARD_COLORS[0]);

  const openAdd = () => { setEditing(null); setName(''); setColor(CARD_COLORS[0]); setOpen(true); };
  const openEdit = (c: TCard) => { setEditing(c); setName(c.name); setColor(c.color); setOpen(true); };
  const save = () => {
    if (!name.trim()) return;
    if (editing) updateCard(editing.id, { name: name.trim(), color });
    else addCard({ id: crypto.randomUUID(), name: name.trim(), color, isActive: true });
    setOpen(false);
  };

  return (
    <AccountSubPage title="Payment cards" subtitle="Cards and accounts you pay expenses from.">
      {cards.length === 0 ? (
        <Card className="p-6 text-[14px] text-secondary">No cards yet.</Card>
      ) : (
        <Card className="flex flex-col p-0 overflow-hidden">
          {cards.map((c, i) => (
            <div key={c.id} className={cn('flex items-center justify-between px-5 py-3.5', i < cards.length - 1 && 'border-b border-line')}>
              <div className="flex items-center gap-3">
                <span className="h-4 w-6 rounded" style={{ background: c.color }} />
                <span className={cn('text-[15px] font-medium', c.isActive ? 'text-ink' : 'text-muted line-through')}>{c.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="xs" variant="ghost" onClick={() => updateCard(c.id, { isActive: !c.isActive })}>{c.isActive ? 'Hide' : 'Show'}</Button>
                <Button size="xs" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
                <Button size="xs" variant="ghost" onClick={() => deleteCard(c.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </Card>
      )}
      <Button size="s" pill variant="tonal" className="w-fit" onClick={openAdd}>+ Add card</Button>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit card' : 'Add card'} footer={
        <>
          <Button pill size="l" variant="tonal" className="flex-1 md:flex-none md:ml-auto" onClick={() => setOpen(false)}>Cancel</Button>
          <Button pill size="l" variant="primary" className="flex-1 md:flex-none" disabled={!name.trim()} onClick={save}>{editing ? 'Save' : 'Add'}</Button>
        </>
      }>
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Visa ••4242" autoFocus /></Field>
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
