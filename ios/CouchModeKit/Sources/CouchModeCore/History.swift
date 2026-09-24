import Foundation

/// Stats and year groupings for the History tab. Port of the calculations in
/// the web app's src/pages/HistoryPage.tsx.
public struct HistoryStats: Hashable, Sendable {
    public struct Entry: Hashable, Sendable, Identifiable {
        public var rewatch: Rewatch
        public var show: Show
        public var completedAt: Date
        public var id: String { rewatch.id }
    }

    public struct YearGroup: Hashable, Sendable, Identifiable {
        public var year: Int
        public var entries: [Entry]
        public var id: Int { year }
    }

    public var totalRewatches: Int
    public var showsRewatched: Int
    public var episodesWatched: Int
    /// Estimated hours, assuming ~42 minutes per episode of scripted TV.
    public var estimatedHours: Int
    /// Average whole days from start to finish, nil when there's nothing to average.
    public var averageDaysPerRewatch: Int?
    public var rewatchesThisYear: Int
    public var currentYear: Int
    /// The show finished most often, only reported when it's been finished more than once.
    public var mostRewatched: (show: Show, count: Int)?
    /// Completed rewatches grouped by completion year, newest year first.
    public var years: [YearGroup]

    public static func == (lhs: HistoryStats, rhs: HistoryStats) -> Bool {
        lhs.totalRewatches == rhs.totalRewatches && lhs.years == rhs.years
            && lhs.mostRewatched?.show == rhs.mostRewatched?.show && lhs.mostRewatched?.count == rhs.mostRewatched?.count
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(years)
    }

    /// - Parameters:
    ///   - rewatches: rewatch rows; only completed ones with a completion date count.
    ///   - shows: the user's shows, used to resolve titles and episode counts.
    public init(rewatches: [Rewatch], shows: [Show], now: Date = Date(), calendar: Calendar = .current) {
        let showsById = Dictionary(shows.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let completed = rewatches
            .filter { $0.status == .completed && $0.completedAt != nil }
            .sorted { $0.completedAt! > $1.completedAt! }

        totalRewatches = completed.count
        showsRewatched = Set(completed.map(\.showId)).count
        episodesWatched = completed.reduce(0) { $0 + (showsById[$1.showId]?.totalEpisodes ?? 0) }
        estimatedHours = Int((Double(episodesWatched) * 42 / 60).rounded())

        if completed.isEmpty {
            averageDaysPerRewatch = nil
        } else {
            let totalDays = completed.reduce(0.0) { $0 + $1.completedAt!.timeIntervalSince($1.startedAt) / 86_400 }
            averageDaysPerRewatch = Int((totalDays / Double(completed.count)).rounded())
        }

        var counts: [String: Int] = [:]
        for r in completed { counts[r.showId, default: 0] += 1 }
        // Ties go to the show whose most recent completion is newest, matching
        // the web app (first key in completion order wins a tie).
        let order = completed.map(\.showId)
        if let top = counts.max(by: { a, b in
            a.value != b.value ? a.value < b.value : order.firstIndex(of: a.key)! > order.firstIndex(of: b.key)!
        }), top.value > 1, let show = showsById[top.key] {
            mostRewatched = (show, top.value)
        } else {
            mostRewatched = nil
        }

        var byYear: [Int: [Entry]] = [:]
        for r in completed {
            guard let show = showsById[r.showId] else { continue }
            let year = calendar.component(.year, from: r.completedAt!)
            byYear[year, default: []].append(Entry(rewatch: r, show: show, completedAt: r.completedAt!))
        }
        years = byYear.keys.sorted(by: >).map { YearGroup(year: $0, entries: byYear[$0]!) }

        let year = calendar.component(.year, from: now)
        currentYear = year
        rewatchesThisYear = completed.filter { calendar.component(.year, from: $0.completedAt!) == year }.count
    }
}
