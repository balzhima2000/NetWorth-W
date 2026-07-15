import { useState } from 'react';
import { Button, Card, Field, Modal, SelectInput, SegmentToggle } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';
import { hasCurrencyDenominatedData } from '../../utils/currencyDenomination';
import { getCurrencySymbol } from '../../utils/formatters';
import { AccountSubPage } from './AccountSubPage';

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
const PROVIDERS = [
  { value: 'boi', label: 'Free' },
  { value: 'alpha-vantage', label: 'Alpha Vantage' },
  { value: 'massive', label: 'Massive' },
];

export default function Currency() {
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const setDefaultCurrency = useSettingsStore((s) => s.setDefaultCurrency);
  const fxProvider = useSettingsStore((s) => s.fxProvider);
  const setFxProvider = useSettingsStore((s) => s.setFxProvider);
  const [pending, setPending] = useState<string | null>(null);

  // Changing the base currency re-labels stored amounts instead of converting
  // them (they're frozen at entry time — see the exchange-rate policy), so ask
  // first whenever there is history to re-label. On an empty install there is
  // nothing to mislabel and the change applies straight away.
  const request = (next: string) => {
    if (next === defaultCurrency) return;
    if (hasCurrencyDenominatedData()) setPending(next);
    else setDefaultCurrency(next);
  };

  const confirm = () => {
    if (pending) setDefaultCurrency(pending);
    setPending(null);
  };

  return (
    <AccountSubPage title="Currency" subtitle="Your base currency and where exchange rates come from.">
      <Card className="flex flex-col gap-4 p-5">
        <Field label="Default currency">
          <SelectInput value={defaultCurrency} onChange={(e) => request(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectInput>
        </Field>
        <p className="text-[13px] font-medium text-muted">
          Changing this sets the currency new amounts are recorded in. Amounts you've already recorded keep their existing values and are not converted.
        </p>
        <Field label="Exchange-rate provider">
          <SegmentToggle
            options={PROVIDERS}
            value={fxProvider}
            onChange={(v) => setFxProvider(v as 'alpha-vantage' | 'massive' | 'boi')}
          />
        </Field>
        <p className="text-[13px] font-medium text-muted">
          “Free” uses ECB-backed Frankfurter rates (no key needed). Alpha Vantage and Massive need an API key — set it under Connections → API configuration.
        </p>
      </Card>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={`Change your currency to ${pending ?? ''}?`}
        footer={
          <>
            <Button pill size="l" variant="tonal" className="flex-1 md:ml-auto md:flex-none" onClick={() => setPending(null)}>Cancel</Button>
            <Button pill size="l" variant="primary" className="flex-1 md:flex-none" onClick={confirm}>Change currency</Button>
          </>
        }
      >
        <p className="text-[14px] text-secondary">
          Your history won't be restated. Amounts recorded in {getCurrencySymbol(defaultCurrency)} {defaultCurrency} keep their existing values and will simply be shown as {getCurrencySymbol(pending ?? '')} {pending} — so a balance of {getCurrencySymbol(defaultCurrency)} 1,000 becomes {getCurrencySymbol(pending ?? '')} 1,000, not its converted equivalent. Only amounts you add from now on will be recorded in {pending}.
        </p>
      </Modal>
    </AccountSubPage>
  );
}
