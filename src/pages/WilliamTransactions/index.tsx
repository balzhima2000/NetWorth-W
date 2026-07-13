/**
 * William All Transactions — the full month-filtered transaction list.
 * Scoped under .william. Route: /william/spending/transactions
 *
 * NOTE: the dedicated Figma frame (old 629:2786) was removed in the file
 * reorganization, so this is composed from the documented William patterns —
 * the month-filtered "…for <month>" header + the Spending "Recent" row +
 * plain-text date-group headers — rather than a 1:1 frame. Revisit when a
 * Trans­actions frame lands in the design file.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Icon, SegmentToggle, FloatingNav, TabBar, BackLink } from '../../components/william';
import { cn } from '../../components/william/cn';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency } from '../../utils/formatters';
import { MonthPicker } from '../WilliamSpending/index';
import { AddTransactionModal } from '../WilliamPortfolio/modals';
import type { Transaction } from '../../types/index';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Normalise any stored date (plain `YYYY-MM-DD` or a full ISO timestamp) to a
// local calendar-day key. Transactions saved via the modal store `YYYY-MM-DD`,
// but seeded/recurring-generated ones carry a full ISO datetime — both must
// group and label by the same local day.
const dayKey = (raw: string) => localDate(new Date(raw));

// "TODAY · JUN 14" / "YESTERDAY · JUN 13" / "JUN 12" — plain mono uppercase, no fill.
function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const monDD = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  const today = localDate(new Date());
  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  if (iso === today) return `TODAY · ${monDD}`;
  if (iso === localDate(yd)) return `YESTERDAY · ${monDD}`;
  return monDD;
}

function TxRow({ tx, name, category, color, currency, divider }: { tx: Transaction; name: string; category: string; color: string; currency: string; divider: boolean }) {
  const isExpense = tx.type === 'expense';
  return (
    <>
      {divider && <div className="mx-3 h-px bg-line md:mx-4" />}
      <div className="flex items-center gap-3 px-3 py-3 md:px-4">
        <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: color }} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold text-ink">{name}</span>
          <span className="truncate text-[13px] text-secondary">{category}</span>
        </div>
        <span className={cn('num-mono shrink-0 text-right text-[15px] font-medium', isExpense ? 'text-negative' : 'text-positive')}>
          {isExpense ? '−' : '+'}{formatCurrency(tx.convertedAmount, currency)}
        </span>
      </div>
    </>
  );
}

export default function WilliamTransactions() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [addOpen, setAddOpen] = useState(false);

  const transactions = useTransactionStore((s) => s.transactions);
  const expenseCats = useCategoriesStore((s) => s.categories);
  const incomeCats = useCategoriesStore((s) => s.incomeCategories);
  const cur = useSettingsStore((s) => s.defaultCurrency);

  const { groups, count, net } = useMemo(() => {
    const catInfo = (id: string) => {
      const c = expenseCats.find((x) => x.id === id) ?? incomeCats.find((x) => x.id === id);
      return { name: c?.name ?? id, color: c?.color ?? '#737373' };
    };
    const inMonth = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year && (filter === 'all' || t.type === filter);
    });
    const sorted = [...inMonth].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    // group consecutive by date (already sorted desc)
    const g: { key: string; label: string; rows: { tx: Transaction; name: string; category: string; color: string }[] }[] = [];
    sorted.forEach((tx) => {
      const info = catInfo(tx.category);
      const row = { tx, name: tx.notes?.trim() || info.name, category: info.name, color: info.color };
      const key = dayKey(tx.date);
      const last = g[g.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else g.push({ key, label: dateLabel(key), rows: [row] });
    });
    const net = inMonth.reduce((s, t) => s + (t.type === 'income' ? t.convertedAmount : -t.convertedAmount), 0);
    return { groups: g, count: inMonth.length, net };
  }, [transactions, expenseCats, incomeCats, month, year, filter]);

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />

      <main className="mx-auto flex max-w-[760px] flex-col gap-[18px] px-4 md:gap-5 md:px-6">
        {/* ── Header ── */}
        <div>
          <BackLink label="Spending" onClick={() => navigate('/william/spending')} className="mb-2" />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3.5">
              <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink md:text-[32px]">Transactions for</h1>
              <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
            </div>
            <Button pill variant="primary" size="m" className="shrink-0 self-start font-semibold md:self-auto" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={16} />
              Add
            </Button>
          </div>
        </div>

        {/* ── Filter + summary ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-[280px]">
            <SegmentToggle
              options={[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]}
              value={filter}
              onChange={(v) => setFilter(v as 'all' | 'expense' | 'income')}
            />
          </div>
          <p className="text-[14px] text-secondary">
            {count} transaction{count !== 1 ? 's' : ''}
            {count > 0 && (
              <>
                {' · '}
                <span className={cn('num-mono font-medium', net < 0 ? 'text-negative' : net > 0 ? 'text-positive' : 'text-ink')}>
                  {net > 0 ? '+' : net < 0 ? '−' : ''}{formatCurrency(Math.abs(net), cur)}
                </span>
                {' net'}
              </>
            )}
          </p>
        </div>

        {/* ── Date-grouped list ── */}
        {groups.length > 0 ? (
          groups.map((g) => (
            <section key={g.key} className="flex flex-col gap-2">
              <h2 className="num-mono px-1 text-[12px] uppercase tracking-[0.6px] text-muted">{g.label}</h2>
              <Card className="flex flex-col py-1">
                {g.rows.map((r, i) => (
                  <TxRow key={r.tx.id} tx={r.tx} name={r.name} category={r.category} color={r.color} currency={cur} divider={i > 0} />
                ))}
              </Card>
            </section>
          ))
        ) : (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <Icon name="spending" size={40} className="text-muted" />
            <p className="text-[15px] text-secondary">No transactions for this month.</p>
            <Button variant="primary" size="l" onClick={() => setAddOpen(true)}>Add a transaction</Button>
          </Card>
        )}
      </main>

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} initialType="expense" />
    </div>
  );
}
