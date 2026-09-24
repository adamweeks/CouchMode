import Foundation

// Swift port of the web app's src/lib/progressLogic.ts. Keep the two in sync:
// behaviour here is covered by CouchModeCoreTests/ProgressLogicTests.swift,
// which mirrors src/lib/progressLogic.test.ts.

/// Anything with a season/episode position.
public protocol EpisodePositioned {
    var season: Int { get }
    var episode: Int { get }
}

public struct EpisodeRef: Hashable, Sendable, Codable, EpisodePositioned {
    public var season: Int
    public var episode: Int

    public init(season: Int, episode: Int) {
        self.season = season
        self.episode = episode
    }

    public init(_ position: some EpisodePositioned) {
        self.init(season: position.season, episode: position.episode)
    }

    /// Key used to de-duplicate logs, matching the web app's `"${s}x${e}"`.
    public var key: String { "\(season)x\(episode)" }
}

public enum ProgressLogic {
    public static func comparePosition(_ a: some EpisodePositioned, _ b: some EpisodePositioned) -> Int {
        if a.season != b.season { return a.season - b.season }
        return a.episode - b.episode
    }

    /// The highest-position log entry, or nil when there are none.
    public static func currentProgress<Log: EpisodePositioned>(_ logs: [Log]) -> Log? {
        guard var best = logs.first else { return nil }
        for log in logs.dropFirst() where comparePosition(log, best) > 0 {
            best = log
        }
        return best
    }

    public static func isRegression(season: Int, episode: Int, current: (any EpisodePositioned)?) -> Bool {
        guard let current else { return false }
        return comparePosition(EpisodeRef(season: season, episode: episode), EpisodeRef(current)) < 0
    }

    public static func isSeriesComplete(season: Int, episode: Int, totalSeasons: Int, episodesPerSeason: [Int]) -> Bool {
        guard season == totalSeasons else { return false }
        guard totalSeasons >= 1, totalSeasons - 1 < episodesPerSeason.count else { return false }
        return episode >= episodesPerSeason[totalSeasons - 1]
    }

    public static func nextEpisode(
        after current: (any EpisodePositioned)?,
        totalSeasons: Int,
        episodesPerSeason: [Int]
    ) -> EpisodeRef? {
        func count(_ season: Int) -> Int? {
            let index = season - 1
            return episodesPerSeason.indices.contains(index) ? episodesPerSeason[index] : nil
        }

        guard let current else {
            if totalSeasons >= 1 {
                for s in 1...totalSeasons where (count(s) ?? 0) > 0 {
                    return EpisodeRef(season: s, episode: 1)
                }
            }
            return EpisodeRef(season: 1, episode: 1)
        }

        let maxEp = count(current.season) ?? 1
        if current.episode < maxEp {
            return EpisodeRef(season: current.season, episode: current.episode + 1)
        }

        if current.season + 1 <= totalSeasons {
            for s in (current.season + 1)...totalSeasons where (count(s) ?? 0) > 0 {
                return EpisodeRef(season: s, episode: 1)
            }
        }
        return nil
    }

    /// Log rows for every episode before the target that isn't already logged.
    public static func backfillEntries(
        targetSeason: Int,
        targetEpisode: Int,
        episodesPerSeason: [Int],
        existing: Set<String>,
        rewatchId: String,
        userId: String,
        now: Date
    ) -> [NewProgressLog] {
        var entries: [NewProgressLog] = []

        if targetSeason > 1 {
            for s in 1..<targetSeason {
                let count = episodesPerSeason.indices.contains(s - 1) ? episodesPerSeason[s - 1] : 0
                guard count >= 1 else { continue }
                for e in 1...count where !existing.contains("\(s)x\(e)") {
                    entries.append(NewProgressLog(rewatchId: rewatchId, userId: userId, season: s, episode: e, loggedAt: now))
                }
            }
        }

        if targetEpisode > 1 {
            for e in 1..<targetEpisode where !existing.contains("\(targetSeason)x\(e)") {
                entries.append(NewProgressLog(rewatchId: rewatchId, userId: userId, season: targetSeason, episode: e, loggedAt: now))
            }
        }

        return entries
    }

    /// The rewatch update payload when marking a series finished. If the
    /// completion date precedes the rewatch's start (and no explicit start was
    /// given), the start is pulled back to the completion date.
    public static func completionUpdates(
        completedAt: Date,
        currentStartedAt: Date,
        startedAt: Date? = nil,
        note: String? = nil
    ) -> RewatchCompletion {
        var update = RewatchCompletion(completedAt: completedAt, note: note)
        if let startedAt {
            update.startedAt = startedAt
        } else if completedAt < currentStartedAt {
            update.startedAt = completedAt
        }
        return update
    }

    public static func countWatchedEpisodes(episodesPerSeason: [Int], progress: some EpisodePositioned) -> Int {
        episodesPerSeason.prefix(max(0, progress.season - 1)).reduce(0, +) + progress.episode
    }

    /// Whole-percent progress through a show, 0 when there are no episodes.
    public static func percentComplete(episodesPerSeason: [Int], progress: (any EpisodePositioned)?) -> Int {
        let total = episodesPerSeason.reduce(0, +)
        guard total > 0, let progress else { return 0 }
        let watched = countWatchedEpisodes(episodesPerSeason: episodesPerSeason, progress: EpisodeRef(progress))
        return Int((Double(watched) / Double(total) * 100).rounded())
    }

    // MARK: - Air status

    // TMDB series statuses that mean more episodes are expected.
    static let returningStatuses: Set<String> = ["returning series", "in production", "pilot", "planned"]

    public static func isReturningSeries(_ air: AirStatus?) -> Bool {
        guard let air else { return false }
        if air.nextEpisode != nil { return true }
        return returningStatuses.contains((air.status ?? "").lowercased())
    }

    /// True when the viewer has watched up to (or past) the most recent aired
    /// episode of a show that is still returning.
    public static func isCaughtUp(_ current: (any EpisodePositioned)?, air: AirStatus?) -> Bool {
        guard let current, isReturningSeries(air), let last = air?.lastAired else { return false }
        return comparePosition(EpisodeRef(current), EpisodeRef(last)) >= 0
    }

    public static func isUnaired(_ airDate: String?, now: Date = Date(), calendar: Calendar = .current) -> Bool {
        guard let airDate, let days = Formatting.daysUntil(airDate, now: now, calendar: calendar) else { return false }
        return days > 0
    }
}

/// Update payload for `rewatches` when marking a series finished.
public struct RewatchCompletion: Encodable, Hashable, Sendable {
    public var completedAt: Date
    public var status: RewatchStatus = .completed
    public var note: String?
    public var startedAt: Date?
    public var service: String?

    enum CodingKeys: String, CodingKey {
        case completedAt = "completed_at"
        case status
        case note
        case startedAt = "started_at"
        case service
    }

    public init(completedAt: Date, note: String? = nil, startedAt: Date? = nil, service: String? = nil) {
        self.completedAt = completedAt
        self.note = note
        self.startedAt = startedAt
        self.service = service
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(completedAt, forKey: .completedAt)
        try c.encode(status, forKey: .status)
        // note and service are always written (null clears them); started_at
        // only when it should change.
        try c.encode(note, forKey: .note)
        try c.encode(service, forKey: .service)
        try c.encodeIfPresent(startedAt, forKey: .startedAt)
    }
}
