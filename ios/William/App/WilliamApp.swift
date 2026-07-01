import SwiftUI

@main
struct WilliamApp: App {
    @State private var store = WilliamStore()
    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environment(store)
        }
    }
}

/// The app shell. On iOS 26 a system `TabView` renders with the Liquid Glass
/// tab bar automatically — we do NOT build custom glass. Chrome = system,
/// content = the William language (see the per-tab views).
struct RootTabView: View {
    var body: some View {
        TabView {
            Tab("Dashboard", systemImage: "square.grid.2x2") { DashboardView() }
            Tab("Portfolio", systemImage: "chart.bar") { PortfolioView() }
            Tab("Spending", systemImage: "creditcard") { SpendingView() }
            Tab("FIRE", systemImage: "flame") { PlaceholderScreen(title: "FIRE") }
            Tab("Account", systemImage: "person.crop.circle") { PlaceholderScreen(title: "Account") }
        }
        .tint(WColor.ink)
    }
}

#Preview { RootTabView() }
