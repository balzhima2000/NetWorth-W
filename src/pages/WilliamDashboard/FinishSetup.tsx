/**
 * Dashboard "Finish setting up" cards — the optional onboarding tasks deferred
 * out of the lean /william/setup wizard. Each card auto-hides once its task is
 * done (derived from real store state); explicit dismissals persist via
 * onboardingStore. The section renders nothing when there's nothing left to do.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, cn, type IconName } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCardsStore } from '../../stores/cardsStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { EditAssumptionsModal } from '../WilliamFire/EditAssumptionsModal';
import { ImportExcelModal } from '../WilliamPortfolio/ImportExcelModal';

interface TaskDef { id: string; icon: IconName; title: string; subtitle: string; onClick: () => void; done: boolean; show: boolean }

export function FinishSetup() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<null | 'fire' | 'import'>(null);
  const cardsCount = useCardsStore((s) => s.cards.length);
  const trades = usePortfolioStore((s) => s.trades.length);
  const fireAnnualExpenses = useSettingsStore((s) => s.fireAnnualExpenses);
  const fireTarget = useSettingsStore((s) => s.fireTarget);
  const portfolioMode = useSettingsStore((s) => s.portfolioMode);
  const dismissed = useOnboardingStore((s) => s.dismissed);
  const dismiss = useOnboardingStore((s) => s.dismiss);
  const dismissMany = useOnboardingStore((s) => s.dismissMany);

  const defs: TaskDef[] = [
    { id: 'cards', icon: 'plus', title: 'Add payment cards', subtitle: 'Group your spending by card.', onClick: () => navigate('/william/account/cards'), done: cardsCount > 0, show: true },
    { id: 'fire', icon: 'target', title: 'Set your FIRE goal', subtitle: 'Track your progress to independence.', onClick: () => setModal('fire'), done: fireAnnualExpenses != null || fireTarget != null, show: true },
    { id: 'import', icon: 'import', title: 'Import your holdings', subtitle: "From your broker's Excel.", onClick: () => setModal('import'), done: false, show: portfolioMode === 'detailed' && trades === 0 },
    { id: 'sync', icon: 'refresh', title: 'Sync your devices', subtitle: 'Access on your phone and laptop.', onClick: () => navigate('/william/account/sync'), done: false, show: true },
  ];
  const visible = defs.filter((d) => d.show && !d.done && !dismissed.includes(d.id));
  if (visible.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <EditAssumptionsModal open={modal === 'fire'} onClose={() => setModal(null)} />
      <ImportExcelModal open={modal === 'import'} onClose={() => setModal(null)} />
      <div className="flex items-center justify-between">
        <h2 className="ty-h2 text-ink">Finish setting up</h2>
        <button type="button" onClick={() => dismissMany(visible.map((v) => v.id))} className="text-[13px] font-medium text-secondary transition-colors hover:text-ink focus-visible:outline-none">Dismiss all</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((d) => (
          <div
            key={d.id}
            role="button"
            tabIndex={0}
            onClick={d.onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.onClick(); } }}
            className={cn(
              'group flex cursor-pointer flex-col gap-2.5 rounded-2xl bg-surface p-4 transition-colors',
              'hover:bg-btn-neutral-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
            )}
          >
            <div className="flex items-start justify-between">
              <Icon name={d.icon} size={20} className="text-ink" />
              <button
                type="button"
                aria-label={`Dismiss ${d.title}`}
                onClick={(e) => { e.stopPropagation(); dismiss(d.id); }}
                className="-m-1 p-1 text-[13px] leading-none text-muted transition-colors hover:text-ink focus-visible:outline-none"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-ink">{d.title}</span>
              <span className="text-[13px] leading-snug text-secondary">{d.subtitle}</span>
            </div>
            <span className="text-[13px] font-medium text-accent">Set up →</span>
          </div>
        ))}
      </div>
    </section>
  );
}
