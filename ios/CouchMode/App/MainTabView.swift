import CouchModeCore
import SwiftUI

/// The four main tabs, matching the web app's bottom nav.
struct MainTabView: View {
    enum Tab: Hashable { case shows, suggested, history, settings }

    @State private var selection: Tab = .shows

    var body: some View {
        TabView(selection: $selection) {
            NavigationStack { RotationView() }
                .tabItem { Label("My Shows", systemImage: "tv") }
                .tag(Tab.shows)

            NavigationStack { SuggestionsView() }
                .tabItem { Label("Suggested", systemImage: "sparkles") }
                .tag(Tab.suggested)

            NavigationStack { HistoryView() }
                .tabItem { Label("History", systemImage: "book") }
                .tag(Tab.history)

            NavigationStack { SettingsView() }
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(Tab.settings)
        }
    }
}

/// Navigation value for a show's detail screen. `preview` lets the detail
/// screen paint a title and poster before TMDB responds.
struct ShowRoute: Hashable {
    var tmdbId: Int
    var preview: TMDBSearchResult?

    init(tmdbId: Int, preview: TMDBSearchResult? = nil) {
        self.tmdbId = tmdbId
        self.preview = preview
    }

    init?(show: Show) {
        guard let id = Int(show.tmdbId) else { return nil }
        self.init(tmdbId: id, preview: TMDBSearchResult(id: id, name: show.title))
    }
}

extension View {
    /// Registers the show-detail destination on a NavigationStack.
    func showDetailDestination() -> some View {
        navigationDestination(for: ShowRoute.self) { route in
            ShowDetailView(route: route)
        }
    }
}
