import { Card, Field, SelectInput, SegmentToggle } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';
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

  return (
    <AccountSubPage title="Currency" subtitle="Your base currency and where exchange rates come from.">
      <Card className="flex flex-col gap-4 p-4">
        <Field label="Default currency">
          <SelectInput value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectInput>
        </Field>
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
    </AccountSubPage>
  );
}
