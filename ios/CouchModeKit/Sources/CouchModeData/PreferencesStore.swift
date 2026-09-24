import CouchModeCore
import Foundation
import Observation

/// Per-user app options. Like the web app's PreferencesContext it's a hybrid
/// store: a local cache (UserDefaults) for instant first paint, plus a
/// write-through to the `user_preferences` row so choices follow the user
/// across devices — including between the web app and iOS.
@MainActor
@Observable
public final class PreferencesStore {
    public static let cacheKey = "couchmode-preferences"

    public private(set) var preferences: Preferences

    @ObservationIgnored private let repository: LibraryRepository
    @ObservationIgnored private let userId: String
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private var edited = false

    public init(repository: LibraryRepository, userId: String, defaults: UserDefaults = .standard) {
        self.repository = repository
        self.userId = userId
        self.defaults = defaults
        preferences = Self.readCache(defaults)
    }

    /// Pulls the server copy; seeds it from the local cache if there isn't one.
    public func sync() async {
        do {
            if let remote = try await repository.fetchPreferences(userId: userId) {
                writeCache(remote)
                if !edited { preferences = remote }
            } else {
                try await repository.savePreferences(preferences, userId: userId)
            }
        } catch {
            // Best-effort: the cached copy still applies and we'll retry next launch.
        }
    }

    public func update(_ change: (inout Preferences) -> Void) {
        edited = true
        change(&preferences)
        writeCache(preferences)
        let snapshot = preferences
        Task { try? await repository.savePreferences(snapshot, userId: userId) }
    }

    private static func readCache(_ defaults: UserDefaults) -> Preferences {
        guard let data = defaults.data(forKey: cacheKey),
              let prefs = try? JSONDecoder().decode(Preferences.self, from: data) else { return .default }
        return prefs
    }

    private func writeCache(_ prefs: Preferences) {
        if let data = try? JSONEncoder().encode(prefs) { defaults.set(data, forKey: Self.cacheKey) }
    }
}
