import { useState } from 'react';
import {
  Button, Badge, Chip, RangeSelector, Skeleton, ActionButton, Card, Icon,
  type IconName,
} from '../components/william';

const navIcons: IconName[] = ['home', 'portfolio', 'spending', 'fire', 'account', 'trade', 'income', 'expense', 'star'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="ty-label text-muted">{title}</h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  );
}

export default function WilliamPreview() {
  const [dark, setDark] = useState(false);
  const [range, setRange] = useState('1M');

  return (
    <div
      className="william min-h-screen bg-canvas"
      data-theme={dark ? 'dark' : undefined}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="ty-h1 text-ink">William — Primitives</h1>
            <p className="ty-body text-secondary">Component preview against the scoped token layer.</p>
          </div>
          <Button variant="secondary" onClick={() => setDark((d) => !d)}>
            {dark ? 'Light' : 'Dark'} mode
          </Button>
        </header>

        <Section title="Type scale">
          <div className="flex flex-col gap-2">
            <span className="ty-display text-ink num">$125,480.00</span>
            <span className="ty-h1 text-ink">Heading H1</span>
            <span className="ty-h2 text-ink">Heading H2</span>
            <span className="ty-body text-secondary">Body / Default — the quick brown fox.</span>
            <span className="ty-label text-muted">Label / Mono</span>
          </div>
        </Section>

        <Section title="Buttons">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </Section>

        <Section title="Badges (money direction)">
          <Badge tone="positive">+25.20%</Badge>
          <Badge tone="negative">−$25.00</Badge>
          <Badge tone="neutral">Neutral</Badge>
        </Section>

        <Section title="Chips">
          <Chip variant="neutral">Neutral</Chip>
          <Chip variant="outline">Outline</Chip>
          <Chip variant="inverse">Inverse</Chip>
        </Section>

        <Section title="Range selector">
          <RangeSelector value={range} onChange={setRange} />
        </Section>

        <Section title="Action buttons">
          <ActionButton action="trade" />
          <ActionButton action="income" />
          <ActionButton action="expense" />
        </Section>

        <Section title="Icons (all)">
          {navIcons.map((n) => (
            <span key={n} className="flex flex-col items-center gap-1 text-ink">
              <Icon name={n} size={32} />
              <span className="ty-label text-muted">{n}</span>
            </span>
          ))}
        </Section>

        <Section title="Skeleton (loading)">
          <Card className="flex w-[320px] flex-col gap-3 p-6">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-3.5 w-36" />
            <div className="flex gap-6 pt-2">
              <Skeleton className="h-[54px] w-[54px] rounded-full" />
              <Skeleton className="h-[54px] w-[54px] rounded-full" />
              <Skeleton className="h-[54px] w-[54px] rounded-full" />
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
