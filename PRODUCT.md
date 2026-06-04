# Product

## Register

product

## Users

**The Intentional Investor** — financially literate, FIRE-minded, wants confidence and trust from their tools. Professional-but-stylish. Primarily solo use on desktop; checks on mobile.

Two modes of use:
- **Checking mode** (daily): fast glance at net worth, gains/losses, portfolio health. Should feel instant and reassuring.
- **Deep dive** (weekly): reviewing transactions, rebalancing, tracking FIRE progress. Should feel precise and capable.

Not a casual budgeter. Cares about accuracy and data integrity. Notices when numbers don't add up.

## Product Purpose

A personal net worth tracker for tracking assets, liabilities, recurring expenses, stock portfolio performance, and FIRE progress — all in one place, privately, without ads or third-party data sharing. Data lives locally (localStorage) with optional sync. Success looks like: the user opens it and immediately knows where they stand.

## Brand Personality

Calm, precise, confident. Like a private wealth advisor — composed, never flashy, quietly reassuring. The interface should feel like it was built by someone who takes money seriously, not someone who wants to gamify it.

## Anti-references

- **Generic SaaS dashboards**: navy sidebar + white card + blue button default. Looks built from a template. Zero character.
- **Robinhood / crypto apps**: gamified, dopamine-driven, flashy green numbers, gradient text, neon palette.
- **Consumer fintech (Mint, NerdWallet)**: cluttered with CTAs, colorful noise, built for people who don't know what they're doing.

## Design Principles

1. **Prominence follows use frequency.** What the user checks daily gets the most visual weight. Configuration lives elsewhere. Monitoring lives front and center.
2. **Checking mode first.** Every screen should answer the user's most common question before they have to interact. The answer should be visible at a glance.
3. **Numbers earn trust or destroy it.** Tabular, consistent, precisely aligned financial figures. Any inconsistency — font mixing, misaligned decimals, varying scales — erodes confidence in the data itself.
4. **Restraint as craft.** The absence of decoration is a design decision. Color is used for meaning (gain/loss/accent), not atmosphere. Every pixel that isn't earning its place should be removed.
5. **States are a system, not an afterthought.** Empty states, loading states, error states, and zero-value states are designed alongside the happy path, not patched in later.

## Accessibility & Inclusion

- Target: **WCAG 2.1 AA**
- Dark-mode only (OLED-first); ensure sufficient contrast on all surface levels
- Tabular numeric data must be screen-reader friendly (proper table semantics)
- All interactive elements keyboard-navigable with visible focus rings
- Respect `prefers-reduced-motion` (already partially implemented in index.css)
