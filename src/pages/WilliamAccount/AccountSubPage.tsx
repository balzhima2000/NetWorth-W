/** Shared layout for an isolated Account setting page: back header + title + content. */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingNav, TabBar, BackLink, cn } from '../../components/william';

export function AccountSubPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />
      <main className="mx-auto flex max-w-[720px] flex-col gap-5 px-4 md:px-6">
        <div className="flex flex-col gap-2 pt-2 md:pt-6">
          <BackLink label="Account" onClick={() => navigate('/william/account')} className="w-fit" />
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">{title}</h1>
          {subtitle && <p className="text-[13px] font-medium text-secondary md:text-[15px]">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

/** Temporary scaffold for sections not yet ported to William. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <AccountSubPage title={title}>
      <div className="rounded-card bg-surface p-6 text-[14px] text-secondary">
        This section is being moved to its own page. For now you can manage it from the
        {' '}<a href="/settings" className="font-medium text-ink underline underline-offset-2">classic settings</a>.
      </div>
    </AccountSubPage>
  );
}

export { cn };
