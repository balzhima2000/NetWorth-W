import SwiftUI
import Charts

/// Spending slice — reads from the shared `WilliamStore`.
struct SpendingView: View {
    @Environment(WilliamStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: WSpace.xl) {
                    hero
                    HStack(spacing: WSpace.l) {
                        statCard("Income", store.monthIncome, color: WColor.positive)
                        statCard("Net", store.net, color: store.net >= 0 ? WColor.positive : WColor.negative, signed: true)
                    }
                    byCategory
                    budgets
                    recents
                }
                .padding(WSpace.l)
            }
            .background(WColor.bg)
            .navigationTitle("Spending")
        }
    }

    private var hero: some View {
        WCard(padding: WSpace.xxl) {
            VStack(alignment: .leading, spacing: WSpace.s) {
                Text("This month spent").wEyebrow()
                Text(Money.string(store.monthSpent)).font(WFont.mono(44, .heavy)).foregroundStyle(WColor.ink)
                HStack(spacing: WSpace.s) {
                    Text("↑ \(Int(store.monthSpentDeltaPct))%")
                        .font(WFont.mono(12)).foregroundStyle(WColor.negative)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(WColor.negativeBg, in: Capsule())
                    Text("vs last month").font(WFont.small).foregroundStyle(WColor.muted)
                }
            }
        }
    }

    private func statCard(_ label: String, _ value: Double, color: Color, signed: Bool = false) -> some View {
        WCard {
            VStack(alignment: .leading, spacing: WSpace.xs) {
                Text(label).wEyebrow()
                Text(Money.string(value, signed: signed)).font(WFont.mono(22, .semibold)).foregroundStyle(color)
            }
        }
    }

    private var byCategory: some View {
        WCard {
            VStack(alignment: .leading, spacing: WSpace.m) {
                Text("By category").wEyebrow()
                Chart(store.categorySpend) { c in
                    BarMark(x: .value("Category", c.category), y: .value("Amount", c.amount))
                        .foregroundStyle(WColor.ink)
                        .cornerRadius(4)
                }
                .chartYAxis(.hidden)
                .frame(height: 150)
            }
        }
    }

    private var budgets: some View {
        WCard {
            VStack(alignment: .leading, spacing: WSpace.l) {
                HStack {
                    Text("Budgets").font(WFont.h2).foregroundStyle(WColor.ink)
                    Spacer()
                    Text("View all ›").font(WFont.small).foregroundStyle(WColor.secondary)
                }
                ForEach(store.budgets) { b in
                    let over = b.spent > b.limit
                    VStack(spacing: WSpace.s) {
                        HStack {
                            Text(b.label).font(WFont.bodyMed).foregroundStyle(WColor.ink)
                            Spacer()
                            Text("\(Money.string(b.spent)) / \(Money.string(b.limit))")
                                .font(WFont.mono(13)).foregroundStyle(over ? WColor.negative : WColor.secondary)
                        }
                        WProgressBar(value: b.spent / b.limit)
                    }
                }
            }
        }
    }

    private var recents: some View {
        WCard(padding: 0) {
            VStack(spacing: 0) {
                HStack {
                    Text("Recent").font(WFont.h2).foregroundStyle(WColor.ink)
                    Spacer()
                    Text("See all ›").font(WFont.small).foregroundStyle(WColor.secondary)
                }
                .padding(.horizontal, WSpace.xl).padding(.top, WSpace.l + 2).padding(.bottom, WSpace.m)
                ForEach(Array(store.transactions.prefix(4).enumerated()), id: \.element.id) { i, t in
                    if i > 0 { Divider().background(WColor.border) }
                    TransactionRowView(txn: t)
                }
            }
        }
    }
}

#Preview { SpendingView().environment(WilliamStore()) }
