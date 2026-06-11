/**
 * William Account hub — /william/account
 * Theme toggle (Light/Dark/Auto) on top, grouped link rows to the isolated
 * setting pages, and a desktop footer. Matches Figma "Account — Desktop/Mobile".
 */
import { useNavigate } from 'react-router-dom';
import { Card, Icon, FloatingNav, TabBar, cn } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';
import { ACCOUNT_GROUPS } from './sections';

const THEMES: { key: 'light' | 'dark' | 'auto'; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'auto', label: 'Auto' },
];

function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme ?? 'auto');
  const setTheme = useSettingsStore((s) => s.setTheme);
  return (
    <div className="flex w-full gap-0.5 rounded-full bg-sunken p-1">
      {THEMES.map((t) => {
        const active = theme === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTheme(t.key)}
            aria-pressed={active}
            className={cn(
              'flex-1 rounded-full py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
              active ? 'bg-surface text-ink shadow-none' : 'text-secondary hover:text-ink',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function LinkRow({ label, danger, onClick, last }: { label: string; danger?: boolean; onClick: () => void; last: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink',
        !last && 'border-b border-line',
      )}
    >
      <span className={cn('text-[15px] font-medium', danger ? 'text-negative' : 'text-ink')}>{label}</span>
      <span className={cn('num text-[16px]', danger ? 'text-negative' : 'text-muted')}>›</span>
    </button>
  );
}

export default function WilliamAccount() {
  const navigate = useNavigate();
  const go = (slug: string) => navigate(`/william/account/${slug}`);

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />
      <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col gap-1 pt-2 md:pt-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">Account</h1>
          <p className="text-[13px] font-medium text-secondary md:text-[15px]">Manage your preferences, connections and data.</p>
        </div>

        {/* Appearance */}
        <Card className="flex flex-col gap-3 p-5">
          <span className="num text-[12px] font-medium uppercase tracking-[0.05em] text-secondary">Appearance</span>
          <ThemeToggle />
          <span className="text-[13px] font-medium text-muted">Auto follows your device appearance.</span>
        </Card>

        {/* Grouped sections */}
        {ACCOUNT_GROUPS.map((grp) => (
          <div key={grp.group} className="flex flex-col gap-2.5">
            <span className="num text-[12px] font-medium uppercase tracking-[0.05em] text-secondary">{grp.group}</span>
            <Card className="flex flex-col p-0 overflow-hidden">
              {grp.items.map((it, i) => (
                <LinkRow key={it.slug} label={it.label} danger={it.danger} onClick={() => go(it.slug)} last={i === grp.items.length - 1} />
              ))}
            </Card>
          </div>
        ))}

        {/* Footer */}
        <footer className="mt-2 flex flex-col items-center gap-3 border-t border-line pt-5 text-[13px] md:flex-row md:justify-between">
          <span className="font-medium text-muted">William — net-worth tracker</span>
          <div className="flex items-center gap-3">
            <a href="https://balzhima.com" target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-2 hover:text-secondary">balzhima.com</a>
            <span className="num text-muted">·</span>
            <a href="https://github.com/eitanrub7980" target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-2 hover:text-secondary">Eitan’s GitHub</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
