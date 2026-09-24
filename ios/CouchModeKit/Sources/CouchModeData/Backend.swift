import CouchModeCore
import Foundation
import Supabase

/// Connection settings, read from the app's Info.plist (populated from
/// `Config.xcconfig`; see ios/README.md).
public struct BackendConfig: Sendable {
    public var supabaseURL: URL
    public var supabaseAnonKey: String
    /// Where OAuth providers send the user back to. Must be listed under
    /// Supabase → Authentication → URL Configuration → Redirect URLs.
    public var authRedirectURL: URL

    public init(supabaseURL: URL, supabaseAnonKey: String, authRedirectURL: URL) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
        self.authRedirectURL = authRedirectURL
    }

    public enum ConfigError: LocalizedError {
        case missing(String)

        public var errorDescription: String? {
            switch self {
            case let .missing(key):
                return "\(key) is not set. Copy ios/Config/Config.example.xcconfig to Config.xcconfig and fill it in."
            }
        }
    }

    /// Reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `AUTH_REDIRECT_URL` from a bundle's Info.plist.
    public static func fromBundle(_ bundle: Bundle = .main) throws -> BackendConfig {
        func value(_ key: String) throws -> String {
            guard let raw = bundle.object(forInfoDictionaryKey: key) as? String,
                  !raw.trimmingCharacters(in: .whitespaces).isEmpty, !raw.hasPrefix("$(") else {
                throw ConfigError.missing(key)
            }
            return raw
        }
        guard let url = URL(string: try value("SUPABASE_URL")) else { throw ConfigError.missing("SUPABASE_URL") }
        guard let redirect = URL(string: try value("AUTH_REDIRECT_URL")) else { throw ConfigError.missing("AUTH_REDIRECT_URL") }
        return BackendConfig(supabaseURL: url, supabaseAnonKey: try value("SUPABASE_ANON_KEY"), authRedirectURL: redirect)
    }
}

/// The app's single Supabase client plus the services built on it.
public final class Backend: Sendable {
    public let config: BackendConfig
    public let client: SupabaseClient
    public let tmdb: TMDBService
    public let library: LibraryRepository

    public init(config: BackendConfig, authStorage: (any AuthLocalStorage)? = nil) {
        self.config = config
        let db = SupabaseClientOptions.DatabaseOptions(encoder: CouchModeJSON.encoder, decoder: CouchModeJSON.decoder)
        let auth: SupabaseClientOptions.AuthOptions
        #if os(Linux) || os(Android)
        auth = .init(
            storage: authStorage ?? InMemoryAuthStorage(),
            redirectToURL: config.authRedirectURL,
            flowType: .pkce,
            emitLocalSessionAsInitialSession: true
        )
        #else
        if let authStorage {
            auth = .init(storage: authStorage, redirectToURL: config.authRedirectURL, flowType: .pkce,
                         emitLocalSessionAsInitialSession: true)
        } else {
            // Default storage is the Keychain.
            auth = .init(redirectToURL: config.authRedirectURL, flowType: .pkce, emitLocalSessionAsInitialSession: true)
        }
        #endif
        client = SupabaseClient(
            supabaseURL: config.supabaseURL,
            supabaseKey: config.supabaseAnonKey,
            options: SupabaseClientOptions(db: db, auth: auth)
        )
        tmdb = TMDBService(client: client)
        library = LibraryRepository(client: client, tmdb: tmdb)
    }
}

/// Session storage for platforms without a Keychain (Linux builds/tests).
public final class InMemoryAuthStorage: AuthLocalStorage, @unchecked Sendable {
    private var values: [String: Data] = [:]
    private let lock = NSLock()

    public init() {}

    public func store(key: String, value: Data) throws {
        lock.lock(); defer { lock.unlock() }
        values[key] = value
    }

    public func retrieve(key: String) throws -> Data? {
        lock.lock(); defer { lock.unlock() }
        return values[key]
    }

    public func remove(key: String) throws {
        lock.lock(); defer { lock.unlock() }
        values[key] = nil
    }
}

extension User {
    /// The id as stored in `user_id` columns.
    public var rowId: String { id.uuidString.lowercased() }

    public var displayName: String {
        if case let .string(name)? = userMetadata["full_name"], !name.isEmpty { return name }
        return email ?? "User"
    }

    public var avatarURL: URL? {
        if case let .string(url)? = userMetadata["avatar_url"] { return URL(string: url) }
        return nil
    }
}
