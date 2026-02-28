
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCardsStore } from '../../stores/cardsStore';
import { Button } from '../../components/ui';
import { GlassCard } from '../../components/ui';

interface Step7DoneProps {
  onComplete: () => void;
}

export default function Step7Done({ onComplete }: Step7DoneProps) {
  const navigate = useNavigate();
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const portfolioMode = useSettingsStore((s) => s.portfolioMode);
  const fireTarget = useSettingsStore((s) => s.fireTarget);
  const cards = useCardsStore((s) => s.cards);

  const handleGoDashboard = () => {
    onComplete();
    navigate('/dashboard');
  };

  return (
    <div className="text-center space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-5xl font-bold text-white mb-3">You're ready to go! 🎉</h1>
        <p className="text-white/50">Here's what we've set up for you:</p>
      </div>

      <GlassCard padding="lg" className="space-y-4 text-left max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-white/60 text-sm">Currency</p>
            <p className="text-white font-medium">{defaultCurrency}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-white/60 text-sm">Portfolio</p>
            <p className="text-white font-medium capitalize">{portfolioMode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-white/60 text-sm">Payment Cards</p>
            <p className="text-white font-medium">{cards.length > 0 ? `${cards.length} card${cards.length !== 1 ? 's' : ''}` : 'None added'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-white/60 text-sm">FIRE Target</p>
            <p className="text-white font-medium">{fireTarget ? `$${fireTarget.toLocaleString()}` : 'Not set'}</p>
          </div>
        </div>
      </GlassCard>

      <Button variant="primary" size="lg" onClick={handleGoDashboard} fullWidth>
        Go to Dashboard
      </Button>
    </div>
  );
}
