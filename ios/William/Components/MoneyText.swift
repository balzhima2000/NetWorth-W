import SwiftUI

enum Money {
    static func string(_ value: Double, code: String = "USD", signed: Bool = false) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = code
        f.maximumFractionDigits = (abs(value) >= 1000 || value.rounded() == value) ? 0 : 2
        let s = f.string(from: NSNumber(value: abs(value))) ?? "\(value)"
        if signed { return (value >= 0 ? "+" : "−") + s }
        return s
    }
}

/// A monetary value. `delta: true` colors it by money direction (lime up / orange down)
/// and shows a sign; totals (`delta: false`) stay neutral ink.
struct MoneyText: View {
    let value: Double
    var code: String = "USD"
    var delta: Bool = false
    var font: Font = WFont.mono(15)

    var body: some View {
        Text(Money.string(value, code: code, signed: delta))
            .font(font)
            .monospacedDigit()
            .foregroundStyle(delta ? (value >= 0 ? WColor.positive : WColor.negative) : WColor.ink)
    }
}
