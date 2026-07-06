import { useState } from 'react';
import { Card, Button, Modal, Field, TextInput, cn } from '../../components/william';
import { useCardsStore } from '../../stores/cardsStore';
import { AccountSubPage } from './AccountSubPage';

export default function IncomeDestinations() {
  const dests = useCardsStore((s) => s.incomeDestinations);
  const add = useCardsStore((s) => s.addIncomeDestination);
  const del = useCardsStore((s) => s.deleteIncomeDestination);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const save = () => {
    if (!name.trim()) return;
    add({ id: crypto.randomUUID(), name: name.trim(), icon: '' });
    setName(''); setOpen(false);
  };

  return (
    <AccountSubPage title="Income destinations" subtitle="Where your income lands (bank, cash, broker…).">
      <Card className="flex flex-col p-0 overflow-hidden">
        {dests.map((d, i) => (
          <div key={d.id} className={cn('flex items-center justify-between px-5 py-3.5', i < dests.length - 1 && 'border-b border-line')}>
            <span className="text-[15px] font-medium text-ink">{d.name}</span>
            {d.id !== 'cash' && <Button size="xs" variant="ghost" onClick={() => del(d.id)}>Delete</Button>}
          </div>
        ))}
      </Card>
      <Button size="s" pill variant="secondary" className="w-fit" onClick={() => setOpen(true)}>+ Add destination</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add destination" footer={
        <>
          <Button pill size="l" variant="secondary" className="flex-1 md:flex-none md:ml-auto" onClick={() => setOpen(false)}>Cancel</Button>
          <Button pill size="l" variant="primary" className="flex-1 md:flex-none" disabled={!name.trim()} onClick={save}>Add</Button>
        </>
      }>
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank Hapoalim" autoFocus /></Field>
      </Modal>
    </AccountSubPage>
  );
}
