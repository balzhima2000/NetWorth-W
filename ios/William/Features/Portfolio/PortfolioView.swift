import SwiftUI

/// Portfolio slice — reads from the shared `WilliamStore`.
struct PortfolioView: View {
    @Environment(WilliamStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: WSpace.xl) {
                    summary
                    allocation
                    holdings
                }
                .padding(WSpace.l)
            }
            .background(WColor.bg)
            .navigationTitle("Portfolio")
        }
    }

    private var summary: some View {
        WCard {
            VStack(alignment: .leading, spacing: WSpace.s) {
                Text("Portfolio value").wEyebrow()
                Text(Money.string(store.portfolioValue)).font(WFont.mono(36, .heavy)).foregroundStyle(WColor.ink)
                HStack(spacing: WSpace.s) {
                    MoneyText(value: store.portfolioGain, delta: true)
                    Text("· +\(store.portfolioGainPct, specifier: "%.1f")% all time")
                        .font(WFont.small).foregroundStyle(WColor.muted)
                }
                Divider().background(WColor.border).padding(.vertical, WSpace.xs)
                infoRow("Invested", Money.string(store.invested))
                infoRow("Positions", "\(store.holdings.count)")
            }
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(WFont.bodyMed).foregroundStyle(WColor.secondary)
            Spacer()
            Text(value).font(WFont.mono(15)).foregroundStyle(WColor.ink)
        }
    }

    private var allocation: some View {
        WCard {
            VStack(alignment: .leading, spacing: WSpace.m) {
                Text("Allocation").wEyebrow()
                AllocationBar(segments: store.allocation)
                VStack(spacing: WSpace.s) {
                    ForEach(store.allocation) { s in
                        HStack(spacing: WSpace.s) {
                            Circle().fill(s.color).frame(width: 8, height: 8)
                            Text(s.label).font(WFont.bodyMed).foregroundStyle(WColor.ink)
                            Spacer()
                            Text("\(Int(s.pct * 100))%").font(WFont.mono(15)).foregroundStyle(WColor.secondary)
                        }
                    }
                }
            }
        }
    }

    private var holdings: some View {
        WCard(padding: 0) {
            VStack(spacing: 0) {
                Text("Holdings").font(WFont.h2).foregroundStyle(WColor.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, WSpace.xl).padding(.top, WSpace.l + 2).padding(.bottom, WSpace.m)
                ForEach(Array(store.holdings.enumerated()), id: \.element.id) { i, h in
                    if i > 0 { Divider().background(WColor.border) }
                    HoldingRow(h: h)
                }
            }
        }
    }
}

private struct AllocationBar: View {
    let segments: [AllocSlice]
    var body: some View {
        GeometryReader { geo in
            let gap: CGFloat = 3
            let usable = geo.size.width - gap * CGFloat(max(0, segments.count - 1))
            HStack(spacing: gap) {
                ForEach(segments) { s in
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(s.color)
                        .frame(width: max(4, usable * s.pct))
                }
            }
        }
        .frame(height: 14)
    }
}

private struct HoldingRow: View {
    let h: Holding
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: WSpace.s) {
                    Text(h.ticker).font(WFont.inter(15, .semibold)).foregroundStyle(WColor.ink)
                    Text(h.market)
                        .font(WFont.inter(11, .medium)).foregroundStyle(WColor.secondary)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(WColor.surfaceSunken, in: Capsule())
                }
                Text("\(Int(h.shares)) × \(Money.string(h.price))")
                    .font(WFont.mono(12)).foregroundStyle(WColor.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                Text(Money.string(h.value)).font(WFont.mono(15)).foregroundStyle(WColor.ink)
                Text("\(h.returnPct >= 0 ? "+" : "−")\(abs(h.returnPct).formatted())%")
                    .font(WFont.mono(12))
                    .foregroundStyle(h.returnPct >= 0 ? WColor.positive : WColor.negative)
            }
        }
        .padding(.horizontal, WSpace.xl).padding(.vertical, WSpace.m + 1)
    }
}

#Preview { PortfolioView().environment(WilliamStore()) }
