import CouchModeData
import Observation
import SwiftUI

/// App-wide dependencies, injected into the environment at launch.
@MainActor
@Observable
final class AppServices {
    let backend: Backend
    let auth: AuthStore
    let toasts = ToastCenter()

    init(backend: Backend) {
        self.backend = backend
        auth = AuthStore(backend: backend)
    }

    var tmdb: TMDBService { backend.tmdb }
}

enum AppTheme: String, CaseIterable, Identifiable {
    case system, light, dark

    static let storageKey = "couchmode-theme"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .system: "System"
        case .light: "Light"
        case .dark: "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}
