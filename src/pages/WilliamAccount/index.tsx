/**
 * William Account hub — /william/account
 * Theme toggle (Light/Dark/Auto) on top, grouped link rows to the isolated
 * setting pages, and a desktop footer. Matches Figma "Account — Desktop/Mobile".
 */
import { useNavigate } from 'react-router-dom';
import { Card, List, ListRow, ListHeader, FloatingNav, TabBar, Segmented, Icon } from '../../components/william';
import type { IconName } from '../../components/william';
import { useSettingsStore } from '../../stores/settingsStore';
import { ACCOUNT_GROUPS } from './sections';

const THEMES: { key: 'light' | 'dark' | 'auto'; label: string; icon?: IconName }[] = [
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
  { key: 'auto', label: 'Auto' },
];

function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme ?? 'auto');
  const setTheme = useSettingsStore((s) => s.setTheme);
  return (
    <Segmented
      options={THEMES.map((t) => ({
        value: t.key,
        label: (
          <span className="num inline-flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-[0.65px]">
            {t.icon && <Icon name={t.icon} size={16} />}
            {t.label}
          </span>
        ),
      }))}
      value={theme}
      onChange={(v) => setTheme(v as 'light' | 'dark' | 'auto')}
      track="sunken"
      size="md"
      fullWidth
    />
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

        {/* Appearance — in-card 18px header + theme toggle (Figma 971:1559) */}
        <Card className="flex flex-col px-5 pb-5">
          <ListHeader title="Appearance" />
          <ThemeToggle />
        </Card>

        {/* Grouped sections — each a borderless List card with an in-card
            18px header + divided rows (Figma Account / Desktop 971:1553). */}
        {ACCOUNT_GROUPS.map((grp) => (
          <List key={grp.group}>
            <ListHeader title={grp.group} />
            {grp.items.map((it) => (
              <ListRow key={it.slug} title={it.label} danger={it.danger} chevron onClick={() => go(it.slug)} />
            ))}
          </List>
        ))}

        {/* Footer */}
        <footer className="mt-2 flex flex-col items-center gap-3 border-t border-line pt-5 text-[13px] md:flex-row md:justify-between">
          <span className="font-medium text-muted">NW</span>
          <div className="flex items-center gap-3">
            <a href="https://balzhima.com" target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-2 hover:text-secondary">Balzhima</a>
            <span className="num text-muted">·</span>
            <a href="https://github.com/eitanrub7980" target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-2 hover:text-secondary">Eitan</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
