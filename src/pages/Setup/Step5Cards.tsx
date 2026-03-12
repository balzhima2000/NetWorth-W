import { useState } from 'react';
import { useCardsStore } from '../../stores/cardsStore';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { GlassCard } from '../../components/ui';
import { CARD_COLORS } from '../../utils/constants';

interface Step5CardsProps {
  onNext: () => void;
  onBack: () => void;
}

export default function Step5Cards({ onNext, onBack }: Step5CardsProps) {
  const [cards, setCards] = useState<Array<{ id: string; name: string; color: string; isActive: boolean }>>([]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardColor, setNewCardColor] = useState(CARD_COLORS[0]);
  const addCard = useCardsStore((s) => s.addCard);

  const handleAddCard = () => {
    if (!newCardName.trim()) return;
    const newCard = { id: crypto.randomUUID(), name: newCardName, color: newCardColor, isActive: true };
    setCards([...cards, newCard]);
    addCard(newCard);
    setNewCardName('');
    setNewCardColor(CARD_COLORS[0]);
  };

  const handleRemoveCard = (id: string) => {
    setCards(cards.filter((c) => c.id !== id));
  };

  return (
    <div className="text-center space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Do you pay with any cards?</h1>
        <p className="text-white/50">Add your cards so you can track spending per card. You can add more later in Settings.</p>
      </div>

      <div className="space-y-4">
        {cards.length > 0 && (
          <div className="space-y-2">
            {cards.map((card) => (
              <GlassCard key={card.id} padding="md" className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                  <span className="text-white font-medium">{card.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveCard(card.id)}
                  className="text-white/40 hover:text-[#EF4444] transition-colors"
                >
                  ✕
                </button>
              </GlassCard>
            ))}
          </div>
        )}

        <GlassCard padding="md" className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Visa Sapphire"
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              containerClassName="flex-1"
            />
            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                {CARD_COLORS.slice(0, 5).map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCardColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${newCardColor === color ? 'border-white' : 'border-white/20'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={handleAddCard}>
                Add
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} fullWidth>
          Back
        </Button>
        <Button variant="primary" onClick={onNext} fullWidth>
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
