
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../../components/ui';
import { GlassCard } from '../../components/ui';

interface Step2PrivacyProps {
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Privacy({ onNext, onBack }: Step2PrivacyProps) {
  const nickname = useSettingsStore((s) => s.userNickname);

  return (
    <div className="text-center space-y-8">
      <div>
        <h1 className="text-5xl font-bold text-white mb-3">Hello, {nickname}! 😊</h1>
      </div>

      <GlassCard className="p-8 max-w-sm mx-auto text-left space-y-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🔒</span>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Your data never leaves your device</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Everything you enter in this app — your portfolio, spending, and net worth — is stored only in your browser's local storage. Nothing is sent to any server. No account required. No cloud sync. Your financial data is completely private and stays on your computer.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-white/70 text-sm">No account or sign-up needed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-white/70 text-sm">Works offline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-white/70 text-sm">You can export a backup anytime from Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-white/70 text-sm">Clearing your browser data will erase the app data — keep backups!</span>
          </div>
        </div>
      </GlassCard>

      <div className="flex gap-3 justify-center max-w-sm mx-auto">
        <Button variant="ghost" onClick={onBack} fullWidth>
          Back
        </Button>
        <Button variant="primary" onClick={onNext} fullWidth>
          Got it, let's set up!
        </Button>
      </div>
    </div>
  );
}
