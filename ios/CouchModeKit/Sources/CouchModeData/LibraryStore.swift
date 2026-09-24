import CouchModeCore
import Foundation
import Observation

/// The signed-in user's library, loaded from Supabase and kept in memory.
/// Screens read derived state (groups, per-show state, history) from here and
/// call its mutations, each of which reloads the snapshot afterwards — the
/// native equivalent of the web app's React Query invalidation.
@MainActor
@Observable
public final class LibraryStore {
    public private(set) var snapshot = LibrarySnapshot(shows: [], rewatches: [], logs: [])
    public private(set) var library = Library()
    public private(set) var hasLoaded = false
    public private(set) var isLoading = false
    public private(set) var loadError: String?

    public let userId: String
    @ObservationIgnored public let repository: LibraryRepository
    @ObservationIgnored private var refreshedMetadata = false

    public init(repository: LibraryRepository, userId: String) {
        self.repository = repository
        self.userId = userId
    }

    // MARK: - Loading

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            apply(try await repository.fetchSnapshot())
            loadError = nil
        } catch is CancellationError {
            return
        } catch {
            loadError = error.localizedDescription
        }
        hasLoaded = true
    }

    private func apply(_ snapshot: LibrarySnapshot) {
        self.snapshot = snapshot
        library = snapshot.library
    }

    /// Refreshes stale TMDB metadata once per launch, then reloads if needed.
    public func refreshMetadataIfNeeded() async {
        guard !refreshedMetadata else { return }
        refreshedMetadata = true
        if (try? await repository.refreshStaleMetadata()) == true {
            await load()
        }
    }

    // MARK: - Derived state

    public func groups(sortedBy sort: ShowSort = .addedAt) -> ShowGroups {
        library.groups(sortedBy: sort)
    }

    public func state(forTMDBId tmdbId: String) -> ShowState? {
        library.state(forTMDBId: tmdbId)
    }

    public var history: HistoryStats {
        HistoryStats(rewatches: snapshot.rewatches, shows: snapshot.shows)
    }

    // MARK: - Mutations

    @discardableResult
    public func addShow(_ result: TMDBSearchResult, service: String?) async throws -> Show {
        let show = try await repository.addShow(result, service: service, userId: userId)
        await load()
        return show
    }

    public func removeShow(_ show: Show) async throws {
        try await repository.removeShow(id: show.id)
        await load()
    }

    /// Reorders Up Next. Applied locally first so the list doesn't jump.
    public func reorderQueue(_ orderedShowIds: [String]) async throws {
        var shows = snapshot.shows
        for (index, id) in orderedShowIds.enumerated() {
            if let i = shows.firstIndex(where: { $0.id == id }) { shows[i].sortOrder = index }
        }
        apply(LibrarySnapshot(shows: shows, rewatches: snapshot.rewatches, logs: snapshot.logs))
        do {
            try await repository.updateQueueOrder(showIds: orderedShowIds)
        } catch {
            await load()
            throw error
        }
    }

    public func logEpisode(_ state: ShowState, season: Int, episode: Int) async throws -> LogResult {
        guard let rewatch = state.activeRewatch else { throw LibraryError.noActiveRewatch }
        let result = try await repository.logEpisode(
            show: state.show, rewatchId: rewatch.id, season: season, episode: episode, userId: userId
        )
        await load()
        return result
    }

    public func undoLog(ids: [String]) async throws {
        try await repository.deleteLogs(ids: ids)
        await load()
    }

    public func resetRewatch(_ state: ShowState) async throws {
        guard let rewatch = state.activeRewatch else { throw LibraryError.noActiveRewatch }
        try await repository.resetRewatch(id: rewatch.id)
        await load()
    }

    public func markFinished(_ state: ShowState, startedAt: Date?, completedAt: Date, note: String?, service: String?) async throws {
        guard let rewatch = state.activeRewatch else { throw LibraryError.noActiveRewatch }
        try await repository.markFinished(
            rewatch: rewatch, startedAt: startedAt, completedAt: completedAt, note: note, service: service, userId: userId
        )
        await load()
    }

    public func updateService(_ state: ShowState, service: String?) async throws {
        guard let rewatch = state.activeRewatch else { throw LibraryError.noActiveRewatch }
        try await repository.updateService(rewatchId: rewatch.id, service: service)
        await load()
    }
}

public enum LibraryError: LocalizedError {
    case noActiveRewatch

    public var errorDescription: String? {
        switch self {
        case .noActiveRewatch: return "This show has no rewatch in progress."
        }
    }
}
