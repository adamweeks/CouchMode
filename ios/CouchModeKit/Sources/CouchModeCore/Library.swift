import Foundation

/// Everything the app knows about one show in the user's library: the show
/// row plus its rewatches and the progress of the in-progress rewatch.
public struct ShowState: Identifiable, Hashable, Sendable {
    public var show: Show
    /// The single `in_progress` rewatch, if any.
    public var activeRewatch: Rewatch?
    /// Completed rewatches, newest start first.
    public var completedRewatches: [Rewatch]
    /// Highest logged episode in the active rewatch.
    public var currentProgress: ProgressLog?
    /// How many episodes are logged in the active rewatch.
    public var logCount: Int
    /// Most recent `logged_at` in the active rewatch.
    public var lastLoggedAt: Date?

    public var id: String { show.id }

    public init(
        show: Show,
        activeRewatch: Rewatch? = nil,
        completedRewatches: [Rewatch] = [],
        currentProgress: ProgressLog? = nil,
        logCount: Int = 0,
        lastLoggedAt: Date? = nil
    ) {
        self.show = show
        self.activeRewatch = activeRewatch
        self.completedRewatches = completedRewatches
        self.currentProgress = currentProgress
        self.logCount = logCount
        self.lastLoggedAt = lastLoggedAt
    }

    /// Which rewatch the user is on ("#2" = second time through).
    public var rewatchNumber: Int { completedRewatches.count + 1 }

    public var lastCompletedAt: Date? { completedRewatches.compactMap(\.completedAt).max() }

    public var isWatching: Bool { currentProgress != nil }

    public var isDone: Bool { currentProgress == nil && !completedRewatches.isEmpty }

    public var isCaughtUp: Bool { ProgressLogic.isCaughtUp(currentProgress, air: show.airStatus) }

    /// The episode "+1" would log, or nil once the final episode is logged or
    /// there's no active rewatch to log into.
    public var nextEpisode: EpisodeRef? {
        guard activeRewatch != nil else { return nil }
        return ProgressLogic.nextEpisode(
            after: currentProgress,
            totalSeasons: show.totalSeasons,
            episodesPerSeason: show.episodesPerSeason
        )
    }

    public var watchedEpisodes: Int {
        guard let currentProgress else { return 0 }
        return ProgressLogic.countWatchedEpisodes(episodesPerSeason: show.episodesPerSeason, progress: currentProgress)
    }

    public var percentComplete: Int {
        ProgressLogic.percentComplete(episodesPerSeason: show.episodesPerSeason, progress: currentProgress)
    }

    /// Average whole days between consecutive completions, or nil with fewer
    /// than two completed rewatches.
    public var averageDaysBetweenRewatches: Int? {
        let dates = completedRewatches.compactMap(\.completedAt).sorted()
        guard dates.count >= 2 else { return nil }
        let total = zip(dates.dropFirst(), dates).reduce(0.0) { $0 + $1.0.timeIntervalSince($1.1) }
        return Int((total / Double(dates.count - 1) / 86_400).rounded())
    }
}

public enum ShowSort: String, CaseIterable, Sendable {
    case addedAt = "added_at"
    case title
}

/// The four groups on the home screen. See CLAUDE.md "Show Grouping".
public struct ShowGroups: Hashable, Sendable {
    public var watching: [ShowState] = []
    public var caughtUp: [ShowState] = []
    public var queue: [ShowState] = []
    public var done: [ShowState] = []

    public init(watching: [ShowState] = [], caughtUp: [ShowState] = [], queue: [ShowState] = [], done: [ShowState] = []) {
        self.watching = watching
        self.caughtUp = caughtUp
        self.queue = queue
        self.done = done
    }

    public var all: [ShowState] { watching + caughtUp + queue + done }
    public var isEmpty: Bool { all.isEmpty }

    public func filtered(by query: String) -> ShowGroups {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return self }
        let match: (ShowState) -> Bool = { $0.show.title.lowercased().contains(q) }
        return ShowGroups(
            watching: watching.filter(match),
            caughtUp: caughtUp.filter(match),
            queue: queue.filter(match),
            done: done.filter(match)
        )
    }
}

/// An immutable snapshot of the user's library, built from raw table rows.
public struct Library: Hashable, Sendable {
    public private(set) var states: [ShowState]

    public init(states: [ShowState] = []) {
        self.states = states
    }

    /// - Parameters:
    ///   - shows: every `shows` row for the user.
    ///   - rewatches: every `rewatches` row for the user.
    ///   - logs: `progress_logs` for the in-progress rewatches (others are ignored).
    public init(shows: [Show], rewatches: [Rewatch], logs: [ProgressLog]) {
        var activeByShow: [String: Rewatch] = [:]
        var completedByShow: [String: [Rewatch]] = [:]
        for rewatch in rewatches {
            switch rewatch.status {
            case .inProgress: activeByShow[rewatch.showId] = rewatch
            case .completed: completedByShow[rewatch.showId, default: []].append(rewatch)
            }
        }

        var logsByRewatch: [String: [ProgressLog]] = [:]
        for log in logs { logsByRewatch[log.rewatchId, default: []].append(log) }

        states = shows.map { show in
            let active = activeByShow[show.id]
            let activeLogs = active.flatMap { logsByRewatch[$0.id] } ?? []
            return ShowState(
                show: show,
                activeRewatch: active,
                completedRewatches: (completedByShow[show.id] ?? []).sorted { $0.startedAt > $1.startedAt },
                currentProgress: ProgressLogic.currentProgress(activeLogs),
                logCount: activeLogs.count,
                lastLoggedAt: activeLogs.map(\.loggedAt).max()
            )
        }
    }

    public var isEmpty: Bool { states.isEmpty }

    public func state(forShowId id: String) -> ShowState? {
        states.first { $0.show.id == id }
    }

    public func state(forTMDBId tmdbId: String) -> ShowState? {
        states.first { $0.show.tmdbId == tmdbId }
    }

    public func contains(tmdbId: Int) -> Bool {
        state(forTMDBId: String(tmdbId)) != nil
    }

    /// Splits the library into Watching / Caught Up / Up Next / Done.
    public func groups(sortedBy sort: ShowSort = .addedAt) -> ShowGroups {
        let sorted: [ShowState]
        switch sort {
        case .title:
            sorted = states.sorted { $0.show.title.localizedCaseInsensitiveCompare($1.show.title) == .orderedAscending }
        case .addedAt:
            sorted = states.sorted { $0.show.addedAt > $1.show.addedAt }
        }

        var groups = ShowGroups()
        for state in sorted {
            if state.logCount > 0 {
                if state.isCaughtUp {
                    groups.caughtUp.append(state)
                } else {
                    groups.watching.append(state)
                }
            } else if state.completedRewatches.isEmpty {
                groups.queue.append(state)
            } else {
                groups.done.append(state)
            }
        }

        // Up Next follows the user's manual order; unordered shows go last.
        groups.queue = groups.queue.stableSorted { ($0.show.sortOrder ?? .max) < ($1.show.sortOrder ?? .max) }

        // Done: most recently finished first.
        groups.done = groups.done.stableSorted {
            ($0.lastCompletedAt ?? .distantPast) > ($1.lastCompletedAt ?? .distantPast)
        }
        return groups
    }

    /// The show for the "Continue Watching" card: the in-progress rewatch with
    /// the most recent log.
    public var resumeState: ShowState? {
        states
            .filter { $0.activeRewatch != nil && $0.currentProgress != nil && $0.lastLoggedAt != nil }
            .max { $0.lastLoggedAt! < $1.lastLoggedAt! }
    }

    /// Show titles to seed AI suggestions with (the edge function caps at 30).
    public var titles: [String] { states.map(\.show.title) }
}

extension Array {
    /// Sort that keeps the existing order of elements that compare equal
    /// (Swift's `sorted` makes no stability guarantee).
    func stableSorted(by areInIncreasingOrder: (Element, Element) -> Bool) -> [Element] {
        enumerated()
            .sorted { a, b in
                if areInIncreasingOrder(a.element, b.element) { return true }
                if areInIncreasingOrder(b.element, a.element) { return false }
                return a.offset < b.offset
            }
            .map(\.element)
    }
}
