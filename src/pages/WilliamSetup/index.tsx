/**
 * William Setup — the lean 3-step onboarding (Name → Portfolio → Done).
 * Redesign of the classic 9-step /setup; runs in parallel at /william/setup.
 * The deferred tasks (cards, FIRE, sync, import) live on the dashboard as
 * "Finish setting up" cards. Input is held locally and committed once on finish.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, TextInput, SelectInput, Modal, cn } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useRestoreBackup } from '../../hooks/useRestoreBackup';
import { CURRENCIES } from '../../utils/constants';
import { getCurrencySymbol, formatCurrency } from '../../utils/formatters';

/** Best-effort currency from the device region; falls back to the stored default. */
function guessCurrencyFromLocale(fallback: string): string {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region ?? '';
    const map: Record<string, string> = {
      IL: 'ILS', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', JP: 'JPY', CN: 'CNY',
      IN: 'INR', BR: 'BRL', MX: 'MXN', KR: 'KRW', SG: 'SGD', HK: 'HKD', CH: 'CHF',
      DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR', AT: 'EUR', PT: 'EUR',
    };
    const code = map[region];
    if (code && CURRENCIES.some((c) => c.code === code)) return code;
  } catch { /* ignore */ }
  return fallback;
}

type Mode = 'simple' | 'detailed' | null;

function OptionCard({ title, desc, selected, onClick }: { title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col gap-1 rounded-2xl bg-surface p-4 text-left transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        selected ? 'shadow-[inset_0_0_0_1.5px_var(--w-accent)]' : 'shadow-[inset_0_0_0_1px_var(--w-line)] hover:shadow-[inset_0_0_0_1px_var(--w-muted)]',
      )}
    >
      <span className="text-[15px] font-semibold text-ink">{title}</span>
      <span className="text-[13px] leading-snug text-secondary">{desc}</span>
    </button>
  );
}

export default function WilliamSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(() => useSettingsStore.getState().userName || '');
  const [currency, setCurrency] = useState(() => guessCurrencyFromLocale(useSettingsStore.getState().defaultCurrency || 'ILS'));
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [simpleValue, setSimpleValue] = useState('');
  const restore = useRestoreBackup();
  const backupInputRef = useRef<HTMLInputElement>(null);

  const numericValue = parseFloat(simpleValue.replace(/[^0-9.]/g, '')) || 0;

  // Restore-from-backup during onboarding: apply the backup, keep whatever name
  // was already typed, and complete setup straight to the dashboard.
  const onBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) restore.parseFile(file);
    e.target.value = '';
  };
  const confirmRestore = () => restore.confirm(() => {
    const s = useSettingsStore.getState();
    if (name.trim()) { s.setUserName(name.trim()); s.setUserNickname(name.trim().split(' ')[0] || name.trim()); }
    s.setDefaultCurrency(currency);
    s.setHasCompletedSetup(true);
    navigate('/william/dashboard');
  });

  const finish = () => {
    const s = useSettingsStore.getState();
    s.setUserName(name.trim());
    s.setUserNickname(name.trim().split(' ')[0] || name.trim());
    s.setDefaultCurrency(currency);
    if (mode) s.setPortfolioMode(mode);
    if (mode === 'simple' && numericValue > 0) {
      const nw = useNetWorthStore.getState();
      const existing = nw.manualEntries.find((e) => e.name === 'Portfolio (Setup)');
      if (existing) nw.updateManualEntry(existing.id, { value: numericValue });
      else nw.addManualEntry({ id: crypto.randomUUID(), name: 'Portfolio (Setup)', value: numericValue, isLiability: false, assetCategory: 'other', lastUpdated: new Date().toISOString() });
    }
    s.setHasCompletedSetup(true);
    navigate('/william/dashboard');
  };

  const Progress = ({ n }: { n: number }) => (
    <div className="flex flex-col gap-2.5">
      <span className="ty-label text-muted">Step {n} of 3</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${(n / 3) * 100}%` }} />
      </div>
    </div>
  );

  return (
    <div className="william flex min-h-screen flex-col bg-canvas">
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-7 px-5 py-12">
        {step === 1 && (
          <>
            <Progress n={1} />
            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink">What's your name?</h1>
              <p className="ty-body text-secondary">Takes about a minute — you can change anything later.</p>
            </div>
            <div className="flex flex-col gap-5">
              <Field label="Your name">
                <TextInput tone="surface" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eitan Cohen" autoFocus />
              </Field>
              {!editingCurrency ? (
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-secondary">
                    Currency · <span className="font-medium text-ink">{getCurrencySymbol(currency)} {currency}</span>
                  </span>
                  <button type="button" onClick={() => setEditingCurrency(true)} className="text-[14px] font-medium text-accent hover:underline">Change</button>
                </div>
              ) : (
                <Field label="Currency">
                  <SelectInput tone="surface" value={currency} onChange={(e) => setCurrency(e.target.value)} autoFocus>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                  </SelectInput>
                </Field>
              )}
            </div>
            <div className="flex flex-col items-center gap-3.5">
              <Button size="l" className="w-full" onClick={() => setStep(2)} disabled={!name.trim()}>Continue</Button>
              <p className="text-center text-[13px] text-muted">Your data stays on this device unless you turn on sync.</p>
              <button type="button" onClick={() => backupInputRef.current?.click()} className="text-[13px] font-medium text-secondary transition-colors hover:text-ink">Restore from a backup instead</button>
              <input ref={backupInputRef} type="file" accept="application/json" className="hidden" onChange={onBackupFile} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Progress n={2} />
            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink">How would you like to set up your portfolio?</h1>
              <p className="ty-body text-secondary">You can switch anytime.</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <OptionCard title="Simple" desc="One total number. Fastest to start." selected={mode === 'simple'} onClick={() => setMode('simple')} />
                <OptionCard title="Detailed" desc="Track each holding with live prices." selected={mode === 'detailed'} onClick={() => setMode('detailed')} />
              </div>
              {/* Reactive body — animated height reveal (grid-rows 0fr → 1fr). */}
              <div className={cn('grid transition-all duration-300 ease-out', mode ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                <div className="overflow-hidden">
                  <div className="pt-1">
                    {mode === 'simple' && (
                      <Field label="Current portfolio value">
                        <TextInput tone="surface" value={simpleValue} onChange={(e) => setSimpleValue(e.target.value)} inputMode="numeric" placeholder="50,000" />
                      </Field>
                    )}
                    {mode === 'detailed' && (
                      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-line bg-surface px-5 py-7 text-center">
                        <p className="text-[15px] font-semibold text-ink">Import from your broker (.xlsx)</p>
                        <p className="text-[13px] text-secondary">or add holdings manually later</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="l" variant="tonal" onClick={() => setStep(1)}>Back</Button>
              <Button size="l" className="flex-1" onClick={() => setStep(3)} disabled={!mode}>Continue</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col gap-2">
              <span className="ty-label text-positive">Setup complete</span>
              <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.01em] text-ink">You're all set</h1>
              <p className="ty-body text-secondary">Here's your starting point — tweak anything from Settings.</p>
            </div>
            <div className="flex flex-col rounded-2xl bg-surface px-5">
              {[
                ['Name', name.trim() || '—'],
                ['Currency', `${getCurrencySymbol(currency)} ${currency}`],
                ['Portfolio', mode === 'detailed' ? 'Detailed' : 'Simple'],
                ...(mode !== 'detailed' && numericValue > 0 ? [['Starting value', formatCurrency(numericValue, currency)]] : []),
              ].map(([label, value], i) => (
                <div key={label} className={cn('flex items-center justify-between py-3.5', i > 0 && 'border-t border-line')}>
                  <span className="text-[14px] text-secondary">{label}</span>
                  <span className="num text-[15px] font-semibold text-ink">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <Button size="l" className="w-full" onClick={finish}>Go to dashboard</Button>
              <button type="button" onClick={() => setStep(2)} className="text-center text-[13px] font-medium text-secondary transition-colors hover:text-ink">Back</button>
            </div>
          </>
        )}
      </main>

      <Modal open={!!restore.pending} onClose={restore.cancel} title="Restore this backup?" footer={
        <>
          <Button pill size="l" variant="tonal" className="flex-1 md:flex-none md:ml-auto" onClick={restore.cancel}>Cancel</Button>
          <Button pill size="l" variant="primary" className="flex-1 md:flex-none" onClick={confirmRestore}>Restore &amp; continue</Button>
        </>
      }>
        <p className="text-[14px] text-secondary">{restore.summary || 'This will load your data from the backup and finish setup.'}</p>
      </Modal>
    </div>
  );
}
