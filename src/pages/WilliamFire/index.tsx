/**
 * William FIRE — redesigned implementation, matched to Figma "FIRE / Desktop" (1080:4428)
 * and "FIRE / Mobile" (1103:4639). Scoped under .william. Route: /william/fire
 *
 * One path to financial independence — not four separate calculators:
 *  - FIRE Progress card (headline % + next milestone + key stats)
 *  - Projection card (net-worth growth vs. coast, to the FI number)
 *  - Milestones ladder (Coast / Lean / FIRE / Fat on one value axis)
 *  - Assumptions grid + Edit modal (the inputs behind the FI number)
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, Button, Icon, FloatingNav, TabBar, RangeSelector, Modal, Field, TextInput } from '../../components/william';
import { cn } from '../../components/william/cn';
import { getCurrencySymbol } from '../../utils/formatters';
import { useSettingsStore } from '../../stores/settingsStore';
import { FireProjectionChart } from './FireProjectionChart';
import { useFireData, type FireRange, type Milestone } from './useFireData';

const RANGES: FireRange[] = ['5Y', '10Y', '20Y', '30Y', 'FI'];

// Desktop shows the range selector; mobile has none and defaults to the full
// path-to-FI view (matches the Figma mobile projection card).
function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

// Compact money matched to the Figma labels ($310k · $1.25M).
function short(v: number, currency: string) {
  const sym = getCurrencySymbol(currency);
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sym}${(v / 1e6).toFixed(2).replace(/0$/, '')}M`;
  if (a >= 1_000) return `${sym}${Math.round(v / 1000)}k`;
  return `${sym}${Math.round(v)}`;
}

// Whole-dollar currency (no cents) — matches the Figma figures ($50,000, $1,250,000).
function money0(v: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${getCurrencySymbol(currency)}${Math.round(v).toLocaleString('en-US')}`;
  }
}

// ── Info tooltip — matches the Figma Tooltip component (beak + placement) ──
// Auto-placed above/below the trigger, centered, clamped to the viewport; the
// beak stays aligned to the trigger. Same behavior on desktop and mobile.
const TIP_WIDTH = 300;
const TIP_GAP = 8;      // trigger ↔ tooltip
const TIP_MARGIN = 12;  // viewport edge

function InfoTip({ title, children }: { title?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom'; beak: number } | null>(null);

  const compute = () => {
    const t = triggerRef.current?.getBoundingClientRect();
    const tip = tipRef.current?.getBoundingClientRect();
    if (!t || !tip) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const spaceBelow = vh - t.bottom;
    const placement: 'top' | 'bottom' =
      spaceBelow < tip.height + TIP_GAP + TIP_MARGIN && t.top > tip.height + TIP_GAP + TIP_MARGIN ? 'top' : 'bottom';
    const cx = t.left + t.width / 2;
    const left = Math.max(TIP_MARGIN, Math.min(cx - tip.width / 2, vw - tip.width - TIP_MARGIN));
    const top = placement === 'bottom' ? t.bottom + TIP_GAP : t.top - tip.height - TIP_GAP;
    const beak = Math.max(16, Math.min(cx - left, tip.width - 16)); // beak x within tooltip
    setPos({ top, left, placement, beak });
  };

  useLayoutEffect(() => { if (open) compute(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const on = () => compute();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); };
  }, [open]);

  return (
    <span className="inline-flex align-middle">
      <button
        ref={triggerRef}
        type="button"
        aria-label={title ?? 'More information'}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none"
      >
        <Icon name="info" size={14} />
      </button>
      {open && (
        <div
          ref={tipRef}
          role="tooltip"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: TIP_WIDTH, opacity: pos ? 1 : 0 }}
          className="pointer-events-none z-[60] flex flex-col gap-[5px] rounded-2xl border border-line bg-surface p-4 text-left shadow-[0_12px_32px_-8px_rgba(0,0,0,0.22)]"
        >
          {/* beak — a rotated square straddling the edge facing the trigger */}
          <span
            aria-hidden="true"
            style={{ left: pos?.beak ?? 0 }}
            className={cn(
              'absolute h-3 w-3 -translate-x-1/2 rotate-45 border-line bg-surface',
              pos?.placement === 'top' ? '-bottom-1.5 border-b border-r' : '-top-1.5 border-l border-t',
            )}
          />
          {title && <span className="text-[15px] font-semibold leading-[1.4] tracking-[-0.01em] text-ink">{title}</span>}
          <span className="text-[14px] leading-[1.4] text-secondary">{children}</span>
        </div>
      )}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-3.5 w-full overflow-hidden rounded-full bg-raised">
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(Math.min(pct, 100), 0)}%` }} />
    </div>
  );
}

// ── Edit Assumptions modal ──────────────────────────────────────────────────
function EditAssumptionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
  const MoneyField = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
    <Field label={label}>
      <div className="relative">
        <TextInput inputMode="numeric" className="pr-[68px]" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit assumptions"
      maxWidth={480}
      footer={
        <>
          <Button variant="secondary" size="l" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="l" className="flex-1" onClick={save}>Save changes</Button>
        </>
      }
    >
      <p className="-mt-1 ty-body text-secondary">These inputs drive your FI number and projected date.</p>
      <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2">
        <MoneyField label="Annual expenses" placeholder="50000" value={expenses} onChange={setExpenses} />
        <MoneyField label="Annual savings" placeholder="30000" value={savings} onChange={setSavings} />
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

// ── Milestones ──────────────────────────────────────────────────────────────
function MilestonesTrack({ milestones, netWorth, max, currency }: { milestones: Milestone[]; netWorth: number; max: number; currency: string }) {
  const youPct = Math.max(Math.min((netWorth / max) * 100, 100), 0);
  // Keep endpoint labels inside the card: right-align the last, left-align the first.
  const alignFor = (pct: number) =>
    pct >= 88 ? '-translate-x-full text-right' : pct <= 12 ? 'translate-x-0 text-left' : '-translate-x-1/2 text-center';
  return (
    <div className="relative hidden px-2 pb-14 pt-8 md:block">
      {/* You marker (above) */}
      <div className={cn('absolute top-0 whitespace-nowrap', alignFor(youPct))} style={{ left: `${youPct}%` }}>
        <span className="num text-[13px] font-medium text-ink">You · {short(netWorth, currency)}</span>
      </div>
      {/* track */}
      <div className="relative h-3 rounded-full bg-raised">
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${youPct}%` }} />
        {/* You dot — sits above the milestone dots so the black marker is never
            hidden by a near-adjacent grey dot (e.g. Coast when You ≈ Coast). */}
        <div
          className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent"
          style={{ left: `${youPct}%` }}
        />
        {/* milestone dots + labels below */}
        {milestones.map((m) => {
          const pct = Math.max(Math.min((m.amount / max) * 100, 100), 0);
          return (
            <div key={m.id} className="absolute top-1/2" style={{ left: `${pct}%` }}>
              <div className={cn('h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full', m.reached ? 'bg-accent' : 'bg-muted')} />
              <div className={cn('absolute top-4 whitespace-nowrap', alignFor(pct))}>
                <p className="text-[15px] font-semibold text-ink">{m.label}</p>
                <p className="num-mono font-medium text-[13px] text-secondary">{short(m.amount, currency)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mobile ladder (Figma 1113:4794): a thick rounded rail with an accent cap at
// the "You" position, value-proportional dots (min-spaced so labels never
// collide) and right-side name + mono amount labels.
function MilestonesLadder({
  milestones, netWorth, progressPct, currency,
}: { milestones: Milestone[]; netWorth: number; progressPct: number; currency: string }) {
  const RAIL_H = 340;
  const MIN_GAP = 62;
  const DOT_Y = 8; // dot centre offset from an item's top (aligns to first line)
  const maxV = Math.max(...milestones.map((m) => m.amount), netWorth);
  const minV = netWorth;

  const items = [
    { id: 'you', you: true, amount: netWorth, name: 'You are here',
      sub: `${money0(netWorth, currency)} · ${Math.round(progressPct)}% there` },
    ...milestones.map((m) => ({
      id: m.id, you: false, amount: m.amount, name: m.label, reached: m.reached,
      sub: `${short(m.amount, currency)}${m.year ? ` · ~${m.year}` : m.reached ? ' · reached' : ''}`,
    })),
  ];

  let prev = -Infinity;
  const positioned = items.map((it) => {
    const frac = maxV > minV ? Math.max(0, (it.amount - minV) / (maxV - minV)) : 0;
    const floor = prev === -Infinity ? 0 : prev + MIN_GAP;
    const y = Math.max(frac * RAIL_H, floor);
    prev = y;
    return { ...it, y };
  });
  const lastY = positioned[positioned.length - 1].y;

  return (
    <div className="relative md:hidden" style={{ height: lastY + 44 }}>
      {/* rail (You → Fat) */}
      <div className="absolute left-1 w-2.5 rounded-full bg-raised" style={{ top: DOT_Y - 5, height: lastY + 10 }} />
      {positioned.map((it) => (
        <div key={it.id} className="absolute left-0 right-0" style={{ top: it.y }}>
          <span
            className={cn(
              'absolute -translate-y-1/2 rounded-full',
              it.you ? 'left-[2px] h-3.5 w-3.5 bg-accent' : 'left-1 h-2.5 w-2.5 bg-muted',
            )}
            style={{ top: DOT_Y }}
          />
          <div className="pl-9">
            {it.you
              ? <p className="ty-label text-muted">You are here</p>
              : <p className="text-[15px] font-semibold text-ink">{it.name}</p>}
            <p className={cn('num-mono font-medium text-[13px]', it.you ? 'text-ink' : 'text-secondary')}>{it.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Assumption tile ───────────────────────────────────────────────────────────
function Tile({ label, value, info }: { label: string; value: string; info?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-sunken p-3.5 md:p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] text-secondary">{label}</span>
        {info}
      </div>
      <span className="num-mono text-[22px] font-medium text-ink md:text-[25px]">{value}</span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onEdit }: { onEdit: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <Icon name="fire" size={40} className="text-muted" />
      <h2 className="ty-h2 text-ink">Plan your path to FIRE</h2>
      <p className="ty-body max-w-sm text-secondary">
        Add your annual expenses, savings and expected return to see your FI number, projection and milestones.
      </p>
      <Button variant="primary" size="l" onClick={onEdit}>Set your assumptions</Button>
    </Card>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function WilliamFire() {
  const [range, setRange] = useState<FireRange>('10Y');
  const [editOpen, setEditOpen] = useState(false);
  const isDesktop = useIsDesktop();
  // Mobile has no range selector — it always shows the full path to FI.
  const d = useFireData(isDesktop ? range : 'FI');
  const cur = d.defaultCurrency;

  const gainPositive = d.gainOverHorizon >= 0;
  const subtitle = !d.hasProfile
    ? 'Plan your path to financial independence'
    : d.reachedFI
      ? `You've reached financial independence at ${short(d.fiNumber, cur)}`
      : d.fireYear
        ? `On track for ${d.fireYear} · financial independence at ${short(d.fiNumber, cur)}`
        : `Financial independence at ${short(d.fiNumber, cur)}`;

  return (
    <div className="william william-fire min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />

      <main className="mx-auto flex max-w-[1100px] flex-col gap-[18px] px-4 md:gap-5 md:px-6">
        {/* Header */}
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-bold leading-none tracking-[-0.02em] text-ink md:text-[40px]">FIRE</h1>
          <p className="ty-body text-secondary">{subtitle}</p>
        </header>

        {!d.hasProfile ? (
          <EmptyState onEdit={() => setEditOpen(true)} />
        ) : (
          <>
            {/* Top row: FIRE Progress + Projection */}
            <div className="grid grid-cols-1 gap-[18px] md:gap-5 lg:grid-cols-[400px_1fr]">
              {/* FIRE Progress */}
              <Card className="flex flex-col p-5">
                <p className="ty-label text-muted">FINANCIAL INDEPENDENCE</p>
                <p className="num mt-3 text-[72px] font-bold leading-none tracking-[-0.03em] text-ink md:text-[80px]">
                  {Math.round(d.progressPct)}%
                </p>
                <p className="mt-2 ty-body text-secondary">of your {short(d.fiNumber, cur)} goal</p>

                <div className="mt-5">
                  <ProgressBar pct={d.progressPct} />
                </div>

                {d.nextMilestone && (
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-sunken px-4 py-3">
                    <span className="ty-body text-secondary">
                      Next · <span className="font-semibold text-ink">{d.nextMilestone.label}</span>
                    </span>
                    <span className="num ty-body text-secondary">
                      {short(d.nextMilestone.amount, cur)}{d.nextMilestone.year ? ` · ~${d.nextMilestone.year}` : ''}
                    </span>
                  </div>
                )}

                <div className="mt-5 h-px w-full bg-line" />

                <dl className="mt-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <dt className="ty-body text-secondary">Current net worth</dt>
                    <dd className="num text-[15px] font-semibold text-ink">{money0(d.netWorth, cur)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 ty-body text-secondary">
                      FI number
                      <InfoTip title="Your FI number">
                        {Math.round(d.expensesMultiple)}× your annual expenses — the portfolio that funds your
                        spending at a {d.withdrawalRate}% withdrawal rate.
                      </InfoTip>
                    </dt>
                    <dd className="num text-[15px] font-semibold text-ink">{money0(d.fiNumber, cur)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="ty-body text-secondary">Projected date</dt>
                    <dd className="num text-[15px] font-semibold text-ink">
                      {d.reachedFI ? 'Reached' : d.fireYear ? `${d.fireYear} · in ${d.fireYear - new Date().getFullYear()} yrs` : '50+ yrs'}
                    </dd>
                  </div>
                </dl>
              </Card>

              {/* Projection */}
              <Card className="flex flex-col gap-3.5 p-5 md:gap-[18px] md:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-ink">Now → {d.horizonYear}</p>
                      <span className="num-mono rounded-full bg-positive-bg px-2 py-0.5 text-[12px] font-medium text-positive">
                        {gainPositive ? '+' : '−'}{short(Math.abs(d.gainOverHorizon), cur)}
                      </span>
                    </div>
                    <p className="ty-body text-muted">projected · {d.expectedReturn}% real return</p>
                  </div>
                  <div className="hidden md:block">
                    <RangeSelector options={RANGES} value={range} onChange={(v) => setRange(v as FireRange)} />
                  </div>
                </div>

                <div className="min-h-[220px] flex-1" role="img" aria-label={`Projected net worth to ${d.horizonYear}`}>
                  <FireProjectionChart data={d.projection} fiNumber={d.fiNumber} currency={cur} />
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-raised px-4 py-3">
                  <span className="text-positive" aria-hidden="true">↑</span>
                  <span className="ty-body text-secondary">
                    At {d.expectedReturn}% real return and {short(d.annualSavings, cur)} saved a year, you reach{' '}
                    {short(d.fiNumber, cur)} {d.fireYear ? `around ${d.fireYear}` : 'eventually'}.
                  </span>
                </div>
              </Card>
            </div>

            {/* Milestones */}
            <Card className="flex flex-col p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="ty-h2 text-ink">Milestones</h2>
                    <InfoTip title="The FIRE ladder">
                      <span className="flex flex-col gap-[5px]">
                        <span><strong className="text-ink">Coast FIRE</strong> — invested enough that growth alone reaches FI by retirement; you can stop saving.</span>
                        <span><strong className="text-ink">Lean FIRE</strong> — covers bare-bones expenses.</span>
                        <span><strong className="text-ink">FIRE</strong> — covers your full expenses ({Math.round(d.expensesMultiple)}× = the {d.withdrawalRate}% rule).</span>
                        <span><strong className="text-ink">Fat FIRE</strong> — full expenses plus a comfortable buffer.</span>
                      </span>
                    </InfoTip>
                  </div>
                  <p className="ty-body text-secondary">One path to financial independence — not four separate calculators.</p>
                </div>
                <p className="hidden shrink-0 ty-body text-secondary md:block">
                  You are {Math.round(d.progressPct)}% of the way to FIRE
                </p>
              </div>

              <MilestonesTrack milestones={d.milestones} netWorth={d.netWorth} max={d.maxMilestone} currency={cur} />
              <div className="mt-6 md:hidden">
                <MilestonesLadder milestones={d.milestones} netWorth={d.netWorth} progressPct={d.progressPct} currency={cur} />
              </div>
            </Card>

            {/* Assumptions */}
            <Card className="flex flex-col p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="ty-h2 text-ink">Assumptions</h2>
                  <p className="ty-body text-secondary">The inputs behind your FIRE number.</p>
                </div>
                <Button variant="secondary" size="s" pill className="font-semibold" onClick={() => setEditOpen(true)}>
                  <Icon name="edit" size={16} />
                  Edit
                </Button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Tile label="Annual expenses" value={money0(d.annualExpenses, cur)} />
                <Tile
                  label="Withdrawal rate"
                  value={`${d.withdrawalRate.toFixed(1)}%`}
                  info={<InfoTip title="Withdrawal rate">The share of your portfolio you withdraw each year. The 4% rule comes from the Trinity Study.</InfoTip>}
                />
                <Tile
                  label="Expected return · real"
                  value={`${d.expectedReturn.toFixed(1)}%`}
                  info={<InfoTip title="Expected return">Real return after inflation. The historic stock-market average is roughly 7%.</InfoTip>}
                />
                <Tile label="Annual savings" value={money0(d.annualSavings, cur)} />
                <Tile label="Current age" value={d.currentAge != null ? String(d.currentAge) : '—'} />
                <Tile
                  label="Target FI age"
                  value={d.targetAge != null && d.targetYear ? `${d.targetAge} · ${d.targetYear}` : d.targetAge != null ? String(d.targetAge) : d.fireYear ? String(d.fireYear) : '—'}
                />
              </div>
            </Card>
          </>
        )}
      </main>

      <EditAssumptionsModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
