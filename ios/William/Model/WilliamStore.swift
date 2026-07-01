import SwiftUI

/// Single source of app data. Sample values for now; swap the initializer for a
/// real API/persistence layer later. iOS 17+ `@Observable` — injected via
/// `.environment(store)` at the app root and read with `@Environment(WilliamStore.self)`.
@Observable
final class WilliamStore {
    // Summaries
    var netWorth = 124_860.0
    var netWorthDelta = 2_140.0
    var netWorthPct = 1.7

    var portfolioValue = 42_180.0
    var portfolioGain = 1_268.0
    var portfolioGainPct = 3.1
    var invested = 40_912.0

    var monthSpent = 3_140.0
    var monthIncome = 5_200.0
    var monthSpentDeltaPct = 8.0
    var net: Double { monthIncome - monthSpent }

    // Collections
    var transactions: [Txn] = [
        Txn(name: "Groceries", date: "Today",     amount:   -84.20, color: Color(red: 0.94, green: 0.27, blue: 0.27)),
        Txn(name: "Salary",    date: "Jun 1",     amount:  5_200,   color: WColor.positive),
        Txn(name: "Rent",      date: "Jun 1",     amount: -1_450,   color: Color(red: 0.23, green: 0.51, blue: 0.96)),
        Txn(name: "Coffee",    date: "Yesterday", amount:    -4.50, color: Color(red: 0.96, green: 0.62, blue: 0.04)),
        Txn(name: "Transport", date: "Jun 8",     amount:   -32.00, color: Color(red: 0.02, green: 0.71, blue: 0.83))
    ]

    var holdings: [Holding] = [
        Holding(ticker: "NVDA", market: "Global", shares: 10, price: 130, value: 1_300, returnPct: 30),
        Holding(ticker: "AMD",  market: "Global", shares: 20, price: 55,  value: 1_100, returnPct: 10),
        Holding(ticker: "AAPL", market: "Global", shares: 15, price: 55,  value:   825, returnPct: 10),
        Holding(ticker: "TEVA", market: "TASE",   shares: 10, price: 35,  value:   350, returnPct: -4)
    ]

    var allocation: [AllocSlice] = [
        AllocSlice(label: "NVDA",  pct: 0.32, color: WColor.ink),
        AllocSlice(label: "AMD",   pct: 0.27, color: WColor.positiveBg),
        AllocSlice(label: "AAPL",  pct: 0.20, color: Color(red: 0.6, green: 0.78, blue: 1.0)),
        AllocSlice(label: "Other", pct: 0.21, color: WColor.accentBg)
    ]

    var budgets: [Budget] = [
        Budget(label: "Food & Dining", spent: 420, limit: 500),
        Budget(label: "Transport",     spent: 180, limit: 150),
        Budget(label: "Shopping",      spent: 90,  limit: 300)
    ]

    var netWorthSeries: [MonthPoint] = [
        .init(month: "Jan", value: 108_000), .init(month: "Feb", value: 110_500),
        .init(month: "Mar", value: 114_200), .init(month: "Apr", value: 117_900),
        .init(month: "May", value: 122_700), .init(month: "Jun", value: 124_860)
    ]

    var categorySpend: [CategorySpend] = [
        .init(category: "Rent", amount: 1_450), .init(category: "Food", amount: 620),
        .init(category: "Transport", amount: 180), .init(category: "Shopping", amount: 90),
        .init(category: "Other", amount: 800)
    ]
}
