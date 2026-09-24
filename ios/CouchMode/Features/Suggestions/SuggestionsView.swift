import CouchModeCore
import CouchModeData
import SwiftUI

/// AI-powered suggestions based on the user's library (Claude via the
/// `suggest-shows` edge function). Port of the web app's SuggestionsPage.
struct SuggestionsView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services

    @State private var suggestions: [AISuggestion] = []
    @State private var loadedFor: [String]? = nil
    @State private var isLoading = false
    @State private var errorMessage: String? = nil

    var body: some View {
        let titles = library.library.titles

        List {
            if !visible.isEmpty {
                Section {
                    ForEach(visible) { suggestion in
                        SearchResultRow(result: suggestion.tmdb, subtitle: suggestion.reason)
                    }
                } footer: {
                    TMDBAttribution()
                }
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if !library.hasLoaded || (isLoading && suggestions.isEmpty) {
                VStack(spacing: 12) {
                    ProgressView()
                    if isLoading { Text("Finding shows you might like…").font(.footnote).foregroundStyle(.secondary) }
                }
            } else if titles.isEmpty {
                ContentUnavailableView("No suggestions yet", systemImage: "sparkles",
                                       description: Text("Add some shows to your rotation and we'll suggest similar ones you might enjoy."))
            } else if let errorMessage {
                ContentUnavailableView {
                    Label("Couldn't load suggestions", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(errorMessage)
                } actions: {
                    Button("Try Again") { Task { await load(titles, force: true) } }
                }
            } else if loadedFor != nil, visible.isEmpty {
                ContentUnavailableView {
                    Label("Nothing new to suggest", systemImage: "magnifyingglass")
                } description: {
                    Text("Looks like you've already added the shows similar to what you watch. Try refreshing or adding more shows.")
                } actions: {
                    Button("Refresh") { Task { await load(titles, force: true) } }
                }
            }
        }
        .navigationTitle("Suggested for You")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await load(titles, force: true) }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(isLoading || titles.isEmpty)
            }
        }
        .refreshable { await load(titles, force: true) }
        .task(id: titles) { await load(titles, force: false) }
        .showDetailDestination()
    }

    /// Suggestions minus anything already in the library.
    private var visible: [AISuggestion] {
        suggestions.filter { !library.library.contains(tmdbId: $0.tmdb.id) }
    }

    private func load(_ titles: [String], force: Bool) async {
        guard library.hasLoaded, !titles.isEmpty else { return }
        // Adding a suggested show changes the title list; keep the current
        // results rather than re-asking Claude unless the user refreshes.
        if !force, loadedFor != nil { return }
        isLoading = true
        defer { isLoading = false }
        do {
            suggestions = try await services.tmdb.suggestions(for: titles)
            loadedFor = titles
            errorMessage = nil
        } catch is CancellationError {
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
