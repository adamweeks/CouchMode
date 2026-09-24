import Foundation

// Row types mirroring the Supabase schema (see supabase/migrations and the web
// app's src/lib/database.types.ts). Coding keys are explicit so decoding does
// not depend on a snake_case key strategy being configured on the decoder.

public enum RewatchStatus: String, Codable, Sendable, Hashable {
    case inProgress = "in_progress"
    case completed
}

public struct Show: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var userId: String
    public var tmdbId: String
    public var title: String
    public var posterUrl: String?
    public var totalSeasons: Int
    public var episodesPerSeason: [Int]
    public var sortOrder: Int?
    public var streamingProviders: [WatchProvider]?
    public var providersUpdatedAt: Date?
    public var airStatus: AirStatus?
    public var airStatusUpdatedAt: Date?
    public var addedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case tmdbId = "tmdb_id"
        case title
        case posterUrl = "poster_url"
        case totalSeasons = "total_seasons"
        case episodesPerSeason = "episodes_per_season"
        case sortOrder = "sort_order"
        case streamingProviders = "streaming_providers"
        case providersUpdatedAt = "providers_updated_at"
        case airStatus = "air_status"
        case airStatusUpdatedAt = "air_status_updated_at"
        case addedAt = "added_at"
    }

    public init(
        id: String,
        userId: String,
        tmdbId: String,
        title: String,
        posterUrl: String? = nil,
        totalSeasons: Int,
        episodesPerSeason: [Int],
        sortOrder: Int? = nil,
        streamingProviders: [WatchProvider]? = nil,
        providersUpdatedAt: Date? = nil,
        airStatus: AirStatus? = nil,
        airStatusUpdatedAt: Date? = nil,
        addedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.tmdbId = tmdbId
        self.title = title
        self.posterUrl = posterUrl
        self.totalSeasons = totalSeasons
        self.episodesPerSeason = episodesPerSeason
        self.sortOrder = sortOrder
        self.streamingProviders = streamingProviders
        self.providersUpdatedAt = providersUpdatedAt
        self.airStatus = airStatus
        self.airStatusUpdatedAt = airStatusUpdatedAt
        self.addedAt = addedAt
    }

    public var totalEpisodes: Int { episodesPerSeason.reduce(0, +) }
}

public struct Rewatch: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var showId: String
    public var userId: String
    public var status: RewatchStatus
    public var startedAt: Date
    public var completedAt: Date?
    public var note: String?
    public var service: String?

    enum CodingKeys: String, CodingKey {
        case id
        case showId = "show_id"
        case userId = "user_id"
        case status
        case startedAt = "started_at"
        case completedAt = "completed_at"
        case note
        case service
    }

    public init(
        id: String,
        showId: String,
        userId: String,
        status: RewatchStatus,
        startedAt: Date,
        completedAt: Date? = nil,
        note: String? = nil,
        service: String? = nil
    ) {
        self.id = id
        self.showId = showId
        self.userId = userId
        self.status = status
        self.startedAt = startedAt
        self.completedAt = completedAt
        self.note = note
        self.service = service
    }
}

/// A logged episode. Matches the `progress_logs` columns the app selects
/// (`id, rewatch_id, season, episode, logged_at`).
public struct ProgressLog: Codable, Identifiable, Hashable, Sendable, EpisodePositioned {
    public var id: String
    public var rewatchId: String
    public var season: Int
    public var episode: Int
    public var loggedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case rewatchId = "rewatch_id"
        case season
        case episode
        case loggedAt = "logged_at"
    }

    public init(id: String, rewatchId: String, season: Int, episode: Int, loggedAt: Date) {
        self.id = id
        self.rewatchId = rewatchId
        self.season = season
        self.episode = episode
        self.loggedAt = loggedAt
    }
}

/// Insert payload for `progress_logs`.
public struct NewProgressLog: Codable, Hashable, Sendable {
    public var rewatchId: String
    public var userId: String
    public var season: Int
    public var episode: Int
    public var loggedAt: Date
    public var note: String?

    enum CodingKeys: String, CodingKey {
        case rewatchId = "rewatch_id"
        case userId = "user_id"
        case season
        case episode
        case loggedAt = "logged_at"
        case note
    }

    public init(rewatchId: String, userId: String, season: Int, episode: Int, loggedAt: Date, note: String? = nil) {
        self.rewatchId = rewatchId
        self.userId = userId
        self.season = season
        self.episode = episode
        self.loggedAt = loggedAt
        self.note = note
    }
}

/// A cached TMDB watch provider, stored as JSONB on `shows.streaming_providers`.
public struct WatchProvider: Codable, Hashable, Sendable, Identifiable {
    public var providerId: Int
    public var providerName: String
    public var logoPath: String

    public var id: Int { providerId }

    enum CodingKeys: String, CodingKey {
        case providerId = "provider_id"
        case providerName = "provider_name"
        case logoPath = "logo_path"
    }

    public init(providerId: Int, providerName: String, logoPath: String) {
        self.providerId = providerId
        self.providerName = providerName
        self.logoPath = logoPath
    }
}

public struct AirEpisode: Codable, Hashable, Sendable, EpisodePositioned {
    public var season: Int
    public var episode: Int
    /// `YYYY-MM-DD`, as TMDB returns it.
    public var airDate: String?

    enum CodingKeys: String, CodingKey {
        case season
        case episode
        case airDate = "air_date"
    }

    public init(season: Int, episode: Int, airDate: String?) {
        self.season = season
        self.episode = episode
        self.airDate = airDate
    }
}

/// Cached air-schedule snapshot for a show, derived from TMDB's `status`,
/// `last_episode_to_air`, and `next_episode_to_air`. Stored as JSONB on the
/// `shows` row and refreshed on the same cadence as streaming providers.
public struct AirStatus: Codable, Hashable, Sendable {
    public var status: String?
    public var lastAired: AirEpisode?
    public var nextEpisode: AirEpisode?

    enum CodingKeys: String, CodingKey {
        case status
        case lastAired = "last_aired"
        case nextEpisode = "next_episode"
    }

    public init(status: String?, lastAired: AirEpisode?, nextEpisode: AirEpisode?) {
        self.status = status
        self.lastAired = lastAired
        self.nextEpisode = nextEpisode
    }
}
