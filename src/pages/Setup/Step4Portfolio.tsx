import { useState } from 'react';
import { useNetWorthStore } from '../../stores/networthStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { GlassCard } from '../../components/ui';


interface Step4PortfolioProps {
  onNext: () => void;
  onBack: () => void;
}

export default function Step4Portfolio({ onNext, onBack }: Step4PortfolioProps) {
  const [mode, setMode] = useState<'simple' | 'detailed' | null>(null);
  const [simpleValue, setSimpleValue] = useState('');
  const setPortfolioMode = useSettingsStore((s) => s.setPortfolioMode);
  const addManualEntry = useNetWorthStore((s) => s.addManualEntry);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);

  const handleContinue = () => {
    if (!mode) return;

    setPortfolioMode(mode);

    if (mode === 'simple' && simpleValue) {
      const portfolioValue = parseFloat(simpleValue) || 0;
      addManualEntry({
        id: crypto.randomUUID(),
        name: 'Portfolio (Setup)',
        value: portfolioValue,
        isLiability: false,
        assetCategory: 'other',
        lastUpdated: new Date().toISOString(),
      });
    }

    onNext();
  };

  const isValid = mode && (mode === 'detailed' || (mode === 'simple' && simpleValue));

  return (
    <div className="text-center space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">How would you like to set up your portfolio?</h1>
        <p className="text-white/50">Choose the approach that works best for you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Simple */}
        <GlassCard
          onClick={() => setMode('simple')}
          hover
          padding="lg"
          className={`cursor-pointer transition-all ${mode === 'simple' ? 'ring-2 ring-[#10B981]' : ''}`}
        >
          <div className="text-left space-y-3">
            <h3 className="text-xl font-semibold text-white">Simple</h3>
            <p className="text-white/60 text-sm">Just enter the total value of your portfolio. You can add individual stocks later.</p>
            {mode === 'simple' && (
              <div onClick={(e) => e.stopPropagation()}>
                <Input
                  type="number"
                  label="Current portfolio value"
                  placeholder="50000"
                  value={simpleValue}
                  min={0}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || parseFloat(val) >= 0) setSimpleValue(val);
                  }}
                  leftAddon={defaultCurrency === 'USD' ? '$' : undefined}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setSimpleValue(String((parseFloat(simpleValue) || 0) + 5000))}
                  className="mt-2 w-full text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg py-1.5 transition-colors"
                >
                  + 5,000
                </button>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Detailed */}
        <GlassCard
          onClick={() => setMode('detailed')}
          hover
          padding="lg"
          className={`cursor-pointer transition-all ${mode === 'detailed' ? 'ring-2 ring-[#10B981]' : ''}`}
        >
          <div className="text-left space-y-3">
            <h3 className="text-xl font-semibold text-white">Detailed</h3>
            <p className="text-white/60 text-sm">Enter your individual holdings, assets, and debts now for full accuracy from day one.</p>
            <p className="text-xs text-white/40 pt-2">💡 You can optionally connect an Alpha Vantage API key in Settings to auto-fetch live stock prices.</p>
          </div>
        </GlassCard>
      </div>

      <div className="flex gap-3 max-w-sm mx-auto">
        <Button variant="ghost" onClick={onBack} fullWidth>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!isValid}
          fullWidth
        >
          Continue
        </Button>
      </div>

      <button
        onClick={onNext}
        className="text-white/40 hover:text-white/60 text-sm transition-colors"
      >
        Skip for now
      </button>
    </div>
  );
}
