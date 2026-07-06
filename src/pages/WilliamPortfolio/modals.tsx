/**
 * William Portfolio modals — Add Trade, Add Transaction (income/expense), Set Targets.
 * Wired to the real stores. Field/Modal primitives from components/william.
 */
import { useState } from 'react';
import { Modal, Button, Field, TextInput, Textarea, SelectInput, SegmentToggle } from '../../components/william';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAllocationStore } from '../../stores/allocationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useCardsStore } from '../../stores/cardsStore';
import { getTodayISO } from '../../utils/formatters';
import { cn } from '../../components/william/cn';
import type { CurrentHolding } from '../../types/index';

const isoToDDMM = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };
const ddmmToISO = (s: string) => { const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };
const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS'];

function rate(currency: string, dflt: string, rates: { currency: string; rateToDefault: number }[]) {
  return currency === dflt ? 1 : (rates.find((r) => r.currency === currency)?.rateToDefault ?? 1);
}

// ── Add Trade ───────────────────────────────────────────────────────────────────
export function AddTradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addTrade = usePortfolioStore((s) => s.addTrade);
  const dflt = useSettingsStore((s) => s.defaultCurrency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  const [type, setType] = useState('buy');
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [market, setMarket] = useState('global');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState(dflt);
  const [date, setDate] = useState(isoToDDMM(getTodayISO()));
  const [category, setCategory] = useState<CurrentHolding['assetCategory']>('stocks');
  const [notes, setNotes] = useState('');

  const valid = ticker.trim() !== '' && parseFloat(qty) > 0 && parseFloat(price) > 0;
  const setMkt = (m: string) => { setMarket(m); setCurrency(m === 'tase' ? 'ILS' : dflt); };

  const submit = () => {
    if (!valid) return;
    const iso = ddmmToISO(date) ?? getTodayISO();
    const px = parseFloat(price);
    const tk = ticker.trim().toUpperCase();
    addTrade({
      id: crypto.randomUUID(), ticker: tk, name: name.trim() || tk, quantity: parseFloat(qty),
      buyPrice: type === 'buy' ? px : 0, buyDate: type === 'buy' ? iso : getTodayISO(),
      sellPrice: type === 'sell' ? px : null, sellDate: type === 'sell' ? iso : null,
      notes, assetCategory: category, market: market as 'global' | 'tase', currency,
      buyRateToDefault: rate(currency, dflt, rates),
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add trade" footer={
      <>
        <Button pill size="l" variant="secondary" className="flex-1 md:flex-none md:ml-auto" onClick={onClose}>Cancel</Button>
        <Button pill size="l" variant="primary" className="flex-1 md:flex-none" disabled={!valid} onClick={submit}>Add trade</Button>
      </>
    }>
      <SegmentToggle options={[{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]} value={type} onChange={setType} />
      <div className="flex gap-3">
        <Field label="Ticker"><TextInput value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="e.g. AAPL" /></Field>
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple Inc." /></Field>
      </div>
      <SegmentToggle options={[{ value: 'global', label: 'Global' }, { value: 'tase', label: 'TASE' }]} value={market} onChange={setMkt} />
      <div className="flex gap-3">
        <Field label="Quantity"><TextInput type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></Field>
        <Field label="Price">
          <div className="flex gap-2">
            <TextInput type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="flex-1" />
            <div className="w-[92px] shrink-0">
              <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {[...new Set([dflt, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectInput>
            </div>
          </div>
        </Field>
      </div>
      <Field label="Date"><TextInput value={date} onChange={(e) => setDate(e.target.value)} placeholder="DD.MM.YYYY" /></Field>
      <Field label="Asset category">
        <SelectInput value={category} onChange={(e) => setCategory(e.target.value as CurrentHolding['assetCategory'])}>
          <option value="stocks">Stocks</option><option value="bonds">Bonds</option><option value="crypto">Crypto</option><option value="other">Other</option>
        </SelectInput>
      </Field>
      <Field label="Notes (optional)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note…" /></Field>
    </Modal>
  );
}

// ── Add Transaction (income / expense) ────────────────────────────────────────────
export function AddTransactionModal({ open, onClose, initialType }: { open: boolean; onClose: () => void; initialType: 'income' | 'expense' }) {
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const dflt = useSettingsStore((s) => s.defaultCurrency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  const expenseCats = useCategoriesStore((s) => s.categories);
  const incomeCats = useCategoriesStore((s) => s.incomeCategories);
  const cards = useCardsStore((s) => s.cards).filter((c) => c.isActive);
  const destinations = useCardsStore((s) => s.incomeDestinations);

  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(dflt);
  const cats = type === 'expense' ? expenseCats : incomeCats;
  const [category, setCategory] = useState(cats[0]?.name ?? '');
  const [date, setDate] = useState(isoToDDMM(getTodayISO()));
  const payOptions = type === 'expense'
    ? [{ value: 'cash', label: 'Cash' }, ...cards.map((c) => ({ value: c.id, label: c.name }))]
    : destinations.map((d) => ({ value: d.id, label: d.name }));
  const [payment, setPayment] = useState(payOptions[0]?.value ?? 'cash');
  const [notes, setNotes] = useState('');

  const switchType = (t: string) => {
    const tt = t as 'income' | 'expense';
    setType(tt);
    const list = tt === 'expense' ? expenseCats : incomeCats;
    setCategory(list[0]?.name ?? '');
    setPayment(tt === 'expense' ? 'cash' : (destinations[0]?.id ?? 'cash'));
  };

  const valid = parseFloat(amount) > 0 && category !== '';
  const submit = () => {
    if (!valid) return;
    const amt = parseFloat(amount);
    addTransaction({
      id: crypto.randomUUID(), amount: amt,
      convertedAmount: currency === dflt ? amt : amt * rate(currency, dflt, rates),
      category, date: ddmmToISO(date) ?? getTodayISO(), notes, type,
      paymentMethod: payment, cardId: payment !== 'cash' && cards.some((c) => c.id === payment) ? payment : null,
      currency, isAutoAdded: false, installmentPlanId: null, installmentNumber: null, installmentTotal: null,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={type === 'income' ? 'Add income' : 'Add expense'} maxWidth={440} footer={
      <>
        <Button pill size="l" variant="secondary" className="flex-1 md:flex-none md:ml-auto" onClick={onClose}>Cancel</Button>
        <Button pill size="l" variant="primary" className="flex-1 md:flex-none" disabled={!valid} onClick={submit}>{type === 'income' ? 'Add income' : 'Add expense'}</Button>
      </>
    }>
      <SegmentToggle options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} value={type} onChange={switchType} />
      <Field label="Amount">
        <div className="flex gap-2">
          <TextInput
            type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className={cn('flex-1 num !text-[18px] font-semibold', type === 'expense' ? '!text-negative' : '!text-positive')}
          />
          <div className="w-[92px] shrink-0">
            <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {[...new Set([dflt, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectInput>
          </div>
        </div>
      </Field>
      <Field label="Category">
        <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
          {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </SelectInput>
      </Field>
      <Field label="Date"><TextInput value={date} onChange={(e) => setDate(e.target.value)} placeholder="DD.MM.YYYY" /></Field>
      <Field label={type === 'expense' ? 'Payment method' : 'Destination'}>
        <SelectInput value={payment} onChange={(e) => setPayment(e.target.value)}>
          {payOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </SelectInput>
      </Field>
      <Field label="Notes (optional)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note…" /></Field>
    </Modal>
  );
}

// ── Set Targets ─────────────────────────────────────────────────────────────────
export function SetTargetsModal({ open, onClose, holdings, totalValue }: { open: boolean; onClose: () => void; holdings: CurrentHolding[]; totalValue: number }) {
  const setAllocation = useAllocationStore((s) => s.setAllocation);
  const savedMode = useAllocationStore((s) => s.mode);
  const savedTargets = useAllocationStore((s) => s.targets);
  const [mode, setMode] = useState(savedMode === 'category' ? 'category' : 'holding');

  // Build the list per mode
  const items = (() => {
    if (mode === 'category') {
      const map: Record<string, number> = {};
      holdings.forEach((h) => { map[h.assetCategory] = (map[h.assetCategory] ?? 0) + h.currentValue; });
      return Object.entries(map).map(([key, val]) => ({ key, label: key[0].toUpperCase() + key.slice(1), now: totalValue ? (val / totalValue) * 100 : 0 }));
    }
    return holdings.map((h) => ({ key: h.ticker, label: h.ticker, now: h.portfolioPercent }));
  })();

  const [targets, setTargets] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(savedTargets).map(([k, v]) => [k, String(v)])));
  const get = (k: string, fallback: number) => (targets[k] !== undefined ? targets[k] : String(Math.round(fallback)));
  const total = items.reduce((s, it) => s + (parseFloat(get(it.key, it.now)) || 0), 0);
  const balanced = Math.round(total) === 100;

  const save = () => {
    const parsed: Record<string, number> = {};
    items.forEach((it) => { parsed[it.key] = parseFloat(get(it.key, it.now)) || 0; });
    setAllocation({ mode: mode === 'category' ? 'category' : 'individual', targets: parsed });
    onClose();
  };
  const turnOff = () => { setAllocation({ mode: 'none', targets: {} }); onClose(); };

  return (
    <Modal open={open} onClose={onClose} title="Set allocation targets" footer={
      <>
        {/* Desktop: Turn off (left) · Cancel · Save (right) */}
        <div className="hidden w-full items-center gap-2.5 md:flex">
          <button type="button" onClick={turnOff} className="text-[14px] font-medium text-secondary hover:text-ink">Turn off targets</button>
          <div className="ml-auto flex gap-2.5">
            <Button pill size="l" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button pill size="l" variant="primary" onClick={save}>Save targets</Button>
          </div>
        </div>
        {/* Mobile: full-width Save, neutral ghost Turn off below (✕ dismisses) */}
        <div className="flex w-full flex-col gap-1 md:hidden">
          <Button pill size="l" variant="primary" className="w-full" onClick={save}>Save targets</Button>
          <Button pill size="l" variant="ghost" className="w-full !text-secondary" onClick={turnOff}>Turn off targets</Button>
        </div>
      </>
    }>
      <p className="text-[13px] text-secondary">Set a target weight per holding — we’ll flag drift on your allocation bar.</p>
      <SegmentToggle options={[{ value: 'category', label: 'By category' }, { value: 'holding', label: 'By holding' }]} value={mode} onChange={(m) => { setMode(m); setTargets({}); }} />
      <div className="flex flex-col gap-2.5">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-medium text-ink">{it.label}</span>
              <span className="text-[12px] font-medium text-secondary">Now {it.now.toFixed(0)}%</span>
            </div>
            <div className="relative w-[88px]">
              <TextInput type="number" inputMode="decimal" value={get(it.key, it.now)} onChange={(e) => setTargets((t) => ({ ...t, [it.key]: e.target.value }))} className="num pr-7 text-right" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-secondary">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-[14px] font-medium text-ink">Total allocated</span>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', balanced ? 'bg-positive-bg text-positive' : 'bg-sunken text-secondary')}>
            {balanced ? 'Balanced' : `${total.toFixed(0)}%`}
          </span>
          <span className="num text-[15px] font-medium text-ink">{total.toFixed(0)}%</span>
        </div>
      </div>
    </Modal>
  );
}
