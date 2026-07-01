# William — Design System Library Spec (for the Figma rebuild)

Goal: make **every** element of the app a real Figma **component set** (`combineAsVariants`) with
its full variant matrix, so you can open the library and know *exactly* which component + props to
drop into any new screen. This replaces the static-picture "Documentation" page (the mess) with a
proper, instance-backed library.

Status: **awaiting your approval of this spec.** Nothing in Figma is built/changed yet.
File: `WMI3ZpbuD4zvKIe4yqFA5A`.

---

## 1. Conventions (LOCKED)

- **One component set per component**, built with `combineAsVariants`, shown in the dashed variant
  container (like the reference file's `Dialog Body`).
- **Light only in the component sets. Dark is shown in the Examples boards** (mode-swapped
  full-screen examples — `Examples → Light` / `Examples → Dark`), exactly like the reference.
  Theme is **not** a variant property. Fills stay variable-bound so the dark examples just swap the
  Color mode.
- **Device IS a variant property on every set** — `Device = {Desktop, Mobile}` everywhere (your
  call). Where a component is visually identical across breakpoints the two variants are identical;
  that still documents "use on both."
- **Size is a Button-only property** (L/M/S/XS). No other component gets Size.
- Every fill/stroke/text **bound to a token** (no raw hex).
- Each set sits under a **section header** + a one-line **usage caption** ("Use for…").
- Leading icons are **instance-swap slots**, not variants.

> Counts below were written with Theme×2 — now Theme is dropped (÷2) and Device added (×2), so most
> net out similar. Button = Style 4 × Size 4 × State 6 × Device 2 = **192** (light).

---

## 2. Library page structure (new "Components" page)

Replaces the Documentation page. Vertical sections, each a labelled band:

1. **Foundations** — color tokens (light+dark swatches), type scale, spacing, radius, **chart palette**, icon grid.
2. **Buttons** — Button, Action Button, + Usage map.
3. **Navigation** — NavBar (desktop/mobile), NavItem, Chip.
4. **Inputs & Forms** — Input, Select, Textarea, Menu, MenuItem, Segment, RangeSelector, Month picker, Sort control.
5. **Data display** — Card (+ types), Badge, list/Transaction row, Recents, Allocation bar, Holdings row.
6. **Charts** — Bar, Donut, Progress/Budget bar, Net-worth line, + their color tokens.
7. **Feedback & overlays** — Alert, Skeleton, EmptyState, ChartTooltip, Modal/Sheet.
8. **Patterns (composed)** — Hero/Summary cards, Stat card, Nav card, Budget card — instances assembled from the atoms.
9. **Examples** — Light & Dark full-screen boards (Dashboard / Portfolio / Spending / Account) as integration references.

---

## 3. Component catalog (set name · variant props · est. count · usage)

> Counts assume Theme×2. ⚠️ = variant explosion to review/trim.

### Buttons
| Set | Variant properties | ~Count | Usage |
|---|---|---|---|
| **Button** | Style {Primary, Secondary, Ghost, **Danger**} × Size {L, M, S, XS} × State {Default, Hover, Pressed, Focus, Disabled, Loading} × Theme | **384** ⚠️ | every standard button |
| **Action Button** | Action {Trade, Income, Expense} × State {Default, Hover, Pressed} × Theme | 18 | dashboard 54px action circles |

**⚠️ Button is the big one.** 384 is faithful to "every state of every size" but heavy to build/maintain.
Suggested trim (recommend): full Style×Size at **Default**; then State {Hover,Pressed,Focus,Disabled,Loading}
shown at **M only**, per style. → ~ (4×4) + (4×5) = 36 ×2 themes = **72**. Tell me: **full 384** or **trimmed 72**.

### Navigation
| Set | Variant properties | ~Count | Usage |
|---|---|---|---|
| **NavItem** | State {Active, Inactive, Hover} × Device {Desktop, Mobile} × Theme | 12 | one nav entry |
| **NavBar** | Device {Desktop (FloatingNav), Mobile (TabBar)} × Theme | 4 | the whole nav bar (composed) |
| **Chip** | Style {Neutral, Outline, Inverse} × Theme | 6 | tags / filters |

### Inputs & Forms
| Set | Variant properties | ~Count | Usage |
|---|---|---|---|
| **Input** | State {Default, Focus, Error, Disabled} × Theme | 8 | text fields |
| **Select** | State {Default, Focus} × Theme | 4 | dropdowns (mono ▾) |
| **Textarea** | State {Default, Focus} × Theme | 4 | multiline |
| **MenuItem** | State {Default, Hover, Selected} × Theme | 6 | menu/list option |
| **Menu** | Theme | 2 | popover container |
| **Segment** | State {Default, Hover, Selected, Pressed, Focus} × Theme | 10 | segmented control unit |
| **RangeSelector** | Theme (composed 1W/1M/1Y/YTD/ALL) | 2 | time range |
| **Month picker** | State {Closed (pill), Open (popover)} × Theme | 4 | Spending month/year |
| **Sort control** | State {Closed, Open} × Theme | 4 | Holdings sort (XS pill + menu) |

### Data display
| Set | Variant properties | ~Count | Usage |
|---|---|---|---|
| **Card** | Type {Default, Interactive} × State {Default, Hover, Pressed, Focus} × Theme | 16 | base surface |
| **Badge** | Tone {Positive, Negative, Neutral, Accent} × Theme | 8 | inline status / delta |
| **TransactionRow** | Type {Expense, Income} × Theme (⚠️ Device? rows are identical — leaving Device off) | 4 | list/Recents rows |
| **HoldingRow** | Market {Global, TASE} × Sign {Gain, Loss} × Theme | 8 | Portfolio holdings table row |
| **AllocationBar** | State {Default, Drift (target ticks)} × Theme | 4 | portfolio allocation bar |

### Charts (new — see §4)
| Set | Variant properties | ~Count | Usage |
|---|---|---|---|
| **BarChart** | Theme | 2 | spending-by-period bars |
| **DonutChart** | Theme | 2 | category / allocation donut |
| **ProgressBar** | State {Under, Over} × Theme | 4 | budget progress |
| **LineChart** | State {Actual, Projected} × Theme | 4 | net-worth over time |

### Feedback & overlays
| Set | Variant properties | ~Count | Usage |
|---|---|---|---|
| **Alert** | Tone {Error, Info, Success, Warning} × Theme | 8 | inline banners |
| **Skeleton** | Theme | 2 | loading placeholder |
| **EmptyState** | Theme | 2 | empty list/section |
| **ChartTooltip** | Theme | 2 | hover readout |
| **Modal / Sheet** | Type {Dialog (desktop), Sheet (mobile)} × Theme | 4 | overlays |

### Patterns (composed instances, documented as components)
HeroSpend · SummaryCard (portfolio value) · StatCard (Income/Net/Invested) · NavCard (Recurring/Trends/Account rows) · BudgetCard · Recents card · Holdings card. Theme ×2 each.

---

## 4. Charts — color rules to bake in
Per CLAUDE.md chart rule: chart fills use **`color/accent` · `color/positive-bg` · `color/blue-bg` · `color/accent-bg`** in that order; `chart-1..5` for >4 series. **Never** `positive`/`negative` (reserved for money deltas), never raw hex. Each chart component documents which token each segment/series binds to, light + dark.

---

## 5. Usage map (screen element → component + props)
A board that answers "what do I use here?":
- **Add trade / Add** → `Button` Primary · M · +plus icon (toolbar) / L (modal CTA, empty state).
- **Refresh, Import** → `Button` Secondary · M · leading icon.
- **Set / Edit targets** → `Button` Secondary · S · target icon.
- **Cancel (destructive)**, **Delete / Reset** → `Button` Danger.
- **Sort trigger** → Sort control (XS pill).
- **Recents list** → Recents card = Card + TransactionRow×n + "See all" link.
- **Allocation** → AllocationBar (+ Drift state) + Badge (drift chips, neutral).
- **Budgets** → BudgetCard = Card + ProgressBar (Under/Over) rows.
- … (full list filled in during build).

---

## 6. Build order (after approval)
1. Foundations refresh (tokens/type/spacing/radius/chart palette/icons).
2. **Button** (validate variant-container pattern vs reference) → checkpoint.
3. Navigation (NavItem, NavBar, Chip).
4. Inputs & Forms (extend existing sets to full state matrices).
5. Data display (Card types, Badge, rows, AllocationBar).
6. Charts.
7. Feedback & overlays.
8. Patterns + Usage map.
9. Light/Dark example boards.

Each step: build → screenshot → you confirm → next.

---

## 7. Decisions — RESOLVED
1. ✅ Components **Light only**; **Dark in Examples boards**.
2. ✅ **Device forced on every set** ({Desktop, Mobile}).
3. ✅ **Size = Button only.**
4. ✅ Scope approved — build it all, starting with Button to validate the variant-container pattern.
