import CouchModeData
import SwiftUI

/// Switches between launch, signed-out, and signed-in states.
struct RootView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        ZStack {
            switch auth.phase {
            case .loading:
                ProgressView()
                    .controlSize(.large)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .signedOut:
                LoginView()
                    .transition(.opacity)
            case let .signedIn(user):
                SignedInView(user: user)
                    .id(user.id) // fresh stores per account
                    .transition(.opacity)
            }
        }
        .animation(.default, value: auth.phase)
        .toastOverlay()
    }
}

/// Owns the per-user stores for the signed-in session.
private struct SignedInView: View {
    let user: AppUser
    @Environment(AppServices.self) private var services
    @State private var library: LibraryStore? = nil
    @State private var preferences: PreferencesStore? = nil

    var body: some View {
        Group {
            if let library, let preferences {
                MainTabView()
                    .environment(library)
                    .environment(preferences)
            } else {
                ProgressView()
            }
        }
        .task {
            let repository = services.backend.library
            let library = LibraryStore(repository: repository, userId: user.id)
            let preferences = PreferencesStore(repository: repository, userId: user.id)
            self.library = library
            self.preferences = preferences
            async let load: Void = library.load()
            async let sync: Void = preferences.sync()
            _ = await (load, sync)
        }
    }
}
