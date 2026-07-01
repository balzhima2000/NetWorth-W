import SwiftUI

/// Budget / progress bar. Under budget = neutral ink fill; over budget = negative orange.
struct WProgressBar: View {
    let value: Double // 0...1 (or >1 when over)
    private var over: Bool { value > 1 }
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(WColor.surfaceSunken)
                Capsule()
                    .fill(over ? WColor.negative : WColor.ink)
                    .frame(width: max(6, min(1, value) * geo.size.width))
            }
        }
        .frame(height: 6)
    }
}
