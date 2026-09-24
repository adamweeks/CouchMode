import CouchModeCore
import Foundation
import Observation
import Supabase

/// Tracks the signed-in user and wraps Supabase Auth. Port of the web app's
/// src/contexts/AuthContext.tsx, plus native Sign in with Apple.
@MainActor
@Observable
public final class AuthStore {
    public enum Phase: Equatable {
        case loading
        case signedOut
        case signedIn(AppUser)
    }

    public private(set) var phase: Phase = .loading
    @ObservationIgnored private let backend: Backend
    @ObservationIgnored private var listener: Task<Void, Never>?

    public init(backend: Backend) {
        self.backend = backend
        listener = Task { [weak self] in
            for await (_, session) in backend.client.auth.authStateChanges {
                guard let self else { return }
                if let session {
                    let user = AppUser(session.user)
                    // Token refreshes re-emit the same user; don't churn the UI.
                    if self.phase != .signedIn(user) { self.phase = .signedIn(user) }
                } else {
                    self.phase = .signedOut
                }
            }
        }
    }

    public var user: AppUser? {
        if case let .signedIn(user) = phase { return user }
        return nil
    }

    public func signIn(email: String, password: String) async throws {
        try await backend.client.auth.signIn(email: email, password: password)
    }

    /// Returns true when the project requires email confirmation before the
    /// first sign-in (no session is issued yet).
    @discardableResult
    public func signUp(email: String, password: String) async throws -> Bool {
        let response = try await backend.client.auth.signUp(email: email, password: password)
        return response.session == nil
    }

    /// Exchanges a Sign in with Apple identity token for a Supabase session.
    /// `nonce` is the raw (un-hashed) nonce whose SHA-256 was sent to Apple.
    public func signInWithApple(idToken: String, nonce: String) async throws {
        try await backend.client.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(provider: .apple, idToken: idToken, nonce: nonce)
        )
    }

    #if canImport(AuthenticationServices) && !os(Linux)
    /// Google via Supabase OAuth in an ASWebAuthenticationSession, returning
    /// to `authRedirectURL`.
    public func signInWithGoogle() async throws {
        try await backend.client.auth.signInWithOAuth(provider: .google, redirectTo: backend.config.authRedirectURL)
    }
    #endif

    public func signOut() async throws {
        try await backend.client.auth.signOut()
    }

    /// Completes auth flows that arrive as deep links (e.g. email confirmation).
    public func handle(_ url: URL) {
        backend.client.auth.handle(url)
    }
}

/// The signed-in user, reduced to what the UI needs (keeps the Supabase SDK
/// types out of the view layer).
public struct AppUser: Hashable, Sendable {
    /// The id as stored in `user_id` columns.
    public var id: String
    public var email: String?
    public var displayName: String
    public var avatarURL: URL?

    public init(id: String, email: String?, displayName: String, avatarURL: URL?) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.avatarURL = avatarURL
    }

    init(_ user: User) {
        self.init(id: user.rowId, email: user.email, displayName: user.displayName, avatarURL: user.avatarURL)
    }
}
