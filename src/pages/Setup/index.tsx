import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import Step1Name from './Step1Name';
import Step2Privacy from './Step2Privacy';
import Step3Currency from './Step3Currency';
import Step4Portfolio from './Step4Portfolio';
import Step5ExcelImport from './Step5ExcelImport';
import Step5Cards from './Step5Cards';
import Step6Fire from './Step6Fire';
import Step8Sync from './Step8Sync';
import Step7Done from './Step7Done';

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const steps: Array<{ number: StepNumber; title: string; showProgress: boolean }> = [
  { number: 1, title: 'Your Name', showProgress: true },
  { number: 2, title: 'Privacy', showProgress: false },
  { number: 3, title: 'Currency', showProgress: true },
  { number: 4, title: 'Portfolio', showProgress: true },
  { number: 5, title: 'Import Holdings', showProgress: true },
  { number: 6, title: 'Payment Cards', showProgress: true },
  { number: 7, title: 'FIRE Target', showProgress: true },
  { number: 8, title: 'Sync', showProgress: true },
  { number: 9, title: 'Done', showProgress: true },
];

export default function SetupWizard() {
  const hasCompletedSetup = useSettingsStore((s) => s.hasCompletedSetup);
  const portfolioMode = useSettingsStore((s) => s.portfolioMode);
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // If a magic link is clicked in a new tab, Supabase fires SIGNED_IN after processing
  // the URL hash. Jump to the Done step so the user can finish setup without restarting.
  // We intentionally do NOT check getSession() on mount — a pre-existing session (e.g.
  // after a device reset) should not skip steps.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') setCurrentStep(9 as StepNumber);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (hasCompletedSetup) {
    return <Navigate to="/dashboard" replace />;
  }

  const step = steps.find((s) => s.number === currentStep)!;
  const progressPercent = (currentStep / 9) * 100;

  const handleNext = () => {
    // Skip the Excel import step (5) when user picked Simple portfolio mode
    if (currentStep === 4 && portfolioMode === 'simple') {
      setCurrentStep(6 as StepNumber);
      return;
    }
    if (currentStep < 9) setCurrentStep((currentStep + 1) as StepNumber);
  };

  const handleBack = () => {
    // Skip back over the Excel import step (5) for Simple mode users
    if (currentStep === 6 && portfolioMode === 'simple') {
      setCurrentStep(4 as StepNumber);
      return;
    }
    if (currentStep > 1) setCurrentStep((currentStep - 1) as StepNumber);
  };

  const handleComplete = () => {
    useSettingsStore.setState({ hasCompletedSetup: true });
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {step.showProgress && (
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[#10B981] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          {currentStep === 1 && <Step1Name onNext={handleNext} onRestoreFromCloud={() => setCurrentStep(8 as StepNumber)} />}
          {currentStep === 2 && <Step2Privacy onNext={handleNext} onBack={handleBack} />}
          {currentStep === 3 && (
            <Step3Currency onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 4 && (
            <Step4Portfolio onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 5 && (
            <Step5ExcelImport onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 6 && (
            <Step5Cards onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 7 && (
            <Step6Fire onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 8 && (
            <Step8Sync onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 9 && (
            <Step7Done onComplete={handleComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
