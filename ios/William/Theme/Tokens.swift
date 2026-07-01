import SwiftUI
import UIKit

// MARK: - Color tokens (mirrored from src/styles/william.css, light + dark)
// Single source of truth = the Figma Color collection. These mirror it for SwiftUI.

extension UIColor {
    fileprivate convenience init(rgb: UInt) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}

extension Color {
    /// Dynamic color that resolves per light/dark trait.
    init(light: UInt, dark: UInt) {
        self.init(uiColor: UIColor { trait in
            UIColor(rgb: trait.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

/// Semantic color tokens. Identity rule: color appears only on money direction —
/// `positive` (lime) / `negative` (orange). Everything else is neutral; accent is ink.
enum WColor {
    static let bg          = Color(light: 0xFFFFFF, dark: 0x171717)
    static let surface     = Color(light: 0xFFFFFF, dark: 0x171717)
    static let surfaceSunken = Color(light: 0xF5F5F5, dark: 0x0A0A0A)
    static let surfaceRaised = Color(light: 0xFAFAFA, dark: 0x262626)
    static let border      = Color(light: 0xE5E5E5, dark: 0x404040)

    static let ink         = Color(light: 0x171717, dark: 0xFFFFFF) // text-primary / accent
    static let secondary   = Color(light: 0x525252, dark: 0xD4D4D4)
    static let muted       = Color(light: 0x737373, dark: 0xA3A3A3)

    static let inverse     = Color(light: 0xA3A3A3, dark: 0xE5E5E5) // primary button (mid-grey, intentional)
    static let onInverse   = Color(light: 0xFFFFFF, dark: 0x171717)
    static let accentBg    = Color(light: 0xF5F5F5, dark: 0x262626)

    static let positive    = Color(light: 0x4D7C0F, dark: 0xBEF264) // up / income
    static let positiveBg  = Color(light: 0xD6F377, dark: 0x1A2E05)
    static let negative    = Color(light: 0xF97316, dark: 0xF97316) // down / spend
    static let negativeBg  = Color(light: 0xFED7AA, dark: 0x431407)
}

// MARK: - Spacing & radius (mirrors the Spacing/Radius collections)
enum WSpace {
    static let xs: CGFloat = 4
    static let s:  CGFloat = 8
    static let m:  CGFloat = 12
    static let l:  CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
}

enum WRadius {
    static let sm:   CGFloat = 8
    static let md:   CGFloat = 12
    static let card: CGFloat = 20   // standard card
    static let full: CGFloat = 999
}
