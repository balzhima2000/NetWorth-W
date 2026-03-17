import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';

interface Step6FireProps {
  onNext: () => void;
  onBack: () => void;
}

export default function Step6Fire({ onNext, onBack }: Step6FireProps) {
  const [target, setTarget] = useState('');
  const setFireTarget = useSettingsStore((s) => s.setFireTarget);

  const handleContinue = () => {
    const parsed = parseFloat(target);
    if (!parsed || parsed <= 0) return;
    setFireTarget(parsed);
    onNext();
  };

  const handleSkip = () => {
    setFireTarget(null);
    onNext();
  };

  const isValid = parseFloat(target) > 0;

  return (
    <div className="text-center space-y-8 max-w-sm mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Do you have a retirement savings goal?</h1>
        <p className="text-white/50">If you know your target, we'll show your progress on the Dashboard. You can calculate it precisely in the FIRE Calculators.</p>
      </div>

      <Input
        type="number"
        label="My FIRE target"
        placeholder="1000000"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        hint="Total amount needed to retire"
      />

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} fullWidth>
          Back
        </Button>
        <Button variant="primary" onClick={handleContinue} disabled={!isValid} fullWidth>
          Continue
        </Button>
      </div>

      <button
        onClick={handleSkip}
        className="text-white/35 text-sm hover:text-white/60 transition-colors underline underline-offset-2"
      >
        I don't have a target yet
      </button>
    </div>
  );
}
