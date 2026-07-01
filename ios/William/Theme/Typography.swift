import SwiftUI

/// Type scale. `Font.custom` falls back to the system font until the .ttf files
/// are added to the target (see Theme/Fonts/README), so it's safe to ship now.
/// UI text = Inter; numbers = Geist Mono.
enum WFont {
    static func inter(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Inter", size: size).weight(weight)
    }
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .medium) -> Font {
        .custom("Geist Mono", size: size).weight(weight)
    }

    static let hero    = inter(44, .black)
    static let h1      = inter(28, .semibold)
    static let h2      = inter(20, .semibold)
    static let title   = inter(17, .semibold)
    static let body    = inter(15, .regular)
    static let bodyMed = inter(15, .medium)
    static let small   = inter(13, .medium)
    static let eyebrow = mono(12, .medium) // uppercase mono label
}

extension View {
    func wEyebrow() -> some View {
        self.font(WFont.eyebrow)
            .tracking(0.6)
            .textCase(.uppercase)
            .foregroundStyle(WColor.secondary)
    }
}
