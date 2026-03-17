
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

      <GlassCard className="p-8 w-full max-w-2xl mx-auto text-left space-y-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🔒</span>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Your data, your control</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              All your financial data is stored locally on your device first. You can optionally sign in to enable cloud backup and sync across devices — but it's entirely up to you.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-white/70 text-sm">Data lives in your browser's local storage by default</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-white/70 text-sm">Optional cloud sync via magic-link sign-in — no password needed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-white/70 text-sm">Works fully offline without an account</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-white/70 text-sm">Export a local backup anytime from Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#F59E0B]">⚠️</span>
            <span className="text-white/50 text-sm">Without cloud sync, clearing your browser data will erase the app — keep backups!</span>
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
