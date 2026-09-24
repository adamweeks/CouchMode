import CouchModeCore
import CouchModeData
import SwiftUI

/// "My Shows" — the home screen. Port of the web app's RotationPage: the
/// Continue Watching card, then Watching / Caught Up / Up Next / Done, with a
/// search field that filters the library and also searches TMDB.
struct RotationView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(PreferencesStore.self) private var preferences
    @Environment(AppServices.self) private var services

    @State private var query = ""
    @State private var logSheetState: ShowState? = nil
    @State private var actionsState: ShowState? = nil
    @State private var isAddingShow = false

    var body: some View {
        let groups = library.groups()
        let filtered = groups.filtered(by: query)
        let trimmedQuery = query.trimmingCharacters(in: .whitespaces)

        List {
            if trimmedQuery.isEmpty, preferences.preferences.showResumeCard, let resume = library.library.resumeState {
                Section {
                    ResumeCard(state: resume, mode: preferences.preferences.resumeCardMode) {
                        actionsState = resume
                    }
                }
                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                .listRowBackground(Color.clear)
            }

            if !filtered.watching.isEmpty {
                Section("Watching") {
                    ForEach(filtered.watching) { state in
                        ShowRow(state: state, showStatusLabel: false) { actionsState = state }
                    }
                }
            }

            if !filtered.caughtUp.isEmpty {
                Section("Caught Up") {
                    ForEach(filtered.caughtUp) { state in
                        ShowRow(state: state) { actionsState = state }
                    }
                }
            }

            if !filtered.queue.isEmpty {
                Section {
                    ForEach(Array(filtered.queue.enumerated()), id: \.element.id) { index, state in
                        QueueRow(state: state, position: index + 1) { actionsState = state }
                    }
                    .onMove(perform: trimmedQuery.isEmpty ? queueMoveHandler(groups.queue) : nil)
                } header: {
                    Text("Up Next")
                } footer: {
                    if filtered.queue.count > 1, trimmedQuery.isEmpty {
                        Text("Touch and hold a show to reorder.")
                    }
                }
            }

            if preferences.preferences.showDoneSection, !filtered.done.isEmpty {
                Section("Done") {
                    ForEach(filtered.done) { state in
                        ShowRow(state: state, showStatusLabel: false) { actionsState = state }
                    }
                }
            }

            if trimmedQuery.count > 2 {
                TMDBSearchSection(query: trimmedQuery)
            } else if !trimmedQuery.isEmpty, filtered.isEmpty {
                Text("No shows match “\(trimmedQuery)”")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if !library.hasLoaded {
                ProgressView()
            } else if groups.isEmpty, trimmedQuery.isEmpty {
                ContentUnavailableView {
                    Label("No shows yet", systemImage: "tv")
                } description: {
                    Text(library.loadError ?? "Search above or tap + to find a show and start tracking your rewatches.")
                } actions: {
                    Button("Find a Show") { isAddingShow = true }
                        .buttonStyle(.borderedProminent)
                }
            }
        }
        .navigationTitle("My Shows")
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Find a show…")
        .autocorrectionDisabled()
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    isAddingShow = true
                } label: {
                    Label("Add Show", systemImage: "plus")
                }
            }
        }
        .refreshable { await library.load() }
        .task { await library.refreshMetadataIfNeeded() }
        .showDetailDestination()
        .logActions(for: $actionsState) { logSheetState = $0 }
        .sheet(item: $logSheetState) { state in
            LogEpisodeSheet(state: state)
        }
        .sheet(isPresented: $isAddingShow) {
            NavigationStack { SearchView() }
        }
    }

    private func queueMoveHandler(_ queue: [ShowState]) -> (IndexSet, Int) -> Void {
        { source, destination in moveQueue(queue, from: source, to: destination) }
    }

    private func moveQueue(_ queue: [ShowState], from source: IndexSet, to destination: Int) {
        var ids = queue.map(\.id)
        ids.move(fromOffsets: source, toOffset: destination)
        Task {
            do {
                try await library.reorderQueue(ids)
            } catch {
                services.toasts.error(error)
            }
        }
    }
}

/// "On TMDB" results for the home-screen search.
private struct TMDBSearchSection: View {
    let query: String
    @Environment(AppServices.self) private var services
    @Environment(LibraryStore.self) private var library
    @State private var results: [TMDBSearchResult] = []
    @State private var searchedQuery: String? = nil
    @State private var failed = false

    var body: some View {
        Section("On TMDB") {
            if searchedQuery != query {
                ProgressView().frame(maxWidth: .infinity)
            } else if failed {
                Text("Couldn't search TMDB. Check your connection.").foregroundStyle(.secondary)
            } else if results.isEmpty {
                Text("No results on TMDB for “\(query)”").foregroundStyle(.secondary)
            } else {
                ForEach(results) { result in
                    SearchResultRow(result: result, isAdded: library.library.contains(tmdbId: result.id))
                }
            }
        }
        .task(id: query) {
            // Debounce typing.
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            do {
                results = try await services.tmdb.search(query)
                failed = false
            } catch is CancellationError {
                return
            } catch {
                guard !Task.isCancelled else { return }
                failed = true
            }
            searchedQuery = query
        }
    }
}
