# William — redesigning a net-worth tracker, end to end

**Role:** Product design + front-end implementation (solo, alongside one dev)
**Scope:** Full redesign — design system, dashboard, portfolio, spending, FIRE, account, onboarding
**Built in:** Figma (tokens + components + screens) and React / TypeScript / Tailwind (shipped)

I took a functional-but-noisy finance app and rebuilt it as a calm, trustworthy product — auditing each surface, deciding on evidence, and shipping the result in code, not just mockups.

---

## The through-line

One rule drove every decision:

> **UI prominence ∝ how often it's used × how relevant it is right now.**

Designed for **"the Intentional Investor"** — financially literate, FIRE-minded, wanting *confidence*. They live in two modes: a fast daily **check** and a weekly **deep dive**. I designed the check first.

Below are the problems I found, and what I did about them.

---

## 1 — Onboarding buried the payoff

**Problem:** a 9-step wizard (12 screens counting FIRE's sub-steps) made users configure everything *before* seeing a single number.
**Move:** cut the required path to **3 steps** (Name → Portfolio → Done); infer currency, reduce privacy to a line, and defer cards/FIRE/sync/import to dismissible "Finish setting up" cards on the dashboard that auto-hide as they're done.
**Result:** time-to-value dropped from ~12 screens to 3 — with zero capability lost. *(Full write-up: `case-study-onboarding-redesign.md`.)*

## 2 — A floating "+" that hid intent

**Problem:** a mobile "+" FAB was ambiguous (add what?) and covered content.
**Move:** replaced it with three labeled action buttons on the dashboard — **Trade / Income / Expense** — plus contextual actions on each screen.
**Result:** the primary actions name themselves; nothing is hidden behind a guess. **Prominence follows intent, not convention.**

## 3 — Numbers that didn't feel trustworthy

**Problem:** figures used inconsistent fonts and spacing — small, but on a finance app it reads as sloppy, and sloppy erodes trust.
**Move:** one tabular type treatment for every number (aligned digits, comma thousands), a Display-weight hero for the net-worth figure, and fluid sizing so a 7-figure value never overflows its card.
**Result:** the numbers finally look *engineered*. **Consistency is the cheapest trust you can buy.**

## 4 — Color as decoration, not signal

**Problem:** color was used to decorate, which meant it carried no meaning.
**Move:** committed to **"color = money direction"** — a cool grey/white base, a monochrome (black/white) accent, and **only two chromatic colors: lime = up, orange = down**, applied solely to gains and losses. The dashboard is greyscale except where money actually moves.
**Result:** color became information. (Honest tradeoff: orange-as-text on white fails WCAG AA at ~2.8:1 — I accepted it for the identity and documented the risk rather than hiding it.) **Restraint reads as credibility.**

## 5 — Depth that leaned on shadows and clutter

**Problem:** elevation came from drop-shadows and borders, adding visual noise.
**Move:** studied a reference product's *system* (not its screens), and re-derived depth as **tone + a hairline** — a white surface on a grey canvas, no shadows — encoded entirely in design tokens.
**Result:** the whole material shifted by editing ~14 variables, not by reworking screens. **Design decisions belong in the token layer, so one edit moves everything.**

## 6 — FIRE overwhelmed the dashboard

**Problem:** a full FIRE calculator sat on the home screen — a rare, heavy task competing with the daily glance.
**Move:** split **configuration** (rare → its own page / a modal) from **monitoring** (glanceable → a small progress card on the dashboard).
**Result:** the home screen stays a fast check; the deep dive is one tap away when you want it. The thesis, applied literally.

---

## How I worked

- **Tokens first, then components, then screens.** Semantic tokens produce Light and Dark from a single source and map 1:1 to CSS variables — so design and code never drift.
- **States as a system.** Every interactive component ships its full set (default / hover / pressed / focus / disabled / loading), not just the happy path.
- **Decided on evidence.** I built real options (e.g. three onboarding directions) and changed course based on them; I verified feasibility against the actual codebase (charts in Recharts, animations in CSS) *before* committing to an interaction.
- **Shipped it.** I implemented the redesign in React/TypeScript and rolled it out behind a reversible route — design → build → verify → ship, in one loop.

---

## What this shows

I can take a product from **audit to shipped code**: find the real problem (cost vs. value, not taste), tie every fix to a principle, build a design system that keeps design and engineering in sync, and hand off — or write — production front-end. Not decoration. Product thinking that ships.
