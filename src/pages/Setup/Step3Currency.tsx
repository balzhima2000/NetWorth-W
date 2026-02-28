import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../../components/ui';
import { Select } from '../../components/ui';
import { CURRENCIES } from '../../utils/constants';

interface Step3CurrencyProps {
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Currency({ onNext, onBack }: Step3CurrencyProps) {
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const setDefaultCurrency = useSettingsStore((s) => s.setDefaultCurrency);
  const [selected, setSelected] = useState(defaultCurrency);

  const handleContinue = () => {
    setDefaultCurrency(selected);
    onNext();
  };

  return (
    <div className="text-center space-y-8 max-w-sm mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">What's your main currency?</h1>
        <p className="text-white/50">This will be used for all totals, charts, and summaries. You can change it later in Settings.</p>
      </div>

      <Select
        label="Default Currency"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
        required
      />

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} fullWidth>
          Back
        </Button>
        <Button variant="primary" onClick={handleContinue} fullWidth>
          Continue
        </Button>
      </div>
    </div>
  );
}
