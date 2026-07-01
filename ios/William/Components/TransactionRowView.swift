import SwiftUI

/// One transaction row — category color dot + name/date, amount colored by direction.
/// Shared by Dashboard and Spending recents.
struct TransactionRowView: View {
    let txn: Txn
    var showDate = true

    var body: some View {
        HStack(spacing: WSpace.m) {
            Circle().fill(txn.color).frame(width: 10, height: 10)
            VStack(alignment: .leading, spacing: 1) {
                Text(txn.name).font(WFont.bodyMed).foregroundStyle(WColor.ink)
                if showDate {
                    Text(txn.date).font(WFont.inter(12, .medium)).foregroundStyle(WColor.muted)
                }
            }
            Spacer()
            MoneyText(value: txn.amount, delta: true)
        }
        .padding(.horizontal, WSpace.xl)
        .padding(.vertical, WSpace.m + 1)
    }
}
