import SwiftUI

struct Txn: Identifiable {
    let id = UUID()
    let name: String
    let date: String
    let amount: Double          // negative = expense, positive = income
    let color: Color            // category marker
}

struct Holding: Identifiable {
    let id = UUID()
    let ticker: String
    let market: String          // "Global" / "TASE"
    let shares: Double
    let price: Double
    let value: Double
    let returnPct: Double
}

struct AllocSlice: Identifiable {
    let id = UUID()
    let label: String
    let pct: Double
    let color: Color
}

struct Budget: Identifiable {
    let id = UUID()
    let label: String
    let spent: Double
    let limit: Double
}

/// Net-worth time series point (for the Dashboard chart).
struct MonthPoint: Identifiable {
    let id = UUID()
    let month: String
    let value: Double
}

/// Spending-by-category (for the Spending bar chart).
struct CategorySpend: Identifiable {
    let id = UUID()
    let category: String
    let amount: Double
}
