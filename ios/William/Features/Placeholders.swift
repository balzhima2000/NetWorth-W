import SwiftUI

/// Stub for the not-yet-built tabs, so the shell runs end-to-end.
struct PlaceholderScreen: View {
    let title: String
    var body: some View {
        NavigationStack {
            VStack(spacing: WSpace.s) {
                Text(title).font(WFont.h1).foregroundStyle(WColor.ink)
                Text("Coming next").font(WFont.body).foregroundStyle(WColor.muted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(WColor.bg)
            .navigationTitle(title)
        }
    }
}
