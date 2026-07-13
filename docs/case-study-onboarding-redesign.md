# Cutting time-to-value: re-weighting the onboarding of a net-worth tracker

**Role:** Product design + front-end implementation (solo, alongside a dev)
**Surface:** First-run setup for *William*, the redesign of a personal net-worth / FIRE tracker
**Stack I built in:** Figma (design system + screens), React + TypeScript + Tailwind (shipped)
**Outcome in one line:** Reduced the required onboarding from **~12 screens to 3**, and moved the rest to contextual, dismissible dashboard cards — without dropping a single capability.

---

## TL;DR

The old setup was a 9-step linear wizard (12 screens counting FIRE's four sub-steps) that asked users to configure everything *before* they saw a single number. I ran a cognitive-load audit, found the flow was paying too much attention-cost for too little visible value, and re-weighted it: **keep only what's needed to reach the dashboard, defer the rest to where it's actually relevant.** The result is a 3-step flow (Name → Portfolio → Done) plus a "Finish setting up" strip on the dashboard. I designed it in Figma (three direction explorations, an interactive prototype, mobile + desktop) and shipped it in code behind a reversible route flip.

---

## The lens I designed against

Everything in this product is judged against one thesis:

> **UI prominence ∝ frequency of use × relevance in context.**

And a persona — **"The Intentional Investor":** financially literate, FIRE-minded, wants *confidence and trust*, moves between two modes — a fast daily *check* and a weekly *deep dive*. Onboarding is their very first impression, so the cost of getting it wrong is the highest cost in the product: abandonment before value.

---

## The problem

The classic wizard, in order:

```
1 Name → 2 Privacy → 3 Currency → 4 Portfolio → 5 Import →
6 Cards → 7 FIRE (×4 sub-steps) → 8 Sync → 9 Done
```

Nine steps. FIRE alone was four sequential screens ("FIRE setup · 1 of 4"). The **payoff — the dashboard — was dead last.** A user had to read, decide, and type across roughly twelve screens before the product showed them anything about their money.

That's the exact shape of **digital fatigue**: the user knows what they want, but each screen taxes a little more attention than the reward is worth, and eventually they quit.

---

## Method: a cognitive-load audit

Rather than redesign on taste, I audited the flow against four failure modes — *cost paid vs. value returned*, not aesthetics:

| Lens | The failure in one line |
|---|---|
| No visual priority | Everything shouts equally; the eye has nowhere to land. |
| Effort > value | The work asked exceeds the reward the user can see. |
| Needless choice | The user decides what the system already knows. |
| Vague words | Copy states a fact instead of telling the user what to do. |

### Findings (ranked by severity)

**High — Effort > value: ~12 screens before any payoff.** The dashboard was the final screen. Users spend effort against a running estimate of return; when the return is invisible for twelve screens, the rational move is to quit — and onboarding is exactly where they do.

**High — FIRE as four mandatory sub-steps.** FIRE is a *low-frequency, deep-dive* feature. Four screens of financial modeling during first-run is the single biggest effort spike, for something most users won't touch on day one. This is my own thesis inverted: high prominence for a low-frequency task.

**High — Privacy was a no-input reading wall.** Step 2 was four bullet points and a warning, right after the name, with nothing to *do*. Pure reading tax at the moment momentum matters most.

**Medium — Currency was a full step for an answer we could infer.** A dedicated screen to pick a currency the system had already defaulted.

**Medium — "Skip" vs "Continue" were the same on optional steps.** Import / Cards / Sync each showed *Back · Continue* **and** a "Skip" link — two ways to do one thing, a tiny decision repeated on every optional step.

**Medium — Vague, system-centric copy.** "Choose the approach that works best for you" doesn't help anyone *decide*.

---

## The redesign: re-weight, don't redecorate

The core move was one restructure that fixed the three High findings at once:

> **Cut the required path to what's needed to reach value; defer everything else to where it's actually relevant.**

### Required path: 9 steps → 3

```
BEFORE (9 steps, ~12 screens, all required)
Name → Privacy → Currency → Portfolio → Import → Cards → FIRE×4 → Sync → Done

AFTER (3 required; the rest optional & contextual)
1 Name        (+ currency inferred inline, + one-line privacy note)
2 Portfolio   Simple → value  |  Detailed → import (inline, skippable)
3 You're set → Dashboard
              └─ dashboard "Finish setting up" cards (dismissible):
                 Add payment cards · Set your FIRE goal · Sync devices · Import
```

### Decision → principle → before/after

**Currency — infer, don't ask** *(Needless choice)*
The system already defaults currency; I detect it from the device locale and show it as an editable line under the name field rather than a standalone screen.
`before:` a whole "What's your main currency?" step → `after:` `Currency · $ USD · Change`

**Privacy — one line, not a wall** *(Effort > value)*
Deleted the reading-wall step; folded it into a single reassurance line under the name input, with the "keep a backup" warning moved to Settings where it's actionable.
`before:` 4-bullet interstitial → `after:` *"Your data stays on this device unless you turn on sync."*

**FIRE — split configuration from monitoring** *(Effort > value + Needless choice)*
This is the cleanest expression of the thesis. FIRE *monitoring* (the progress card) is glanceable and stays on the dashboard; FIRE *configuration* (the assumptions) is rare, so it moves off the critical path into a single dismissible "Set your FIRE goal" card that opens the assumptions modal in place.
`before:` 4 mandatory onboarding screens → `after:` 1 optional dashboard card

**Optional data (Cards / Sync / Import) — offer, don't gate.** Redrawn as dismissible "Finish setting up" cards on the dashboard. Each **auto-hides once its task is done** (derived from real state), so the strip shrinks as the user fills the product in. This also killed the Skip/Continue ambiguity — optional work no longer lives as a gated step.

**Copy — guide, don't state** *(Vague words)*

| Before | After |
|---|---|
| "Let's get your personal finance tracker set up." | "Takes about a minute — you can change anything later." |
| *(currency step)* "What's your main currency?" | *(inline)* "Currency · ₪ ILS · **Change**" |
| "Choose the approach that works best for you." | "You can switch anytime." |
| Simple: "Track one total value" | "One total number. Fastest to start." |
| Detailed: "Add individual holdings" | "Track each holding with live prices." |
| "Do you pay with any cards?" | "Add your payment cards" / "So spending groups by card. Optional." |

---

## Exploration: three directions, one decision

I didn't assume a layout. I built the same step (Currency) in three directions so the choice was concrete, not abstract:

- **A — Centered single-column:** calm, neutral, effortless mobile parity.
- **B — Split-screen:** a context rail carrying progress + reassurance; premium but desktop-only.
- **C — Editorial full-bleed:** oversized hero type; distinctive but risky on long questions / small screens.

We chose **A** — it's the most William-consistent, scales 1:1 to mobile, and keeps attention on the single question. Presenting real options (built with real design-system components and bound tokens, so both light and dark worked) meant the decision was made on evidence, not a mockup.

---

## The interaction that carries the story: a reactive Step 2

Step 2 is where the product only asks for the value it actually needs, *after* the user says which kind of investor they are:

- On load, neither option is selected, the body is empty, and **Continue is disabled** — you can't advance without choosing (this also removed the old skip/continue ambiguity).
- Pick **Simple** → the *current portfolio value* field animates in.
- Pick **Detailed** → instead, a dashed *import drop-zone* animates in.

The reveal is a genuine animation, prototyped with Smart Animate in Figma and implemented in code as a measure-free CSS `grid-rows: 0fr → 1fr` height transition. Because the shell is pinned and only the body changes, it reads as a smooth reveal, not a jump.

> **Effort follows intent** — the interface asks for exactly one thing, and only once you've told it what kind of answer you have.

---

## Responsive by construction

Every step was designed at desktop and 375px mobile together: the question type steps down, the Simple/Detailed cards stack, buttons go full-width, and the "Finish setting up" cards move from a 3-up grid to a vertical stack. Same tokens, same copy, same mono labels — just re-flowed.

---

## From design to code (and a safe rollout)

I implemented the whole thing, not just designed it:

- `/william/setup` — the 3-step flow, holding input locally and committing to the stores once on finish (so Back-navigation never writes partial or duplicate data).
- A dashboard **"Finish setting up"** section whose cards derive "done" from real store state and persist dismissals; the FIRE and Import cards open their modals **inline** (I extracted the FIRE assumptions modal so it's reusable) rather than bouncing the user to another page.
- A guard so the demo-seed never pollutes a genuine setup.

**Reversible rollout:** I built it as a parallel route first, validated it end-to-end in the browser, *then* flipped the root redirect to make it the default — a one-line change I can revert. Design → build → verify → ship, in one loop.

---

## Outcome

- **Required onboarding: ~12 screens → 3.** Time-to-first-value drops from a dozen screens of configuration to under a minute.
- **Zero capability lost.** Everything the old wizard configured is still reachable — just re-weighted to match how often it actually matters.
- **A flow that gets *lighter* as you use it:** the dashboard's setup cards disappear as their tasks complete.

---

## What I'd measure next

This case is reasoned, not yet validated with users. If I had analytics I'd watch: **setup completion rate**, **drop-off per step** (I'd expect the old FIRE sub-steps to have been a cliff), **time-to-dashboard**, and **"Finish setting up" card completion vs. dismissal** — the last one tells me whether deferring those tasks actually gets them done, or just gets them ignored. That's the real test of "defer, don't drop."

---

## Process notes (the honest part)

- I ran this as a **design-critique loop** with a clear editor, and **changed direction on evidence** — the whole "defer to the dashboard" move came out of the audit, not the initial brief.
- I **verified feasibility against the real codebase** before committing to interactions (the animated reveal is CSS, no new dependency; the modals already existed).
- The unglamorous 20%: a shekel (₪) glyph silently dropped in one font weight, and stray emojis in copy — both caught and fixed in a polish pass, because onboarding is a trust surface and small breakages read as sloppiness.

*Design-system, tokens, and component details for this work live alongside the William design system; the shipped flow is at `/william/setup`.*
