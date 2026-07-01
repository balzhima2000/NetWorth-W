import SwiftUI
import Charts

/// Dashboard slice — reads from the shared `WilliamStore`.
struct DashboardView: View {
    @Environment(WilliamStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: WSpace.xl) {
                    hero
                    HStack(spacing: WSpace.l) {
                        statCard("Portfolio", store.portfolioValue, delta: store.portfolioGain)
                        statCard("This month", -store.monthSpent, isSpend: true)
                    }
                    netWorthChart
                    recents
                }
                .padding(WSpace.l)
            }
            .background(WColor.bg)
            .navigationTitle("William")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var hero: some View {
        WCard(padding: WSpace.xxl) {
            VStack(alignment: .leading, spacing: WSpace.s) {
                Text("Net worth").wEyebrow()
                Text(Money.string(store.netWorth)).font(WFont.mono(44, .heavy)).foregroundStyle(WColor.ink)
                HStack(spacing: WSpace.s) {
                    MoneyText(value: store.netWorthDelta, delta: true)
                    Text("· +\(store.netWorthPct, specifier: "%.1f")% this month")
                        .font(WFont.small).foregroundStyle(WColor.muted)
                }
            }
        }
    }

    private func statCard(_ label: String, _ value: Double, delta: Double? = nil, isSpend: Bool = false) -> some View {
        WCard {
            VStack(alignment: .leading, spacing: WSpace.s) {
                Text(label).wEyebrow()
                Text(Money.string(value)).font(WFont.mono(22, .semibold))
                    .foregroundStyle(isSpend ? WColor.negative : WColor.ink)
                if let delta { MoneyText(value: delta, delta: true, font: WFont.mono(13)) }
            }
        }
    }

    private var netWorthChart: some View {
        WCard {
            VStack(alignment: .leading, spacing: WSpace.m) {
                Text("Net worth · 6 mo").wEyebrow()
                Chart(store.netWorthSeries) { p in
                    AreaMark(x: .value("Month", p.month), y: .value("Value", p.value))
                        .foregroundStyle(LinearGradient(colors: [WColor.ink.opacity(0.12), WColor.ink.opacity(0)],
                                                        startPoint: .top, endPoint: .bottom))
                        .interpolationMethod(.catmullRom)
                    LineMark(x: .value("Month", p.month), y: .value("Value", p.value))
                        .foregroundStyle(WColor.ink)
                        .interpolationMethod(.catmullRom)
                }
                .chartYAxis(.hidden)
                .frame(height: 150)
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

#Preview { DashboardView().environment(WilliamStore()) }
