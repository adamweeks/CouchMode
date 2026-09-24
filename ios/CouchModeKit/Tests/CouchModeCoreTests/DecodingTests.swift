import XCTest
@testable import CouchModeCore

final class TimestampTests: XCTestCase {
    func testParsesPostgresFormats() {
        let expected = Date(timeIntervalSince1970: 1_780_317_296.123)
        for raw in [
            "2026-06-01T12:34:56.123456+00:00",
            "2026-06-01T12:34:56.123Z",
            "2026-06-01 12:34:56.123456+00",
            "2026-06-01T12:34:56.1234",
        ] {
            let parsed = CouchModeJSON.parseTimestamp(raw)
            XCTAssertNotNil(parsed, raw)
            XCTAssertEqual(parsed!.timeIntervalSince1970, expected.timeIntervalSince1970, accuracy: 0.001, raw)
        }
        XCTAssertEqual(CouchModeJSON.parseTimestamp("2026-06-01T12:34:56Z")?.timeIntervalSince1970, 1_780_317_296)
        XCTAssertEqual(CouchModeJSON.parseTimestamp("2026-06-01T14:34:56+02:00")?.timeIntervalSince1970, 1_780_317_296)
        XCTAssertNotNil(CouchModeJSON.parseTimestamp("2026-06-01"))
        XCTAssertNil(CouchModeJSON.parseTimestamp("not a date"))
    }

    func testRoundTrip() throws {
        let date = Date(timeIntervalSince1970: 1_780_317_296.5)
        let parsed = CouchModeJSON.parseTimestamp(CouchModeJSON.formatTimestamp(date))
        XCTAssertEqual(parsed!.timeIntervalSince1970, date.timeIntervalSince1970, accuracy: 0.001)
    }
}

final class RowDecodingTests: XCTestCase {
    func testDecodesShowRow() throws {
        let json = """
        {
          "id": "6f1c", "user_id": "u1", "tmdb_id": "1396", "title": "Breaking Bad",
          "poster_url": "https://image.tmdb.org/t/p/w300/abc.jpg", "total_seasons": 5,
          "episodes_per_season": [7, 13, 13, 13, 16], "sort_order": null,
          "streaming_providers": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/n.jpg", "display_priority": 1}],
          "providers_updated_at": "2026-06-01T12:34:56.123456+00:00",
          "air_status": {"status": "Ended", "last_aired": {"season": 5, "episode": 16, "air_date": "2013-09-29"}, "next_episode": null},
          "air_status_updated_at": null,
          "added_at": "2026-05-01T00:00:00+00:00"
        }
        """
        let show = try CouchModeJSON.decoder.decode(Show.self, from: Data(json.utf8))
        XCTAssertEqual(show.title, "Breaking Bad")
        XCTAssertEqual(show.totalEpisodes, 62)
        XCTAssertEqual(show.streamingProviders?.first?.providerName, "Netflix")
        XCTAssertEqual(show.airStatus?.lastAired?.episode, 16)
        XCTAssertNil(show.airStatus?.nextEpisode)
        XCTAssertNil(show.airStatusUpdatedAt)
        XCTAssertNil(show.sortOrder)
    }

    func testDecodesRewatchRow() throws {
        let json = """
        {"id": "r1", "show_id": "s1", "user_id": "u1", "status": "in_progress",
         "started_at": "2026-05-01T00:00:00+00:00", "completed_at": null, "note": null, "service": "Netflix"}
        """
        let rewatch = try CouchModeJSON.decoder.decode(Rewatch.self, from: Data(json.utf8))
        XCTAssertEqual(rewatch.status, .inProgress)
        XCTAssertEqual(rewatch.service, "Netflix")
    }

    func testEncodesProgressLogInsertWithSnakeCaseKeys() throws {
        let row = NewProgressLog(rewatchId: "r1", userId: "u1", season: 1, episode: 2, loggedAt: Date(timeIntervalSince1970: 0))
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: CouchModeJSON.encoder.encode(row)) as? [String: Any])
        XCTAssertEqual(json["rewatch_id"] as? String, "r1")
        XCTAssertEqual(json["logged_at"] as? String, "1970-01-01T00:00:00.000Z")
    }

    func testDecodesTMDBShowDetails() throws {
        let json = """
        {"id": 1396, "name": "Breaking Bad", "poster_path": "/p.jpg", "number_of_seasons": 2,
         "seasons": [{"season_number": 2, "episode_count": 13}, {"season_number": 0, "episode_count": 4},
                     {"season_number": 1, "episode_count": 7}],
         "overview": "…", "first_air_date": "2008-01-20", "status": "Returning Series",
         "genres": [{"id": 18, "name": "Drama"}],
         "last_episode_to_air": {"season_number": 2, "episode_number": 3, "air_date": "2026-08-01", "name": "x"},
         "next_episode_to_air": null}
        """
        let details = try JSONDecoder().decode(TMDBShowDetails.self, from: Data(json.utf8))
        XCTAssertEqual(details.episodesPerSeason, [7, 13])
        XCTAssertEqual(details.airStatus, AirStatus(status: "Returning Series",
                                                    lastAired: AirEpisode(season: 2, episode: 3, airDate: "2026-08-01"),
                                                    nextEpisode: nil))
        XCTAssertFalse(details.hasEnded)
    }

    func testDecodesProvidersResponse() throws {
        let json = """
        {"id": 1, "results": {"US": {"flatrate": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/n.jpg"}]},
                              "GB": {"buy": []}}}
        """
        let response = try JSONDecoder().decode(TMDBWatchProvidersResponse.self, from: Data(json.utf8))
        XCTAssertEqual(response.usFlatrate.map(\.providerName), ["Netflix"])
    }

    func testPosterURLs() {
        XCTAssertEqual(TMDBImage.posterURL("/p.jpg")?.absoluteString, "https://image.tmdb.org/t/p/w300/p.jpg")
        XCTAssertNil(TMDBImage.posterURL(nil))
        XCTAssertNil(TMDBImage.storedPosterURL("/placeholder-poster.svg"))
        XCTAssertEqual(TMDBImage.storedPosterURL("https://x/y.jpg")?.absoluteString, "https://x/y.jpg")
    }
}

final class PreferencesTests: XCTestCase {
    func testDefaultsForMissingOrMalformedKeys() throws {
        let prefs = try JSONDecoder().decode(Preferences.self, from: Data(#"{"showResumeCard": "yes", "resumeCardMode": "bogus", "extra": 1}"#.utf8))
        XCTAssertEqual(prefs, .default)
    }

    func testKeepsValidKeys() throws {
        let prefs = try JSONDecoder().decode(Preferences.self, from: Data(#"{"showResumeCard": false, "resumeCardMode": "last-watched"}"#.utf8))
        XCTAssertFalse(prefs.showResumeCard)
        XCTAssertEqual(prefs.resumeCardMode, .lastWatched)
        XCTAssertTrue(prefs.showDoneSection)
    }

    func testServiceOptionsPutProvidersFirst() {
        let options = StreamingServices.options(availableOn: ["Netflix", "Stan"])
        XCTAssertEqual(Array(options.prefix(2)), ["Netflix", "Stan"])
        XCTAssertEqual(options.filter { $0 == "Netflix" }.count, 1)
        XCTAssertEqual(StreamingServices.options().count, 15)
    }
}
