# Fonts

The type scale (`Theme/Typography.swift`) already references **Inter** (UI) and
**Geist Mono** (numbers) via `Font.custom`. Until the files are added it falls back
to the system font automatically — safe to run as-is.

## To enable the real fonts
1. Drop the `.ttf` files into this folder, e.g.:
   `Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf`, `Inter-Black.ttf`,
   `GeistMono-Medium.ttf`, `GeistMono-SemiBold.ttf`.
2. Add them to the **William** target (check "Target Membership").
3. Register them in **Info.plist** under `UIAppFonts` (Fonts provided by application):
   ```xml
   <key>UIAppFonts</key>
   <array>
     <string>Inter-Regular.ttf</string>
     <string>Inter-Medium.ttf</string>
     <string>Inter-SemiBold.ttf</string>
     <string>Inter-Black.ttf</string>
     <string>GeistMono-Medium.ttf</string>
     <string>GeistMono-SemiBold.ttf</string>
   </array>
   ```
4. Confirm the family names map to `"Inter"` and `"Geist Mono"` (print
   `UIFont.familyNames` if unsure) — `WFont` uses those exact family strings.

Sources: Inter — rsms.me/inter · Geist Mono — vercel.com/font (both OFL-licensed).
