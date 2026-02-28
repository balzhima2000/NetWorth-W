import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';

interface Step6FireProps {
  onNext: () => void;
  onBack: () => void;
}

export default function Step6Fire({ onNext, onBack }: Step6FireProps) {
  const [hasTarget, setHasTarget] = useState(true);
  const [target, setTarget] = useState('');
  const setFireTarget = useSettingsStore((s) => s.setFireTarget);

  const handleContinue = () => {
    if (hasTarget && target) {
      setFireTarget(parseFloat(target) || null);
    } else {
      setFireTarget(null);
    }
    onNext();
  };

  return (
    <div className="text-center space-y-8 max-w-sm mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Do you have a retirement savings goal?</h1>
        <p className="text-white/50">If you know your target, we'll show your progress on the Dashboard. You can calculate it precisely in the FIRE Calculators.</p>
      </div>

      {hasTarget && (
        <Input
          type="number"
          label="My FIRE target"
          placeholder="1000000"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          hint="Total amount needed to retire"
        />
      )}

      <label className="flex items-center gap-3 text-white/70 cursor-pointer justify-center">
        <input
          type="checkbox"
          checked={!hasTarget}
          onChange={(e) => setHasTarget(!e.target.checked)}
          className="w-5 h-5 accent-[#5865f2]"
        />
        <span className="text-sm">I don't have a target yet</span>
      </label>

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
