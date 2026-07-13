# William — redesigning a net-worth tracker, end to end

**Role:** Product design + front-end implementation (solo, alongside one dev)
**Scope:** Full redesign — a token-driven design system, then every screen: dashboard, portfolio, spending, all-transactions, recurring, trends, FIRE, account, and onboarding
**Built in:** Figma (variables + components + screens, Light **and** Dark) and React / TypeScript / Tailwind (shipped)

I took a functional-but-noisy finance app and rebuilt it into a calm, trustworthy product — auditing each surface, deciding on evidence, encoding the decisions as design tokens, and shipping the result in production code, not just mockups.

> **How to read this:** every chapter is a *problem we hit* → *what I did* → a **bold takeaway**. Skim the headers and bold lines for the story in a minute; read the rest for the reasoning.

---

## The through-line

One rule drove every decision:

> **UI prominence ∝ how often it's used × how relevant it is right now.**

Designed for **"the Intentional Investor"** — financially literate, FIRE-minded, wanting *confidence and trust*. They live in two modes: a fast daily **check** and a weekly **deep dive**. I designed the check first, and let the deep dive be one tap away.

## Where it started

The app worked but felt like a spreadsheet with a skin: decorative color, drop-shadows, mismatched number styles, a mobile "+" that hid its purpose, and a 9-step setup before you saw anything. I didn't start in Figma. I started with an **audit** — where does each screen spend the user's attention, and what do they get back? — and with a reference study of a product I admired, pulling its *system rules* rather than copying its screens.

---

## Problems and moves

### 1 — Onboarding buried the payoff
**Problem:** a 9-step wizard (12 screens counting FIRE's sub-steps) made users configure everything *before* seeing a single number.
**Move:** cut the required path to **3 steps** (Name → Portfolio → Done) — infer currency from locale, reduce privacy to one line, and defer cards/FIRE/sync/import to dismissible "Finish setting up" cards on the dashboard that auto-hide as they're completed.
**Result:** time-to-value fell from ~12 screens to 3, with **zero capability lost**. A flow that gets *lighter* as you use it. *(Deep dive: `case-study-onboarding-redesign.md`.)*

### 2 — A floating "+" that hid intent
**Problem:** the mobile "+" FAB was ambiguous (add *what?*) and floated over content.
**Move:** replaced it with three labeled actions on the dashboard — **Trade / Income / Expense** — plus contextual, labeled buttons on each screen.
**Detail:** this was the decision I *reversed on evidence* — I'd sketched a cleaner FAB first, then abandoned it once the ambiguity showed.
**Takeaway:** **name the action; don't hide it behind a guess.**

### 3 — Numbers that didn't feel trustworthy
**Problem:** figures used inconsistent fonts and spacing. Small — but on a finance app, sloppy numbers read as an untrustworthy product.
**Move:** one tabular treatment for every number (aligned digits, comma thousands, a mono readout face), a Display-weight hero for net worth, and **fluid, container-query sizing** so a 7-to-9-figure value scales to fit its card instead of overflowing.
**Takeaway:** **consistency is the cheapest trust you can buy.**

### 4 — Color as decoration, not signal
**Problem:** color was sprinkled to decorate, so it carried no meaning.
**Move:** committed to **"color = money direction."** A cool grey/white base, a *monochrome* accent (black in light, white in dark), and **only two chromatic colors — lime = up, orange = down — used solely on gains and losses.** The whole dashboard is greyscale except where money actually moves.
**Detail:** I considered and rejected a violet accent; and I kept one honest tradeoff — orange-as-text on white fails WCAG AA (~2.8:1). I accepted it for the identity and *documented the risk* rather than hiding it.
**Takeaway:** **restraint reads as credibility; color should be information.**

### 5 — Depth that leaned on shadows and clutter
**Problem:** elevation came from drop-shadows and boxes-in-boxes, adding noise.
**Move:** re-derived depth as **tone + a hairline** — a white surface on a grey canvas, no shadows — and encoded it entirely in tokens. Nesting communicates ownership; borders are reserved for controls and floating chrome, not cards.
**Result:** I could restyle the entire material by editing **~14 variables**, with no per-screen rework.
**Takeaway:** **put the decision in the token layer, and one edit moves everything.**

### 6 — FIRE overwhelmed the dashboard
**Problem:** a full FIRE calculator sat on the home screen — a rare, heavy task crowding out the daily glance.
**Move:** split **configuration** (rare → its own page and a modal) from **monitoring** (glanceable → a small, segmented progress card on the dashboard).
**Takeaway:** **separate the thing you set once from the thing you check daily.** The thesis, applied literally.

### 7 — Sorting that pretended to be view-switching
**Problem:** the holdings table used a Value / Gain / Return segmented control — which *implies switching views*, not sorting.
**Move:** replaced it with sortable column headers (all three always show a faint arrow so sortability is obvious); on **desktop** you click a column to flip direction, on **mobile** an explicit `DESCENDING / ASCENDING` toggle lives in the sort dropdown, since tap-to-flip doesn't read on touch.
**Takeaway:** **match the control to the user's mental model, not the layout's convenience.**

### 8 — Allocation drift wanted to look like a loss
**Problem:** once you set target allocations, "drift" (over/under target) is tempting to color like gain/loss.
**Move:** kept drift strictly **neutral** — grey target ticks and neutral "vs target" chips — because a balance is not a delta.
**Takeaway:** **don't spend a semantic color on a non-semantic thing.**

### 9 — States were missing or inconsistent
**Problem:** components had a "happy path" but no defined hover / pressed / focus / disabled / empty / error / loading states — so the product felt unfinished at the edges and left dev guessing.
**Move:** built **states as a system**. Every interactive component documents its full set; I added Skeleton, EmptyState, Alert, and ChartTooltip as first-class components; the Button alone ships nine variants across type and state.
**Takeaway:** **the last 20% — the states — is 80% of the perceived polish.**

### 10 — Dark mode as an afterthought
**Problem:** dark mode usually means maintaining a second copy of everything.
**Move:** semantic tokens with **Light / Dark modes generate both from one source**; only a few intentional per-theme exceptions (e.g. allocation-bar tints, which vanish in dark) are tuned by hand and documented as deliberate.
**Takeaway:** **Light and Dark should stay in sync by construction, not by discipline.**

---

## The design system underneath

The screens are the visible part; the leverage was the system beneath them.

- **Tokens first.** Four variable collections — Primitives, Color (Light/Dark), Spacing, Radius — with **27 semantic `color/*` tokens** (surfaces, text, lines, money, a categorical chart palette) that map **1:1 to CSS variables**, so design and code can't drift.
- **A full component library, not a sticker sheet.** Buttons (+ in-card and destructive variants), action buttons, inputs / selects / segmented toggles, cards (static and interactive), lists, tables, charts, badges, chips, nav (desktop pill + mobile tab bar), modals (composed from atomic blocks), a month picker, and more — each with its states, in Light and Dark.
- **A living reference.** A Documentation board shows every component and state in both themes, with dev-mode notes — the single source of truth for handoff.
- **Type + material as tokens too.** A typeface migration (Instrument Sans replacing Inter across 900+ nodes, Geist Mono for figures) and the shadowless material both live in variables, so they propagate everywhere at once.

**Takeaway:** **I don't hand over screens; I hand over a system that makes the next screen cheap and consistent.**

---

## Thinking ahead: iOS

The redesign is structured so a native SwiftUI app can reuse the William language directly, with Apple's **Liquid Glass** applied *only* to system chrome (nav, sheets) while content stays in the William visual system — platform-native where it should be, brand-consistent where it matters.
**Takeaway:** **design the system so the next platform is an extension, not a rewrite.**

---

## How I worked

- **Audit before aesthetics.** Every change ties to attention-cost vs. value returned, not to taste.
- **A design-critique loop, and course-changes on evidence.** I built real options (three onboarding directions; an interactive, animated Step 2) and let the evidence decide — including reversing my own first idea (the FAB).
- **Feasibility checked against the real codebase** before committing — charts in Recharts, the reveal animation in pure CSS, no new dependencies.
- **Shipped it.** I implemented the redesign in React/TypeScript/Tailwind and rolled it out behind a **reversible route flip** — design → build → verify-in-browser → ship, in one loop. I even seeded realistic placeholder data so every screen demos full, never empty.

---

## Outcomes

- **Onboarding: ~12 screens → 3 required**, with the rest deferred to context.
- **A coherent, token-driven design system** — 27 semantic tokens, a full component set, Light + Dark from one source — spanning every screen of the app.
- **A single visual language** where color means money, depth means ownership, and prominence means frequency — greyscale except where money moves.
- **Designed and shipped**, not just designed.

## What I'd validate next

The redesign is *reasoned*, not yet user-tested. Given analytics I'd watch setup completion and per-step drop-off, time-to-dashboard, and whether the deferred "Finish setting up" cards actually get completed or just dismissed — the real test of "defer, don't drop."

---

## What this shows

I can take a product from **audit to shipped code**: find the real problem (cost vs. value, not decoration), tie every fix to a principle, build a design system that keeps design and engineering in lockstep, and write the production front-end myself. That's the jump I've been making — from making things look good to making product decisions that ship.
