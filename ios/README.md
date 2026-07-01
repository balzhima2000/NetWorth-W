# William — iOS (SwiftUI)

Native iOS app for William, targeting **iOS 26** so the navigation/control chrome
uses Apple's **Liquid Glass** system material for free. Separate codebase from the
React web app; they share the **design language + tokens**, not code.

## Division of labor
- **Chrome → the OS.** `TabView`, `.sheet`, `Menu`, toolbars are system components →
  Liquid Glass automatically. We do **not** build custom glass.
- **Content → ours.** Hairline cards (`WCard`, no shadow), money-direction color
  (`MoneyText`: lime up / orange down; totals stay neutral ink), type scale, tokens.
- **Tokens** (`Theme/Tokens.swift`) mirror `src/styles/william.css` (light + dark) and
  the Figma Color collection — Figma stays the source of truth.

## Build (⚠️ not built in this environment — build in Xcode)
This was scaffolded as source only; compile it in Xcode 26+ on macOS.

Option A — XcodeGen (recommended):
```
brew install xcodegen
cd ios
xcodegen generate
open William.xcodeproj
```
Option B — manual: File ▸ New ▸ Project ▸ iOS App (SwiftUI), set Deployment Target
to iOS 26.0, delete the template `ContentView`/`App`, and drag the `William/` folder in.

## Structure
```
William/
  App/WilliamApp.swift        @main + RootTabView (system Liquid Glass tab bar)
  Theme/Tokens.swift          colors (light/dark) · spacing · radius
  Theme/Typography.swift      type scale + eyebrow
  Components/WCard.swift       flat hairline card
  Components/MoneyText.swift   money formatting + direction color
  Features/Dashboard/…         the vertical slice
  Features/Placeholders.swift  stub tabs
```

## TODO (next slices)
- Fonts: add **Inter** (UI) + **Geist Mono** (numbers) to the target + `UIAppFonts`, then point `WFont` at them.
- Port real data (net worth, transactions) — likely a shared API/store.
- Build out Portfolio / Spending / FIRE / Account from the Figma library content components.
- Charts via **Swift Charts**, suppressing default shadows to keep the flat look.
