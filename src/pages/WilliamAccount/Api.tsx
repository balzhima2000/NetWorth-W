import { useState } from 'react';
import { Card, Button, Field, TextInput } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../../hooks/useToast';
import { testApiKey } from '../../services/alphaVantage';
import { testMassiveKey } from '../../services/massiveApi';
import { testTaseKey } from '../../services/taseDataHub';
import { AccountSubPage } from './AccountSubPage';

type Status = 'idle' | 'testing' | 'valid' | 'invalid';

function KeyField({ label, hint, current, onSave, onRemove, onTest }: {
  label: string; hint: string; current: string;
  onSave: (k: string) => void; onRemove: () => void; onTest?: (k: string) => Promise<boolean>;
}) {
  const toast = useToast();
  const [val, setVal] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const test = async () => {
    if (!val || !onTest) return;
    setStatus('testing');
    try { setStatus((await onTest(val)) ? 'valid' : 'invalid'); }
    catch { setStatus('invalid'); }
  };

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        <span className="text-[13px] text-secondary">{hint}</span>
      </div>
      {current
        ? <span className="text-[13px] font-medium text-positive">● Key saved</span>
        : <span className="text-[13px] font-medium text-muted">Not set</span>}
      <Field label="API key">
        <TextInput value={val} onChange={(e) => { setVal(e.target.value); setStatus('idle'); }} placeholder="Paste key…" />
      </Field>
      {status === 'valid' && <span className="text-[13px] font-medium text-positive">✓ Valid</span>}
      {status === 'invalid' && <span className="text-[13px] font-medium text-negative">✕ Invalid key</span>}
      <div className="flex gap-2">
        {onTest && <Button size="s" pill variant="secondary" disabled={!val || status === 'testing'} onClick={test}>{status === 'testing' ? 'Testing…' : 'Test'}</Button>}
        <Button size="s" pill variant="primary" disabled={!val} onClick={() => { onSave(val); toast.success(`${label} key saved.`); setVal(''); setStatus('idle'); }}>Save</Button>
        {current && <Button size="s" pill variant="ghost" onClick={() => { onRemove(); toast.success(`${label} key removed.`); }}>Remove</Button>}
      </div>
    </Card>
  );
}

export default function Api() {
  const s = useSettingsStore();
  return (
    <AccountSubPage title="API configuration" subtitle="Keys for live prices and exchange rates. Stored only on this device.">
      <KeyField label="Global stocks" hint="Alpha Vantage — quotes for global (non-TASE) holdings." current={s.stocksApiKey}
        onSave={s.setStocksApiKey} onRemove={() => s.setStocksApiKey('')} onTest={testApiKey} />
      <KeyField label="Exchange rates" hint={`FX provider: ${s.fxProvider === 'massive' ? 'Massive' : s.fxProvider === 'boi' ? 'Free (no key needed)' : 'Alpha Vantage'}. Change under Currency.`} current={s.fxApiKey}
        onSave={s.setFxApiKey} onRemove={() => s.setFxApiKey('')} onTest={s.fxProvider === 'massive' ? testMassiveKey : testApiKey} />
      <KeyField label="TASE (Israeli stocks)" hint="TASE DataHub — quotes for Tel-Aviv-listed holdings." current={s.israeliApiKey}
        onSave={s.setIsraeliApiKey} onRemove={() => s.setIsraeliApiKey('')} onTest={testTaseKey} />
      <KeyField label="Crypto" hint="Coinlayer — crypto spot prices." current={s.cryptoApiKey}
        onSave={s.setCryptoApiKey} onRemove={() => s.setCryptoApiKey('')} />
    </AccountSubPage>
  );
}
