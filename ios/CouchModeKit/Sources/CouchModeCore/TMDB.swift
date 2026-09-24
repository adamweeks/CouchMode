import Foundation

// Shapes returned by the `tmdb-search` and `suggest-shows` edge functions,
// which proxy the TMDB API (see supabase/functions and src/lib/tmdb.ts).

public struct TMDBSearchResult: Codable, Hashable, Sendable, Identifiable {
    public var id: Int
    public var name: String
    public var posterPath: String?
    public var firstAirDate: String?
    public var overview: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case posterPath = "poster_path"
        case firstAirDate = "first_air_date"
        case overview
    }

    public init(id: Int, name: String, posterPath: String? = nil, firstAirDate: String? = nil, overview: String? = nil) {
        self.id = id
        self.name = name
        self.posterPath = posterPath
        self.firstAirDate = firstAirDate
        self.overview = overview
    }
}

public struct TMDBSearchResponse: Decodable, Sendable {
    public var results: [TMDBSearchResult]?
}

public struct TMDBSeason: Codable, Hashable, Sendable {
    public var seasonNumber: Int
    public var episodeCount: Int

    enum CodingKeys: String, CodingKey {
        case seasonNumber = "season_number"
        case episodeCount = "episode_count"
    }

    public init(seasonNumber: Int, episodeCount: Int) {
        self.seasonNumber = seasonNumber
        self.episodeCount = episodeCount
    }
}

public struct TMDBAirEpisode: Codable, Hashable, Sendable {
    public var seasonNumber: Int
    public var episodeNumber: Int
    public var airDate: String?
    public var name: String?

    enum CodingKeys: String, CodingKey {
        case seasonNumber = "season_number"
        case episodeNumber = "episode_number"
        case airDate = "air_date"
        case name
    }

    public init(seasonNumber: Int, episodeNumber: Int, airDate: String?, name: String? = nil) {
        self.seasonNumber = seasonNumber
        self.episodeNumber = episodeNumber
        self.airDate = airDate
        self.name = name
    }
}

public struct TMDBGenre: Codable, Hashable, Sendable {
    public var id: Int
    public var name: String
}

public struct TMDBShowDetails: Codable, Hashable, Sendable {
    public var id: Int
    public var name: String
    public var posterPath: String?
    public var numberOfSeasons: Int
    public var seasons: [TMDBSeason]
    public var overview: String?
    public var firstAirDate: String?
    public var status: String?
    public var genres: [TMDBGenre]?
    public var lastEpisodeToAir: TMDBAirEpisode?
    public var nextEpisodeToAir: TMDBAirEpisode?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case posterPath = "poster_path"
        case numberOfSeasons = "number_of_seasons"
        case seasons
        case overview
        case firstAirDate = "first_air_date"
        case status
        case genres
        case lastEpisodeToAir = "last_episode_to_air"
        case nextEpisodeToAir = "next_episode_to_air"
    }

    public init(
        id: Int,
        name: String,
        posterPath: String? = nil,
        numberOfSeasons: Int,
        seasons: [TMDBSeason],
        overview: String? = nil,
        firstAirDate: String? = nil,
        status: String? = nil,
        genres: [TMDBGenre]? = nil,
        lastEpisodeToAir: TMDBAirEpisode? = nil,
        nextEpisodeToAir: TMDBAirEpisode? = nil
    ) {
        self.id = id
        self.name = name
        self.posterPath = posterPath
        self.numberOfSeasons = numberOfSeasons
        self.seasons = seasons
        self.overview = overview
        self.firstAirDate = firstAirDate
        self.status = status
        self.genres = genres
        self.lastEpisodeToAir = lastEpisodeToAir
        self.nextEpisodeToAir = nextEpisodeToAir
    }

    /// Regular seasons (season 0 is TMDB's "Specials"), in order.
    public var regularSeasons: [TMDBSeason] {
        seasons.filter { $0.seasonNumber > 0 }.sorted { $0.seasonNumber < $1.seasonNumber }
    }

    public var episodesPerSeason: [Int] { regularSeasons.map(\.episodeCount) }

    public var airStatus: AirStatus {
        func convert(_ ep: TMDBAirEpisode?) -> AirEpisode? {
            guard let ep else { return nil }
            return AirEpisode(season: ep.seasonNumber, episode: ep.episodeNumber, airDate: ep.airDate)
        }
        return AirStatus(status: status, lastAired: convert(lastEpisodeToAir), nextEpisode: convert(nextEpisodeToAir))
    }

    public var hasEnded: Bool { status == "Ended" || status == "Canceled" }

    public var asSearchResult: TMDBSearchResult {
        TMDBSearchResult(id: id, name: name, posterPath: posterPath, firstAirDate: firstAirDate, overview: overview)
    }
}

public struct TMDBEpisode: Codable, Hashable, Sendable, Identifiable {
    public var episodeNumber: Int
    public var name: String
    public var stillPath: String?
    public var overview: String?
    public var airDate: String?

    public var id: Int { episodeNumber }

    enum CodingKeys: String, CodingKey {
        case episodeNumber = "episode_number"
        case name
        case stillPath = "still_path"
        case overview
        case airDate = "air_date"
    }

    public init(episodeNumber: Int, name: String, stillPath: String? = nil, overview: String? = nil, airDate: String? = nil) {
        self.episodeNumber = episodeNumber
        self.name = name
        self.stillPath = stillPath
        self.overview = overview
        self.airDate = airDate
    }
}

public struct TMDBSeasonDetails: Codable, Hashable, Sendable {
    public var seasonNumber: Int
    public var episodes: [TMDBEpisode]

    enum CodingKeys: String, CodingKey {
        case seasonNumber = "season_number"
        case episodes
    }

    public init(seasonNumber: Int, episodes: [TMDBEpisode]) {
        self.seasonNumber = seasonNumber
        self.episodes = episodes
    }

    public func episode(_ number: Int) -> TMDBEpisode? {
        episodes.first { $0.episodeNumber == number }
    }
}

/// `?providers=1` response: TMDB's watch/providers payload, keyed by region.
public struct TMDBWatchProvidersResponse: Decodable, Sendable {
    public struct Region: Decodable, Sendable {
        public var flatrate: [WatchProvider]?
    }

    public var results: [String: Region]?

    /// US subscription ("flatrate") providers — the same subset the web app uses.
    public var usFlatrate: [WatchProvider] { results?["US"]?.flatrate ?? [] }
}

public struct AISuggestion: Decodable, Hashable, Sendable, Identifiable {
    public var tmdb: TMDBSearchResult
    public var reason: String

    public var id: Int { tmdb.id }

    public init(tmdb: TMDBSearchResult, reason: String) {
        self.tmdb = tmdb
        self.reason = reason
    }
}

public struct AISuggestionsResponse: Decodable, Sendable {
    public var suggestions: [AISuggestion]?
}

public enum TMDBImage {
    public static func posterURL(_ path: String?) -> URL? {
        guard let path, !path.isEmpty else { return nil }
        if path.hasPrefix("http") { return URL(string: path) }
        return URL(string: "https://image.tmdb.org/t/p/w300\(path)")
    }

    /// A `shows.poster_url` value. The web app stores a full TMDB URL, or the
    /// relative `/placeholder-poster.svg` when there's no poster, which has no
    /// meaning natively.
    public static func storedPosterURL(_ stored: String?) -> URL? {
        guard let stored, stored.hasPrefix("http") else { return nil }
        return URL(string: stored)
    }

    /// Wider still for episode artwork (16:9).
    public static func stillURL(_ path: String?) -> URL? {
        guard let path, !path.isEmpty else { return nil }
        return URL(string: "https://image.tmdb.org/t/p/w500\(path)")
    }

    public static func providerLogoURL(_ path: String) -> URL? {
        URL(string: "https://image.tmdb.org/t/p/w92\(path)")
    }
}
