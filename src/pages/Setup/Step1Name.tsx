import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';

interface Step1NameProps {
  onNext: () => void;
}

export default function Step1Name({ onNext }: Step1NameProps) {
  const [name, setName] = useState('');
  const setUserName = useSettingsStore((s) => s.setUserName);
  const setUserNickname = useSettingsStore((s) => s.setUserNickname);

  const handleContinue = () => {
    if (name.trim()) {
      setUserName(name.trim());
      setUserNickname(name.trim().split(' ')[0]);
      onNext();
    }
  };

  return (
    <div className="text-center space-y-10">
      <div>
        <h1 className="text-5xl font-bold text-white mb-3">Hello there! 👋</h1>
        <p className="text-white/50">Let's get your personal finance tracker set up.</p>
      </div>

      <div className="max-w-sm mx-auto space-y-3">
        <p className="text-2xl font-semibold text-white">What's your name?</p>
        <Input
          placeholder="e.g. Eitan Cohen"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={handleContinue}
        disabled={!name.trim()}
        fullWidth
      >
        Continue
      </Button>
    </div>
  );
}
