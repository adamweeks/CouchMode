import CouchModeCore
import CouchModeData
import SwiftUI

/// Search TMDB for a show to add. Presented from the + button on My Shows.
struct SearchView: View {
    @Environment(AppServices.self) private var services
    @Environment(LibraryStore.self) private var library
    @Environment(\.dismiss) private var dismiss

    @State private var query = ""
    @State private var results: [TMDBSearchResult] = []
    @State private var isSearching = false
    @State private var errorMessage: String? = nil

    var body: some View {
        List {
            ForEach(results) { result in
                SearchResultRow(result: result, isAdded: library.library.contains(tmdbId: result.id))
            }
            if !results.isEmpty {
                TMDBAttribution().listRowBackground(Color.clear)
            }
        }
        .overlay {
            if isSearching && results.isEmpty {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView("Search failed", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
            } else if query.trimmingCharacters(in: .whitespaces).count > 2, results.isEmpty, !isSearching {
                ContentUnavailableView.search(text: query)
            } else if results.isEmpty {
                ContentUnavailableView("Find a show", systemImage: "magnifyingglass",
                                       description: Text("Search TMDB for a show to add to your rotation."))
            }
        }
        .navigationTitle("Add a Show")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search TV shows")
        .autocorrectionDisabled()
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") { dismiss() }
            }
        }
        .task(id: query) { await search() }
        .showDetailDestination()
    }

    private func search() async {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard q.count > 2 else {
            results = []
            errorMessage = nil
            return
        }
        try? await Task.sleep(for: .milliseconds(350))
        guard !Task.isCancelled else { return }
        isSearching = true
        defer { isSearching = false }
        do {
            results = try await services.tmdb.search(q)
            errorMessage = nil
        } catch is CancellationError {
        } catch {
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }
}

/// A TMDB search/suggestion result that opens the show's detail screen.
struct SearchResultRow: View {
    let result: TMDBSearchResult
    var isAdded = false
    var subtitle: String?

    var body: some View {
        NavigationLink(value: ShowRoute(tmdbId: result.id, preview: result)) {
            HStack(spacing: 12) {
                PosterImage(url: TMDBImage.posterURL(result.posterPath))
                VStack(alignment: .leading, spacing: 2) {
                    Text(result.name)
                        .font(.body.weight(.semibold))
                        .lineLimit(2)
                    if let line = subtitleLine {
                        Text(line)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(3)
                    }
                }
                Spacer(minLength: 4)
                if isAdded {
                    Text("Added")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 4)
        }
    }

    private var subtitleLine: String? {
        let year = Formatting.year(result.firstAirDate)
        switch (subtitle, year) {
        case let (s?, y?): return "\(s) · \(y)"
        case let (s?, nil): return s
        case let (nil, y?): return y
        default: return nil
        }
    }
}
