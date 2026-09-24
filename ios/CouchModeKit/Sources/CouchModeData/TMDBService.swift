import CouchModeCore
import Foundation
import Supabase

/// Calls the `tmdb-search` and `suggest-shows` edge functions, which proxy
/// TMDB and Claude with server-side keys. The Supabase client attaches the
/// user's JWT automatically.
public actor TMDBService {
    private let client: SupabaseClient
    private var seasonCache: [String: TMDBSeasonDetails] = [:]
    private var seasonTasks: [String: Task<TMDBSeasonDetails, Error>] = [:]
    private var detailsCache: [Int: (details: TMDBShowDetails, fetchedAt: Date)] = [:]

    public init(client: SupabaseClient) {
        self.client = client
    }

    private func get<T: Decodable>(_ function: String, _ query: [URLQueryItem]) async throws -> T {
        try await client.functions.invoke(function, options: FunctionInvokeOptions(method: .get, query: query))
    }

    public func search(_ query: String) async throws -> [TMDBSearchResult] {
        let response: TMDBSearchResponse = try await get("tmdb-search", [URLQueryItem(name: "query", value: query)])
        return response.results ?? []
    }

    /// Show details, cached for a few minutes so navigating back and forth is instant.
    public func details(tmdbId: Int, maxAge: TimeInterval = 300) async throws -> TMDBShowDetails {
        if let cached = detailsCache[tmdbId], Date().timeIntervalSince(cached.fetchedAt) < maxAge {
            return cached.details
        }
        let details: TMDBShowDetails = try await get("tmdb-search", [URLQueryItem(name: "tmdb_id", value: String(tmdbId))])
        detailsCache[tmdbId] = (details, Date())
        return details
    }

    /// Episode list for a season. Cached for the life of the app and
    /// de-duplicated so many rows asking for the same season share one request.
    public func season(tmdbId: String, season: Int) async throws -> TMDBSeasonDetails {
        let key = "\(tmdbId)/\(season)"
        if let cached = seasonCache[key] { return cached }
        if let pending = seasonTasks[key] { return try await pending.value }

        let task = Task<TMDBSeasonDetails, Error> {
            try await self.get("tmdb-search", [
                URLQueryItem(name: "tmdb_id", value: tmdbId),
                URLQueryItem(name: "season", value: String(season)),
            ])
        }
        seasonTasks[key] = task
        defer { seasonTasks[key] = nil }
        let details = try await task.value
        seasonCache[key] = details
        return details
    }

    public func watchProviders(tmdbId: Int) async throws -> [WatchProvider] {
        let response: TMDBWatchProvidersResponse = try await get("tmdb-search", [
            URLQueryItem(name: "tmdb_id", value: String(tmdbId)),
            URLQueryItem(name: "providers", value: "1"),
        ])
        return response.usFlatrate
    }

    public func suggestions(for showTitles: [String]) async throws -> [AISuggestion] {
        struct Body: Encodable { let shows: [String] }
        let response: AISuggestionsResponse = try await client.functions.invoke(
            "suggest-shows",
            options: FunctionInvokeOptions(body: Body(shows: Array(showTitles.prefix(30))))
        )
        return response.suggestions ?? []
    }
}
