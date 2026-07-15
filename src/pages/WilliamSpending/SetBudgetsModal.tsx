/**
 * Set Budgets modal — monthly spend limit per category (William).
 * Wired to budgetStore for the selected month. No dedicated Figma frame yet
 * (the Spending "Set targets" button was previously a bridge) — reuses the
 * Modal + Field patterns; revisit if a design lands.
 */
import { useState } from 'react';
import { Modal, Button, TextInput } from '../../components/william';
import { useBudgetStore } from '../../stores/budgetStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getCurrencySymbol } from '../../utils/formatters';

export function SetBudgetsModal({ open, onClose, month, year }: { open: boolean; onClose: () => void; month: number; year: number }) {
  const budgets = useBudgetStore((s) => s.budgets);
  const { addBudget, updateBudget, deleteBudget } = useBudgetStore();
  const cats = useCategoriesStore((s) => s.categories);
  const cur = useSettingsStore((s) => s.defaultCurrency);
  const sym = getCurrencySymbol(cur);

  const existing = (catId: string) => budgets.find((b) => b.category === catId && b.month === month && b.year === year);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(cats.map((c) => [c.id, existing(c.id) ? String(existing(c.id)!.amount) : ''])));

  const set = (id: string, v: string) => setValues((s) => ({ ...s, [id]: v }));

  const save = () => {
    cats.forEach((c) => {
      const amount = parseFloat(values[c.id]);
      const cur = existing(c.id);
      if (amount > 0) {
        if (cur) updateBudget(cur.id, { amount });
        else addBudget({ id: crypto.randomUUID(), category: c.id, amount, month, year });
      } else if (cur) {
        deleteBudget(cur.id);
      }
    });
    onClose();
  };

  const clearAll = () => setValues(Object.fromEntries(cats.map((c) => [c.id, ''])));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set budgets"
      footer={
        <>
          {/* Desktop: Clear all (left) · Cancel · Save (right) */}
          <div className="hidden w-full items-center gap-2 md:flex">
            <button type="button" onClick={clearAll} className="text-[14px] font-medium text-secondary transition-colors hover:text-ink">Clear all</button>
            <div className="ml-auto flex gap-2">
              <Button pill size="l" variant="tonal" onClick={onClose}>Cancel</Button>
              <Button pill size="l" variant="primary" onClick={save}>Save</Button>
            </div>
          </div>
          {/* Mobile: full-width Save, neutral ghost Clear all stacked below (✕ dismisses) */}
          <div className="flex w-full flex-col gap-1 md:hidden">
            <Button pill size="l" variant="primary" className="w-full" onClick={save}>Save</Button>
            <Button pill size="l" variant="ghost" className="w-full !text-secondary" onClick={clearAll}>Clear all</Button>
          </div>
        </>
      }
    >
      <p className="-mt-1 text-[13px] text-secondary">
        Set a monthly spend limit per category — we’ll track your progress against it.
      </p>
      <div className="flex flex-col gap-2">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-6 w-[3px] shrink-0 rounded-full" style={{ background: c.color }} />
              <span className="truncate text-[15px] font-medium text-ink">{c.name}</span>
            </div>
            <div className="relative w-[120px] shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 num-mono text-[14px] text-muted">{sym}</span>
              <TextInput
                type="number" inputMode="decimal" value={values[c.id] ?? ''}
                onChange={(e) => set(c.id, e.target.value)} placeholder="0"
                className="num-mono pl-6 text-right"
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
