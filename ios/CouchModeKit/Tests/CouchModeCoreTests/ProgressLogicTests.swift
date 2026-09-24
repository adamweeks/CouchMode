import XCTest
@testable import CouchModeCore

// Mirrors src/lib/progressLogic.test.ts so the web and iOS apps agree.

private func log(_ season: Int, _ episode: Int, _ loggedAt: String = "2024-01-01T00:00:00Z") -> ProgressLog {
    ProgressLog(id: "\(season)x\(episode)", rewatchId: "rw1", season: season, episode: episode,
                loggedAt: CouchModeJSON.parseTimestamp(loggedAt)!)
}

private func date(_ iso: String) -> Date { CouchModeJSON.parseTimestamp(iso)! }

/// A fixed-zone calendar so date-relative tests don't depend on the machine.
private var calendar: Calendar {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = TimeZone(identifier: "America/New_York")!
    return c
}

/// 2026-08-14 at noon, New York time.
private let augustNoon = date("2026-08-14T16:00:00Z")

final class CurrentProgressTests: XCTestCase {
    func testEmpty() {
        XCTAssertNil(ProgressLogic.currentProgress([ProgressLog]()))
    }

    func testHighestSeasonEpisode() {
        let logs = [log(1, 5), log(2, 3), log(1, 10)]
        XCTAssertEqual(EpisodeRef(ProgressLogic.currentProgress(logs)!), EpisodeRef(season: 2, episode: 3))
    }

    func testUsesPositionNotTimestamp() {
        let logs = [log(1, 3, "2024-03-01T00:00:00Z"), log(1, 5, "2024-01-01T00:00:00Z")]
        XCTAssertEqual(ProgressLogic.currentProgress(logs)?.episode, 5)
    }
}

final class BackfillTests: XCTestCase {
    let eps = [6, 13, 8]
    let now = date("2024-01-01T00:00:00Z")

    func testBackfillsAcrossSeasons() {
        let entries = ProgressLogic.backfillEntries(targetSeason: 2, targetEpisode: 3, episodesPerSeason: eps,
                                                    existing: [], rewatchId: "rw1", userId: "u1", now: now)
        XCTAssertEqual(entries.count, 8)
        let positions = Set(entries.map { EpisodeRef(season: $0.season, episode: $0.episode) })
        XCTAssertTrue(positions.contains(EpisodeRef(season: 1, episode: 1)))
        XCTAssertTrue(positions.contains(EpisodeRef(season: 1, episode: 6)))
        XCTAssertTrue(positions.contains(EpisodeRef(season: 2, episode: 2)))
        XCTAssertFalse(positions.contains(EpisodeRef(season: 2, episode: 3)))
        XCTAssertTrue(entries.allSatisfy { $0.rewatchId == "rw1" && $0.userId == "u1" && $0.loggedAt == now })
    }

    func testSkipsAlreadyLogged() {
        let entries = ProgressLogic.backfillEntries(targetSeason: 1, targetEpisode: 5, episodesPerSeason: eps,
                                                    existing: ["1x1", "1x2", "1x3"], rewatchId: "rw1", userId: "u1", now: now)
        XCTAssertEqual(entries.map { EpisodeRef(season: $0.season, episode: $0.episode) }, [EpisodeRef(season: 1, episode: 4)])
    }

    func testEmptyForFirstEpisode() {
        XCTAssertTrue(ProgressLogic.backfillEntries(targetSeason: 1, targetEpisode: 1, episodesPerSeason: eps,
                                                    existing: [], rewatchId: "rw1", userId: "u1", now: now).isEmpty)
    }

    func testToleratesEmptyAndMissingSeasons() {
        let entries = ProgressLogic.backfillEntries(targetSeason: 3, targetEpisode: 1, episodesPerSeason: [2, 0],
                                                    existing: [], rewatchId: "rw1", userId: "u1", now: now)
        XCTAssertEqual(entries.count, 2)
    }
}

final class NextEpisodeTests: XCTestCase {
    func next(_ current: EpisodeRef?, _ total: Int, _ eps: [Int]) -> EpisodeRef? {
        ProgressLogic.nextEpisode(after: current, totalSeasons: total, episodesPerSeason: eps)
    }

    func testAdvancesWithinSeason() {
        XCTAssertEqual(next(EpisodeRef(season: 1, episode: 3), 2, [7, 13]), EpisodeRef(season: 1, episode: 4))
    }

    func testRollsOverSeason() {
        XCTAssertEqual(next(EpisodeRef(season: 1, episode: 7), 2, [7, 13]), EpisodeRef(season: 2, episode: 1))
    }

    func testStartsAtS1E1() {
        XCTAssertEqual(next(nil, 2, [7, 13]), EpisodeRef(season: 1, episode: 1))
    }

    func testNilAtFinalEpisode() {
        XCTAssertNil(next(EpisodeRef(season: 2, episode: 13), 2, [7, 13]))
    }

    func testSkipsTrailingEmptySeason() {
        XCTAssertNil(next(EpisodeRef(season: 1, episode: 8), 2, [8, 0]))
    }

    func testSkipsEmptySeasonToNextPopulated() {
        XCTAssertEqual(next(EpisodeRef(season: 1, episode: 8), 3, [8, 0, 10]), EpisodeRef(season: 3, episode: 1))
    }

    func testStartsAtFirstPopulatedSeason() {
        XCTAssertEqual(next(nil, 3, [0, 10, 8]), EpisodeRef(season: 2, episode: 1))
    }

    func testNoSeasonsFallsBackToS1E1() {
        XCTAssertEqual(next(nil, 0, []), EpisodeRef(season: 1, episode: 1))
    }
}

final class SeriesCompleteAndRegressionTests: XCTestCase {
    let eps = [10, 10, 8]

    func testCompleteOnLastEpisodeOfLastSeason() {
        XCTAssertTrue(ProgressLogic.isSeriesComplete(season: 3, episode: 8, totalSeasons: 3, episodesPerSeason: eps))
    }

    func testNotCompleteMidSeason() {
        XCTAssertFalse(ProgressLogic.isSeriesComplete(season: 3, episode: 5, totalSeasons: 3, episodesPerSeason: eps))
    }

    func testNotCompleteAtEndOfEarlierSeason() {
        XCTAssertFalse(ProgressLogic.isSeriesComplete(season: 2, episode: 10, totalSeasons: 3, episodesPerSeason: eps))
    }

    func testNotCompleteWithMissingEpisodeData() {
        XCTAssertFalse(ProgressLogic.isSeriesComplete(season: 3, episode: 1, totalSeasons: 3, episodesPerSeason: [10]))
    }

    func testRegression() {
        let current = EpisodeRef(season: 2, episode: 5)
        XCTAssertTrue(ProgressLogic.isRegression(season: 1, episode: 10, current: current))
        XCTAssertFalse(ProgressLogic.isRegression(season: 2, episode: 6, current: current))
        XCTAssertFalse(ProgressLogic.isRegression(season: 1, episode: 1, current: nil))
    }

    func testComparePosition() {
        XCTAssertLessThan(ProgressLogic.comparePosition(EpisodeRef(season: 1, episode: 3), EpisodeRef(season: 1, episode: 5)), 0)
        XCTAssertGreaterThan(ProgressLogic.comparePosition(EpisodeRef(season: 2, episode: 1), EpisodeRef(season: 1, episode: 10)), 0)
        XCTAssertEqual(ProgressLogic.comparePosition(EpisodeRef(season: 2, episode: 3), EpisodeRef(season: 2, episode: 3)), 0)
    }
}

final class CompletionUpdatesTests: XCTestCase {
    let completedAt = date("2024-06-01T12:00:00Z")
    let currentStartedAt = date("2024-05-01T12:00:00Z")

    func testAlwaysCompleted() {
        let u = ProgressLogic.completionUpdates(completedAt: completedAt, currentStartedAt: currentStartedAt)
        XCTAssertEqual(u.status, .completed)
        XCTAssertEqual(u.completedAt, completedAt)
        XCTAssertNil(u.note)
        XCTAssertNil(u.startedAt)
    }

    func testIncludesNote() {
        XCTAssertEqual(ProgressLogic.completionUpdates(completedAt: completedAt, currentStartedAt: currentStartedAt, note: "Great").note, "Great")
    }

    func testExplicitStart() {
        let start = date("2024-04-01T12:00:00Z")
        XCTAssertEqual(ProgressLogic.completionUpdates(completedAt: completedAt, currentStartedAt: currentStartedAt, startedAt: start).startedAt, start)
    }

    func testBackdatesStartWhenCompletionIsEarlier() {
        let early = date("2024-04-15T12:00:00Z")
        XCTAssertEqual(ProgressLogic.completionUpdates(completedAt: early, currentStartedAt: currentStartedAt).startedAt, early)
    }

    func testPrefersExplicitStartOverBackdating() {
        let early = date("2024-04-15T12:00:00Z")
        let start = date("2024-04-01T12:00:00Z")
        XCTAssertEqual(ProgressLogic.completionUpdates(completedAt: early, currentStartedAt: currentStartedAt, startedAt: start).startedAt, start)
    }

    func testEncodesNullNoteAndOmitsUnchangedStart() throws {
        let data = try CouchModeJSON.encoder.encode(ProgressLogic.completionUpdates(completedAt: completedAt, currentStartedAt: currentStartedAt))
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(json["status"] as? String, "completed")
        XCTAssertTrue(json["note"] is NSNull)
        XCTAssertNil(json["started_at"])
    }
}

final class FormattingTests: XCTestCase {
    func testProgress() {
        XCTAssertEqual(Formatting.progress(season: 1, episode: 5), "S1 E5")
        XCTAssertEqual(Formatting.progress(season: 3, episode: 10), "S3 E10")
    }

    func testMonthYear() {
        let utc = TimeZone(identifier: "UTC")!
        XCTAssertEqual(Formatting.monthYear(date("2024-01-15T12:00:00Z"), timeZone: utc), "Jan 2024")
        XCTAssertEqual(Formatting.monthYear(date("2026-12-15T12:00:00Z"), timeZone: utc), "Dec 2026")
    }

    func testDuration() {
        let start = date("2024-01-01T00:00:00Z")
        XCTAssertEqual(Formatting.duration(from: start, to: start), "Same day")
        XCTAssertEqual(Formatting.duration(from: start, to: date("2024-01-02T00:00:00Z")), "1 day")
        XCTAssertEqual(Formatting.duration(from: start, to: date("2024-01-11T00:00:00Z")), "10 days")
    }

    func testYear() {
        XCTAssertEqual(Formatting.year("2008-01-20"), "2008")
        XCTAssertNil(Formatting.year(""))
        XCTAssertNil(Formatting.year(nil))
    }
}

final class AirStatusTests: XCTestCase {
    func testReturningSeries() {
        XCTAssertFalse(ProgressLogic.isReturningSeries(nil))
        XCTAssertTrue(ProgressLogic.isReturningSeries(AirStatus(status: "Ended", lastAired: nil,
                                                                nextEpisode: AirEpisode(season: 2, episode: 1, airDate: nil))))
        XCTAssertTrue(ProgressLogic.isReturningSeries(AirStatus(status: "Returning Series", lastAired: nil, nextEpisode: nil)))
        XCTAssertFalse(ProgressLogic.isReturningSeries(AirStatus(status: "Ended", lastAired: nil, nextEpisode: nil)))
        XCTAssertFalse(ProgressLogic.isReturningSeries(AirStatus(status: "Canceled", lastAired: nil, nextEpisode: nil)))
    }

    func testCaughtUp() {
        let air = AirStatus(status: "Returning Series", lastAired: AirEpisode(season: 2, episode: 5, airDate: "2026-08-01"), nextEpisode: nil)
        XCTAssertFalse(ProgressLogic.isCaughtUp(nil, air: air))
        XCTAssertTrue(ProgressLogic.isCaughtUp(EpisodeRef(season: 2, episode: 5), air: air))
        XCTAssertTrue(ProgressLogic.isCaughtUp(EpisodeRef(season: 2, episode: 6), air: air))
        XCTAssertFalse(ProgressLogic.isCaughtUp(EpisodeRef(season: 2, episode: 4), air: air))

        let ended = AirStatus(status: "Ended", lastAired: air.lastAired, nextEpisode: nil)
        XCTAssertFalse(ProgressLogic.isCaughtUp(EpisodeRef(season: 2, episode: 5), air: ended))
        XCTAssertFalse(ProgressLogic.isCaughtUp(EpisodeRef(season: 2, episode: 5),
                                                air: AirStatus(status: "Returning Series", lastAired: nil, nextEpisode: nil)))
    }

    func format(_ air: AirStatus?) -> String? {
        Formatting.airStatus(air, now: augustNoon, calendar: calendar)
    }

    func testFormatAirStatus() {
        XCTAssertNil(format(nil))
        XCTAssertEqual(format(AirStatus(status: "Returning Series",
                                        lastAired: AirEpisode(season: 1, episode: 8, airDate: "2026-08-07"),
                                        nextEpisode: AirEpisode(season: 1, episode: 9, airDate: "2026-08-15"))),
                       "Next: S1 E9 · tomorrow")
        XCTAssertEqual(format(AirStatus(status: "Returning Series", lastAired: nil,
                                        nextEpisode: AirEpisode(season: 2, episode: 1, airDate: "2026-08-19"))),
                       "Next: S2 E1 · in 5 days")
        XCTAssertEqual(format(AirStatus(status: "Returning Series", lastAired: nil,
                                        nextEpisode: AirEpisode(season: 2, episode: 1, airDate: "2026-09-20"))),
                       "Next: S2 E1 · Sep 20")
        XCTAssertEqual(format(AirStatus(status: "Returning Series", lastAired: nil,
                                        nextEpisode: AirEpisode(season: 2, episode: 1, airDate: "2026-08-14"))),
                       "New episode out now · S2 E1")
        XCTAssertEqual(format(AirStatus(status: "Returning Series",
                                        lastAired: AirEpisode(season: 1, episode: 8, airDate: "2026-08-12"), nextEpisode: nil)),
                       "New episode aired 2 days ago · S1 E8")
        XCTAssertEqual(format(AirStatus(status: "Returning Series",
                                        lastAired: AirEpisode(season: 1, episode: 8, airDate: "2026-08-13"), nextEpisode: nil)),
                       "New episode aired yesterday · S1 E8")
        XCTAssertEqual(format(AirStatus(status: "Returning Series",
                                        lastAired: AirEpisode(season: 1, episode: 8, airDate: "2026-01-01"), nextEpisode: nil)),
                       "Caught up")
    }

    func testIsUnaired() {
        XCTAssertFalse(ProgressLogic.isUnaired(nil, now: augustNoon, calendar: calendar))
        XCTAssertFalse(ProgressLogic.isUnaired("", now: augustNoon, calendar: calendar))
        XCTAssertTrue(ProgressLogic.isUnaired("2026-08-15", now: augustNoon, calendar: calendar))
        XCTAssertFalse(ProgressLogic.isUnaired("2026-08-14", now: augustNoon, calendar: calendar))
        XCTAssertFalse(ProgressLogic.isUnaired("2026-08-01", now: augustNoon, calendar: calendar))
    }

    func testEpisodeAirDate() {
        func f(_ s: String?) -> String? { Formatting.episodeAirDate(s, now: augustNoon, calendar: calendar) }
        XCTAssertNil(f(nil))
        XCTAssertNil(f(""))
        XCTAssertEqual(f("2026-08-15"), "Airs tomorrow")
        XCTAssertEqual(f("2026-08-19"), "Airs in 5 days")
        XCTAssertEqual(f("2026-09-20"), "Airs Sep 20, 2026")
        XCTAssertEqual(f("2026-08-14"), "Airs today")
        XCTAssertEqual(f("2026-08-01"), "Aired Aug 1, 2026")
    }
}
