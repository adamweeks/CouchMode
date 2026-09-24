import CouchModeCore
import Foundation
import Supabase

/// Raw rows behind the user's library. Row Level Security scopes every query
/// to the signed-in user, so no explicit `user_id` filters are needed.
public struct LibrarySnapshot: Sendable {
    public var shows: [Show]
    public var rewatches: [Rewatch]
    public var logs: [ProgressLog]

    public var library: Library { Library(shows: shows, rewatches: rewatches, logs: logs) }
}

/// The outcome of logging an episode.
public struct LogResult: Sendable {
    /// True when the final episode was logged and the rewatch was completed
    /// (a fresh in-progress rewatch is created automatically).
    public var completedSeries: Bool
    /// Ids of every row inserted (target + backfill), for Undo.
    public var insertedIds: [String]
}

/// Supabase reads and writes for shows, rewatches, and progress logs. A port of
/// the query/mutation logic in the web app's src/hooks/.
public struct LibraryRepository: Sendable {
    let client: SupabaseClient
    let tmdb: TMDBService

    /// Rows per request; PostgREST caps responses at 1000 by default.
    static let pageSize = 1000

    public init(client: SupabaseClient, tmdb: TMDBService) {
        self.client = client
        self.tmdb = tmdb
    }

    // MARK: - Reads

    public func fetchSnapshot() async throws -> LibrarySnapshot {
        async let shows: [Show] = fetchAll { from, to in
            client.from("shows").select().order("added_at", ascending: false).order("id").range(from: from, to: to)
        }
        async let rewatches: [Rewatch] = fetchAll { from, to in
            client.from("rewatches").select().order("started_at", ascending: false).order("id").range(from: from, to: to)
        }
        let (loadedShows, loadedRewatches) = try await (shows, rewatches)

        let activeIds = loadedRewatches.filter { $0.status == .inProgress }.map(\.id)
        var logs: [ProgressLog] = []
        // Chunk ids to keep the `in.(…)` filter's URL short.
        for start in stride(from: 0, to: activeIds.count, by: 100) {
            let chunk = Array(activeIds[start..<min(start + 100, activeIds.count)])
            logs += try await fetchAll { from, to in
                client.from("progress_logs")
                    .select("id, rewatch_id, season, episode, logged_at")
                    .in("rewatch_id", values: chunk)
                    .order("id")
                    .range(from: from, to: to)
            }
        }
        return LibrarySnapshot(shows: loadedShows, rewatches: loadedRewatches, logs: logs)
    }

    /// Pages through a query until a short page comes back.
    private func fetchAll<T: Decodable & Sendable>(
        _ query: (_ from: Int, _ to: Int) -> PostgrestTransformBuilder
    ) async throws -> [T] {
        var rows: [T] = []
        var offset = 0
        while true {
            let page: [T] = try await query(offset, offset + Self.pageSize - 1).execute().value
            rows += page
            if page.count < Self.pageSize { return rows }
            offset += Self.pageSize
        }
    }

    // MARK: - Shows

    /// Adds a show to the library with an in-progress rewatch, caching TMDB
    /// metadata on the row. Mirrors `useAddShow`.
    @discardableResult
    public func addShow(_ result: TMDBSearchResult, service: String?, userId: String) async throws -> Show {
        async let detailsTask = tmdb.details(tmdbId: result.id)
        async let providersTask = (try? tmdb.watchProviders(tmdbId: result.id)) ?? []
        let (details, providers) = try await (detailsTask, providersTask)
        let now = Date()

        struct NewShow: Encodable {
            let tmdb_id: String
            let user_id: String
            let title: String
            let poster_url: String?
            let total_seasons: Int
            let episodes_per_season: [Int]
            let streaming_providers: [WatchProvider]?
            let providers_updated_at: Date
            let air_status: AirStatus
            let air_status_updated_at: Date
        }
        let show: Show = try await client.from("shows")
            .insert(NewShow(
                tmdb_id: String(result.id),
                user_id: userId,
                title: result.name,
                poster_url: TMDBImage.posterURL(result.posterPath)?.absoluteString,
                total_seasons: details.numberOfSeasons,
                episodes_per_season: details.episodesPerSeason,
                streaming_providers: providers.isEmpty ? nil : providers,
                providers_updated_at: now,
                air_status: details.airStatus,
                air_status_updated_at: now
            ), returning: .representation)
            .select()
            .single()
            .execute()
            .value

        struct NewRewatch: Encodable {
            let show_id: String
            let user_id: String
            let status: RewatchStatus
            let service: String?
        }
        try await client.from("rewatches")
            .insert(NewRewatch(show_id: show.id, user_id: userId, status: .inProgress, service: service), returning: .minimal)
            .execute()
        return show
    }

    public func removeShow(id: String) async throws {
        try await client.from("shows").delete(returning: .minimal).eq("id", value: id).execute()
    }

    /// Persists the Up Next order (`sort_order` = position).
    public func updateQueueOrder(showIds: [String]) async throws {
        struct Order: Encodable { let sort_order: Int }
        try await withThrowingTaskGroup(of: Void.self) { group in
            for (index, id) in showIds.enumerated() {
                group.addTask {
                    try await client.from("shows").update(Order(sort_order: index), returning: .minimal).eq("id", value: id).execute()
                }
            }
            try await group.waitForAll()
        }
    }

    /// Refreshes cached TMDB metadata (providers, air status, episode counts)
    /// for shows older than `ttl`, or that have never had air status fetched.
    /// Mirrors `useRefreshProviders`. Returns true if anything was refreshed.
    public func refreshStaleMetadata(ttl: TimeInterval = 7 * 24 * 60 * 60) async throws -> Bool {
        struct StaleShow: Decodable, Sendable { let id: String; let tmdb_id: String }
        let cutoff = CouchModeJSON.formatTimestamp(Date().addingTimeInterval(-ttl))
        let stale: [StaleShow] = try await client.from("shows")
            .select("id, tmdb_id")
            .or("providers_updated_at.is.null,providers_updated_at.lt.\(cutoff),air_status_updated_at.is.null")
            .execute()
            .value
        guard !stale.isEmpty else { return false }

        struct MetadataUpdate: Encodable {
            let streaming_providers: [WatchProvider]?
            let providers_updated_at: Date
            let air_status: AirStatus?
            let air_status_updated_at: Date?
            let episodes_per_season: [Int]?
            let total_seasons: Int?

            func encode(to encoder: Encoder) throws {
                enum Keys: String, CodingKey {
                    case streaming_providers, providers_updated_at, air_status, air_status_updated_at,
                         episodes_per_season, total_seasons
                }
                var c = encoder.container(keyedBy: Keys.self)
                // Always write providers (null clears a stale list); the rest only when TMDB answered.
                try c.encode(streaming_providers, forKey: .streaming_providers)
                try c.encode(providers_updated_at, forKey: .providers_updated_at)
                try c.encodeIfPresent(air_status, forKey: .air_status)
                try c.encodeIfPresent(air_status_updated_at, forKey: .air_status_updated_at)
                try c.encodeIfPresent(episodes_per_season, forKey: .episodes_per_season)
                try c.encodeIfPresent(total_seasons, forKey: .total_seasons)
            }
        }

        await withTaskGroup(of: Void.self) { group in
            for show in stale {
                group.addTask {
                    guard let tmdbId = Int(show.tmdb_id) else { return }
                    async let providers = (try? tmdb.watchProviders(tmdbId: tmdbId)) ?? []
                    async let details = try? tmdb.details(tmdbId: tmdbId, maxAge: 0)
                    let (p, d) = await (providers, details)
                    let now = Date()
                    let update = MetadataUpdate(
                        streaming_providers: p.isEmpty ? nil : p,
                        providers_updated_at: now,
                        air_status: d?.airStatus,
                        air_status_updated_at: d == nil ? nil : now,
                        episodes_per_season: d?.episodesPerSeason,
                        total_seasons: d?.numberOfSeasons
                    )
                    _ = try? await client.from("shows").update(update, returning: .minimal).eq("id", value: show.id).execute()
                }
            }
        }
        return true
    }

    // MARK: - Progress

    /// Logs an episode, backfilling every earlier unlogged episode. Logging
    /// the final episode completes the rewatch and starts a fresh one.
    /// Mirrors `useLogProgress`.
    public func logEpisode(
        show: Show,
        rewatchId: String,
        season: Int,
        episode: Int,
        note: String? = nil,
        userId: String
    ) async throws -> LogResult {
        struct Position: Decodable { let season: Int; let episode: Int }
        let existing: [Position] = try await client.from("progress_logs")
            .select("season, episode")
            .eq("rewatch_id", value: rewatchId)
            .execute()
            .value
        let existingKeys = Set(existing.map { "\($0.season)x\($0.episode)" })
        let now = Date()

        var rows = ProgressLogic.backfillEntries(
            targetSeason: season,
            targetEpisode: episode,
            episodesPerSeason: show.episodesPerSeason,
            existing: existingKeys,
            rewatchId: rewatchId,
            userId: userId,
            now: now
        )
        if !existingKeys.contains("\(season)x\(episode)") {
            rows.append(NewProgressLog(rewatchId: rewatchId, userId: userId, season: season, episode: episode, loggedAt: now, note: note))
        }

        var insertedIds: [String] = []
        if !rows.isEmpty {
            struct IdRow: Decodable { let id: String }
            let inserted: [IdRow] = try await client.from("progress_logs")
                .insert(rows, returning: .representation)
                .select("id")
                .execute()
                .value
            insertedIds = inserted.map(\.id)
        }

        if ProgressLogic.isSeriesComplete(season: season, episode: episode, totalSeasons: show.totalSeasons,
                                          episodesPerSeason: show.episodesPerSeason) {
            try await completeRewatch(id: rewatchId)
            try await createRewatch(showId: show.id, userId: userId)
            return LogResult(completedSeries: true, insertedIds: insertedIds)
        }
        return LogResult(completedSeries: false, insertedIds: insertedIds)
    }

    public func deleteLogs(ids: [String]) async throws {
        guard !ids.isEmpty else { return }
        try await client.from("progress_logs").delete(returning: .minimal).in("id", values: ids).execute()
    }

    /// Clears every log in an in-progress rewatch (undoing an accidental
    /// restart) while keeping the rewatch row and completed history.
    public func resetRewatch(id: String) async throws {
        try await client.from("progress_logs").delete(returning: .minimal).eq("rewatch_id", value: id).execute()
    }

    // MARK: - Rewatches

    @discardableResult
    public func createRewatch(showId: String, userId: String) async throws -> Rewatch {
        struct NewRewatch: Encodable {
            let show_id: String
            let user_id: String
            let status: RewatchStatus
        }
        return try await client.from("rewatches")
            .insert(NewRewatch(show_id: showId, user_id: userId, status: .inProgress), returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    public func completeRewatch(id: String, completedAt: Date = Date()) async throws {
        struct Completion: Encodable {
            let completed_at: Date
            let status: RewatchStatus
        }
        try await client.from("rewatches")
            .update(Completion(completed_at: completedAt, status: .completed), returning: .minimal)
            .eq("id", value: id)
            .execute()
    }

    /// Marks a rewatch finished with the user's dates/note/service and starts
    /// a new in-progress rewatch. Mirrors `useMarkSeriesFinished`.
    public func markFinished(
        rewatch: Rewatch,
        startedAt: Date?,
        completedAt: Date,
        note: String?,
        service: String?,
        userId: String
    ) async throws {
        var update = ProgressLogic.completionUpdates(
            completedAt: completedAt,
            currentStartedAt: rewatch.startedAt,
            startedAt: startedAt,
            note: note
        )
        update.service = service
        try await client.from("rewatches").update(update, returning: .minimal).eq("id", value: rewatch.id).execute()
        try await createRewatch(showId: rewatch.showId, userId: userId)
    }

    public func updateService(rewatchId: String, service: String?) async throws {
        struct ServiceUpdate: Encodable {
            let service: String?
            func encode(to encoder: Encoder) throws {
                enum Keys: String, CodingKey { case service }
                var c = encoder.container(keyedBy: Keys.self)
                try c.encode(service, forKey: .service)
            }
        }
        try await client.from("rewatches").update(ServiceUpdate(service: service), returning: .minimal)
            .eq("id", value: rewatchId).execute()
    }

    // MARK: - Preferences

    public func fetchPreferences(userId: String) async throws -> Preferences? {
        struct Row: Decodable { let preferences: Preferences }
        let rows: [Row] = try await client.from("user_preferences")
            .select("preferences")
            .eq("user_id", value: userId)
            .limit(1)
            .execute()
            .value
        return rows.first?.preferences
    }

    public func savePreferences(_ preferences: Preferences, userId: String) async throws {
        struct Row: Encodable {
            let user_id: String
            let preferences: Preferences
            let updated_at: Date
        }
        try await client.from("user_preferences")
            .upsert(Row(user_id: userId, preferences: preferences, updated_at: Date()), returning: .minimal)
            .execute()
    }
}
