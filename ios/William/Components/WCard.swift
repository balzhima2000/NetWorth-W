import SwiftUI

/// Flat hairline card — the William content surface. No shadow; elevation = a 1px
/// border only. Continuous (concentric) corners to sit well under the OS glass chrome.
struct WCard<Content: View>: View {
    var padding: CGFloat = WSpace.xl
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(WColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: WRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: WRadius.card, style: .continuous)
                    .stroke(WColor.border, lineWidth: 1)
            )
    }
}
