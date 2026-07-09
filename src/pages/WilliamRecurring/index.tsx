/**
 * William Recurring — subscriptions & installment plans.
 * Scoped under .william. Route: /william/spending/recurring
 * Built 1:1 from Figma (Recurring / Desktop 1141:5280 · Mobile 1249:6852).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Icon, FloatingNav, TabBar, BackLink } from '../../components/william';
import { cn } from '../../components/william/cn';
import { useRecurringStore } from '../../stores/recurringStore';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';
import { useRecurringData, type SubRow, type InstallRow } from '../WilliamSpending/useRecurringData';
import { EditRecurringModal, type RecurringEditing } from './EditRecurringModal';

// Split bar: subscriptions = accent, installments = lime (pale light / bright dark).
const BAR_SUBS = 'var(--w-accent)';
const BAR_INST = 'var(--w-alloc-lime)';

const money0 = (n: number, cur: string) => `${getCurrencySymbol(cur)}${Math.round(n).toLocaleString('en-US')}`;
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Row ⋯ menu (Edit / Pause / Delete) ────────────────────────────────────────
function RowMenu({ active, onEdit, onToggle, onDelete }: { active: boolean; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const close = () => { setOpen(false); setConfirming(false); };
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
        className="flex size-7 items-center justify-center rounded-lg text-ink transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <Icon name="more" size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden="true" />
          <div className="absolute right-0 top-[calc(100%+4px)] z-50 flex w-[160px] flex-col gap-0.5 rounded-xl border border-line bg-surface p-1.5">
            {confirming ? (
              <>
                <button type="button" onClick={() => { onDelete(); close(); }} className="rounded-lg px-3 py-2 text-left text-[14px] font-medium text-negative transition-colors hover:bg-negative-bg">
                  Confirm delete
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-3 py-2 text-left text-[14px] text-secondary transition-colors hover:bg-raised">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { onEdit(); close(); }} className="rounded-lg px-3 py-2 text-left text-[14px] text-ink transition-colors hover:bg-raised">
                  Edit
                </button>
                <button type="button" onClick={() => { onToggle(); close(); }} className="rounded-lg px-3 py-2 text-left text-[14px] text-ink transition-colors hover:bg-raised">
                  {active ? 'Pause' : 'Resume'}
                </button>
                <button type="button" onClick={() => setConfirming(true)} className="rounded-lg px-3 py-2 text-left text-[14px] font-medium text-negative transition-colors hover:bg-negative-bg">
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Divider() { return <div className="h-px w-full bg-line" />; }

function SubscriptionRow({ row, currency, onEdit, onToggle, onDelete }: { row: SubRow; currency: string; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className={cn('flex h-14 items-center gap-3.5 py-3', !row.active && 'opacity-50')}>
      <span className="h-8 w-[3px] shrink-0 rounded-lg" style={{ background: row.color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold text-ink">{row.name}</span>
        <span className="truncate text-[13px] text-secondary">{row.category}</span>
      </div>
      <span className="hidden shrink-0 rounded-full bg-sunken px-2 py-[3px] md:block">
        <span className="num-mono text-[10px] uppercase tracking-[0.5px] text-secondary">{row.frequency}</span>
      </span>
      <span className="num-mono hidden w-[70px] shrink-0 text-right text-[13px] text-muted md:block">{shortDate(row.nextDue)}</span>
      <span className="num-mono w-[90px] shrink-0 text-right text-[15px] text-ink">{formatCurrency(row.amount, currency)}</span>
      <RowMenu active={row.active} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
    </div>
  );
}

function InstallmentRow({ row, currency, onEdit, onToggle, onDelete }: { row: InstallRow; currency: string; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className={cn('flex min-h-16 items-center gap-3.5 py-3.5', !row.active && 'opacity-50')}>
      <span className="h-8 w-[3px] shrink-0 rounded-lg" style={{ background: row.color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold text-ink">{row.name}</span>
        <span className="truncate text-[13px] text-secondary">{row.category}&nbsp;&nbsp;·&nbsp;&nbsp;{formatCurrency(row.perMonth, currency)} / mo</span>
      </div>
      <div className="flex w-[160px] shrink-0 flex-col items-end gap-1.5 md:w-[240px]">
        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${row.pct}%` }} />
        </div>
        <span className="num-mono w-full text-right text-[12px] text-secondary">
          {row.paid} of {row.total} paid&nbsp;&nbsp;·&nbsp;&nbsp;{money0(row.leftAmount, currency)} left
        </span>
      </div>
      <RowMenu active={row.active} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WilliamRecurring() {
  const navigate = useNavigate();
  const d = useRecurringData();
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const installmentPlans = useRecurringStore((s) => s.installmentPlans);
  const { updateRecurringPayment, deleteRecurringPayment, updateInstallmentPlan, deleteInstallmentPlan } = useRecurringStore();
  const cur = d.defaultCurrency;

  // One modal handles subscriptions + installment plans (Add shows a toggle).
  const [editing, setEditing] = useState<RecurringEditing>(null);
  const editSubscription = (id: string) => { const p = recurringPayments.find((x) => x.id === id); if (p) setEditing(p); };
  const editInstallment = (id: string) => { const p = installmentPlans.find((x) => x.id === id); if (p) setEditing(p); };

  const subsPct = d.monthlyTotal > 0 ? (d.subsMonthly / d.monthlyTotal) * 100 : 0;
  const instPct = d.monthlyTotal > 0 ? (d.installMonthly / d.monthlyTotal) * 100 : 0;

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />

      <main className="mx-auto flex max-w-[1100px] flex-col gap-[18px] px-4 md:gap-5 md:px-6">
        {/* ── Header ── */}
        <div>
          <BackLink label="Spending" onClick={() => navigate('/william/spending')} className="mb-2" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink md:text-[32px]">Recurring</h1>
              <p className="text-[15px] text-secondary md:text-[18px]">
                {d.activeCount} active&nbsp;&nbsp;·&nbsp;&nbsp;{money0(d.monthlyTotal, cur)} / month
              </p>
            </div>
            <Button pill variant="primary" size="m" className="shrink-0 font-semibold" onClick={() => setEditing('new')}>
              <Icon name="plus" size={16} />
              Add
            </Button>
          </div>
        </div>

        {/* ── Summary ── */}
        <Card className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <p className="num-mono text-[12px] uppercase tracking-[0.6px] text-secondary">Monthly recurring</p>
            <p className="text-[40px] font-bold leading-none text-ink">{formatCurrency(d.monthlyTotal, cur)}</p>
            <p className="text-[15px] text-secondary">{d.activeCount} active&nbsp;&nbsp;·&nbsp;&nbsp;annualized {money0(d.annualized, cur)}</p>
          </div>
          <div className="flex flex-col gap-3 lg:w-[360px]">
            <div className="flex h-3.5 w-full gap-[3px]">
              <div className="rounded-lg" style={{ width: `${subsPct}%`, background: BAR_SUBS }} />
              <div className="rounded-lg" style={{ width: `${instPct}%`, background: BAR_INST }} />
            </div>
            <div className="hidden gap-5 lg:flex">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: BAR_SUBS }} />
                <span className="text-[13px] font-medium text-secondary">Subscriptions</span>
                <span className="text-[13px] font-semibold text-ink">{money0(d.subsMonthly, cur)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: BAR_INST }} />
                <span className="text-[13px] font-medium text-secondary">Installments</span>
                <span className="text-[13px] font-semibold text-ink">{money0(d.installMonthly, cur)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Subscriptions ── */}
        {d.subscriptions.length > 0 && (
          <Card className="flex flex-col gap-1 px-5 pb-3 pt-5">
            <h2 className="pb-1 text-[18px] font-semibold text-ink">Subscriptions</h2>
            {d.subscriptions.map((row, i) => (
              <div key={row.id}>
                {i > 0 && <Divider />}
                <SubscriptionRow
                  row={row} currency={cur}
                  onEdit={() => editSubscription(row.id)}
                  onToggle={() => updateRecurringPayment(row.id, { isActive: !row.active })}
                  onDelete={() => deleteRecurringPayment(row.id)}
                />
              </div>
            ))}
          </Card>
        )}

        {/* ── Installment plans ── */}
        {d.installments.length > 0 && (
          <Card className="flex flex-col gap-1 px-5 pb-3 pt-5">
            <h2 className="pb-1 text-[18px] font-semibold text-ink">Installment plans</h2>
            {d.installments.map((row, i) => (
              <div key={row.id}>
                {i > 0 && <Divider />}
                <InstallmentRow
                  row={row} currency={cur}
                  onEdit={() => editInstallment(row.id)}
                  onToggle={() => updateInstallmentPlan(row.id, { isActive: !row.active })}
                  onDelete={() => deleteInstallmentPlan(row.id)}
                />
              </div>
            ))}
          </Card>
        )}

        {d.isEmpty && (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <Icon name="recurring" size={40} className="text-muted" />
            <p className="text-[15px] text-secondary">No recurring payments or installment plans yet.</p>
            <Button variant="primary" size="l" onClick={() => setEditing('new')}>Add your first</Button>
          </Card>
        )}
      </main>

      {editing !== null && (
        <EditRecurringModal
          key={editing === 'new' ? 'new' : editing.id}
          open
          onClose={() => setEditing(null)}
          editing={editing}
        />
      )}
    </div>
  );
}
