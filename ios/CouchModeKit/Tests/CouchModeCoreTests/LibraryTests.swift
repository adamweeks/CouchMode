import XCTest
@testable import CouchModeCore

private func date(_ iso: String) -> Date { CouchModeJSON.parseTimestamp(iso)! }

private func show(_ id: String, title: String? = nil, eps: [Int] = [10, 10], added: String = "2024-01-01T00:00:00Z",
                  sortOrder: Int? = nil, air: AirStatus? = nil) -> Show {
    Show(id: id, userId: "u1", tmdbId: "tmdb-\(id)", title: title ?? id.capitalized, totalSeasons: eps.count,
         episodesPerSeason: eps, sortOrder: sortOrder, airStatus: air, addedAt: date(added))
}

private func rewatch(_ id: String, show: String, _ status: RewatchStatus, started: String = "2024-01-01T00:00:00Z",
                     completed: String? = nil) -> Rewatch {
    Rewatch(id: id, showId: show, userId: "u1", status: status, startedAt: date(started),
            completedAt: completed.map(date))
}

private func log(_ rewatch: String, _ s: Int, _ e: Int, at: String = "2024-02-01T00:00:00Z") -> ProgressLog {
    ProgressLog(id: "\(rewatch)-\(s)x\(e)", rewatchId: rewatch, season: s, episode: e, loggedAt: date(at))
}

final class LibraryTests: XCTestCase {
    func testGroupsShowsLikeTheWebApp() {
        let returning = AirStatus(status: "Returning Series",
                                  lastAired: AirEpisode(season: 2, episode: 10, airDate: "2024-01-01"), nextEpisode: nil)
        let shows = [
            show("watching"),
            show("caughtup", air: returning),
            show("queued"),
            show("done"),
            show("restarted"), // completed before, new rewatch with logs
        ]
        let rewatches = [
            rewatch("r-watching", show: "watching", .inProgress),
            rewatch("r-caughtup", show: "caughtup", .inProgress),
            rewatch("r-queued", show: "queued", .inProgress),
            rewatch("r-done-1", show: "done", .completed, completed: "2024-03-01T00:00:00Z"),
            rewatch("r-done-2", show: "done", .inProgress),
            rewatch("r-restarted-1", show: "restarted", .completed, completed: "2023-03-01T00:00:00Z"),
            rewatch("r-restarted-2", show: "restarted", .inProgress),
        ]
        let logs = [
            log("r-watching", 1, 3),
            log("r-caughtup", 2, 10),
            log("r-restarted-2", 1, 1),
            log("r-done-1", 2, 10), // logs of completed rewatches don't affect grouping
        ]
        let groups = Library(shows: shows, rewatches: rewatches, logs: logs).groups()

        XCTAssertEqual(Set(groups.watching.map(\.id)), ["watching", "restarted"])
        XCTAssertEqual(groups.caughtUp.map(\.id), ["caughtup"])
        XCTAssertEqual(groups.queue.map(\.id), ["queued"])
        XCTAssertEqual(groups.done.map(\.id), ["done"])
    }

    func testShowState() {
        let library = Library(
            shows: [show("a", eps: [10, 10])],
            rewatches: [
                rewatch("r1", show: "a", .completed, started: "2023-01-01T00:00:00Z", completed: "2023-02-01T00:00:00Z"),
                rewatch("r2", show: "a", .completed, started: "2023-06-01T00:00:00Z", completed: "2023-07-01T00:00:00Z"),
                rewatch("r3", show: "a", .inProgress),
            ],
            logs: [log("r3", 1, 1), log("r3", 1, 2), log("r3", 2, 1, at: "2024-02-02T00:00:00Z")]
        )
        let state = library.state(forShowId: "a")!
        XCTAssertEqual(state.rewatchNumber, 3)
        XCTAssertEqual(state.completedRewatches.map(\.id), ["r2", "r1"])
        XCTAssertEqual(state.lastCompletedAt, date("2023-07-01T00:00:00Z"))
        XCTAssertEqual(state.currentProgress.map { EpisodeRef($0) }, EpisodeRef(season: 2, episode: 1))
        XCTAssertEqual(state.watchedEpisodes, 11)
        XCTAssertEqual(state.percentComplete, 55)
        XCTAssertEqual(state.nextEpisode, EpisodeRef(season: 2, episode: 2))
        XCTAssertEqual(state.lastLoggedAt, date("2024-02-02T00:00:00Z"))
        XCTAssertEqual(state.averageDaysBetweenRewatches, 150)
        XCTAssertTrue(state.isWatching)
        XCTAssertFalse(state.isDone)
        XCTAssertNotNil(library.state(forTMDBId: "tmdb-a"))
        XCTAssertTrue(library.contains(tmdbId: 0) == false)
    }

    func testQueueFollowsManualOrderWithUnorderedLast() {
        let shows = [
            show("c", added: "2024-01-03T00:00:00Z"),
            show("b", added: "2024-01-02T00:00:00Z", sortOrder: 1),
            show("a", added: "2024-01-01T00:00:00Z", sortOrder: 0),
            show("d", added: "2023-12-01T00:00:00Z"),
        ]
        let rewatches = shows.map { rewatch("r-\($0.id)", show: $0.id, .inProgress) }
        let queue = Library(shows: shows, rewatches: rewatches, logs: []).groups().queue
        // Ordered first, then unordered in newest-added order.
        XCTAssertEqual(queue.map(\.id), ["a", "b", "c", "d"])
    }

    func testDoneSortedByMostRecentCompletion() {
        let shows = [show("old"), show("new")]
        let rewatches = [
            rewatch("r1", show: "old", .completed, completed: "2023-01-01T00:00:00Z"),
            rewatch("r2", show: "new", .completed, completed: "2024-01-01T00:00:00Z"),
        ]
        XCTAssertEqual(Library(shows: shows, rewatches: rewatches, logs: []).groups().done.map(\.id), ["new", "old"])
    }

    func testTitleSort() {
        let shows = [show("b", title: "beta"), show("a", title: "Alpha")]
        let rewatches = shows.map { rewatch("r-\($0.id)", show: $0.id, .inProgress) }
        let logs = shows.map { log("r-\($0.id)", 1, 1) }
        XCTAssertEqual(Library(shows: shows, rewatches: rewatches, logs: logs).groups(sortedBy: .title).watching.map(\.id), ["a", "b"])
    }

    func testFilter() {
        let shows = [show("a", title: "The Office"), show("b", title: "Parks and Rec")]
        let rewatches = shows.map { rewatch("r-\($0.id)", show: $0.id, .inProgress) }
        let groups = Library(shows: shows, rewatches: rewatches, logs: []).groups()
        XCTAssertEqual(groups.filtered(by: "office").queue.map(\.id), ["a"])
        XCTAssertEqual(groups.filtered(by: "  ").queue.count, 2)
    }

    func testResumeStatePicksMostRecentlyLogged() {
        let shows = [show("a"), show("b")]
        let rewatches = [rewatch("ra", show: "a", .inProgress), rewatch("rb", show: "b", .inProgress)]
        let logs = [
            log("ra", 3, 1, at: "2024-01-01T00:00:00Z"),
            log("rb", 1, 1, at: "2024-02-01T00:00:00Z"),
            log("rb", 1, 2, at: "2024-01-15T00:00:00Z"),
        ]
        let resume = Library(shows: shows, rewatches: rewatches, logs: logs).resumeState
        XCTAssertEqual(resume?.id, "b")
        // Current position is the highest logged, not the latest logged.
        XCTAssertEqual(resume?.currentProgress?.episode, 2)
        XCTAssertNil(Library(shows: shows, rewatches: rewatches, logs: []).resumeState)
    }
}

final class HistoryStatsTests: XCTestCase {
    func testStats() {
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(identifier: "UTC")!
        let shows = [show("a", eps: [10, 10]), show("b", eps: [6])]
        let rewatches = [
            rewatch("1", show: "a", .completed, started: "2025-01-01T00:00:00Z", completed: "2025-01-11T00:00:00Z"),
            rewatch("2", show: "a", .completed, started: "2026-01-01T00:00:00Z", completed: "2026-01-21T00:00:00Z"),
            rewatch("3", show: "b", .completed, started: "2026-03-01T00:00:00Z", completed: "2026-03-01T00:00:00Z"),
            rewatch("4", show: "b", .inProgress),
        ]
        let stats = HistoryStats(rewatches: rewatches, shows: shows, now: date("2026-06-01T00:00:00Z"), calendar: utc)
        XCTAssertEqual(stats.totalRewatches, 3)
        XCTAssertEqual(stats.showsRewatched, 2)
        XCTAssertEqual(stats.episodesWatched, 46)
        XCTAssertEqual(stats.estimatedHours, 32)
        XCTAssertEqual(stats.averageDaysPerRewatch, 10)
        XCTAssertEqual(stats.rewatchesThisYear, 2)
        XCTAssertEqual(stats.currentYear, 2026)
        XCTAssertEqual(stats.mostRewatched?.show.id, "a")
        XCTAssertEqual(stats.mostRewatched?.count, 2)
        XCTAssertEqual(stats.years.map(\.year), [2026, 2025])
        XCTAssertEqual(stats.years[0].entries.map(\.id), ["3", "2"])
    }

    func testMostRewatchedNeedsMoreThanOne() {
        let stats = HistoryStats(rewatches: [rewatch("1", show: "a", .completed, completed: "2025-01-11T00:00:00Z")],
                                 shows: [show("a")])
        XCTAssertNil(stats.mostRewatched)
    }

    func testEmpty() {
        let stats = HistoryStats(rewatches: [], shows: [])
        XCTAssertEqual(stats.totalRewatches, 0)
        XCTAssertNil(stats.averageDaysPerRewatch)
        XCTAssertTrue(stats.years.isEmpty)
    }
}
